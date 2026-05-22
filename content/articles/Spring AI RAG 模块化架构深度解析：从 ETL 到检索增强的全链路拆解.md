---
title: Spring AI RAG 模块化架构深度解析：从 ETL 到检索增强的全链路拆解
date: 2026-05-22T23:30:00.000Z
category: AI 应用开发
tags:
  - RAG
  - AI 大模型基础
  - Spring AI
  - AI 编排框架
summary: 深度解析 Spring AI RAG 全链路模块化架构，拆解 ETL Pipeline（DocumentReader/Transformer/Writer）、向量存储与检索增强各层设计思路与内置组件，助你打通生产级 RAG 应用落地的关键环节。
featured: true
status: published
slug: '333333172966977536'
---


上一篇文章中我们用 `QuestionAnswerAdvisor` 快速跑通了第一个 RAG 应用，但生产场景的需求远不止“从向量库里随便搜几个文档然后扔给 AI”。

用户问题可能表述模糊、文档粒度可能太粗、检索结果可能有噪声、模型回答可能还是不够精准——这些都是需要逐层优化的现实问题。

这篇文章依然会沿着 RAG 的四个核心环节，把 Spring AI 在这些环节上的设计思路、内置组件和组合方式讲清楚。手头在搞 RAG 落地的朋友，应该能找到一些可以直接拿来用的东西。

## 一、ETL Pipeline
在 RAG 应用里，“数据怎么进去”是第一步，也是最容易出问题的一步。文档切得太碎，检索时上下文丢失；切得太大，模型上下文窗口又装不下。Spring AI 把这一整套流程抽象成了 ETL 管道，三个核心接口各有分工。

+ **DocumentReader**：负责从各种数据源读取原始文档。
+ **DocumentTransformer**：负责对文档进行转换、切分和元数据增强。
+ **DocumentWriter**：负责将处理后的文档写入存储（通常是向量数据库）。

三者通过函数式接口串联，一个典型的写法是这样：

```java
vectorStore.write(tokenTextSplitter.split(pdfReader.read()));
```

### DocumentReader
**DocumentReader** 这块，Spring AI 的覆盖面挺全。除了上节用过的 `MarkdownDocumentReader`，还有一些值得关注的实现：

+ `PagePdfDocumentReader` / `ParagraphPdfDocumentReader`：前者按 PDF 页面切分，后者利用 PDF 的目录信息按段落切分，适合技术手册类文档。
+ `JsonReader`：支持使用 JSON Pointer 语法提取嵌套结构中的指定字段作为 Document 内容。
+ `TikaDocumentReader`：基于 Apache Tika，一张大牌——能覆盖 PDF、Word、PPT、Excel、HTML 等你能想到的大部分文档格式。
+ `TextReader` 和 `MarkdownDocumentReader`：纯文本和 Markdown，就不多说了。

这些 Reader 的抽象很彻底，不管文档原来是什么格式，**最终出来的都是 **`**List<Document>**`。上层逻辑完全不需要感知来源差异。



### DocumentTransformer
**DocumentTransformer** 是整个 ETL 里最有技术含量的一环，其中最重要的是 `TokenTextSplitter`。

文档切分这事，不能简单按字符数硬切，否则把一句话从中间切断，向量化之后的语义就全歪了。`TokenTextSplitter` 的切分逻辑基于 OpenAI 的 CL100K_BASE 编码方案（大约 0.75 个英文单词/token），并且实现了标点感知的切分策略，尽量在句号、问号等自然边界处切分。

主要的可调参数如下：

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `defaultChunkSize` | 800 | 每块的目标 token 数，切分时会尽量按句号、问号等自然边界切分，而非死板地数到 800 就下刀 |
| `minChunkSizeChars` | 350 | 每块最少字符数，防止切出太短的碎片 |
| `minChunkLengthToEmbed` | 5 | 小于该长度的块直接丢弃，避免空内容污染向量库 |
| `maxNumChunks` | 10000 | 单文档最多切多少块，防止内存爆炸 |
| `keepSeparator` | true | 是否保留分隔符（如换行符），通常建议保留，有助于保持语义边界 |


对于技术文档来说，默认的 800 token 通常偏大（一个包含 20-30 行代码的代码块大概就这个量级，但普通段落会显得太长）。我个人在实际项目中会把 `defaultChunkSize` 调到 400-512 这个区间，实测检索准确率更高。具体的切分策略对比，可以看之前那篇文档切分的文章。

除了切分，`DocumentTransformer` 还有一些锦上添花的能力：

+ `KeywordMetadataEnricher`：调用 AI 模型自动提取文档的关键词，作为元数据存入，后续检索时可以按关键词过滤。
+ `SummaryMetadataEnricher`：生成每个文档片段的摘要，这个摘要本身也可以向量化，提升检索语义匹配度（不过这个比较耗 token，按需使用）。

## 二、模块化的 RAG 架构
`QuestionAnswerAdvisor` 确实够简单，一行代码就能让 ChatClient 拥有 RAG 能力。但当文档量大、用户问题复杂时，它的局限性就出来了：

+ 查询就是原封不动的用户问题，万一用户表述模糊，检索出来的文档质量就堪忧。
+ 只支持单一向量源，无法同时检索多个数据源（比如既有内部文档又有外部网页）。
+ 检索到的文档直接拼到 Prompt 里，没有重排序、去重、压缩这些后处理步骤。

Spring AI 从 1.0 版本开始引入了一个更强大的组件——`RetrievalAugmentationAdvisor`。它的设计灵感来自论文[《Modular RAG: Transforming RAG Systems into LEGO-like Reconfigurable Frameworks》](https://arxiv.org/abs/2407.21059)，核心思想是**将检索增强过程拆分为三个可插拔的阶段**，开发者可以像搭乐高一样按需组合。

### 2.1 预检索—把用户问题打磨得更好
检索效果好不好，用户问题本身是一个绕不开的课题。

#### QueryTransformer
`QueryTransformer` 负责对原始查询进行改写、翻译或压缩，Spring AI 提供了三个内置实现。

+ `**RewriteQueryTransformer**`：用 LLM 重写用户查询，去除无关信息，使查询更清晰、更有针对性。比如“我想知道怎么搞一个 Spring Boot 项目”，可能被重写为“Spring Boot 项目创建步骤”。
+ `**TranslationQueryTransformer**`：将查询翻译成 Embedding 模型所支持的语言。如果知识库是中文的，但用户偶尔用英文提问，这个 Transformer 可以自动做翻译，这个不常用，做个了解。
+ `**CompressionQueryTransformer**`：结合对话历史，把“那它的配置参数是什么”这种依赖上下文的模糊指代，转化成完整的独立查询。没有这个转换，后面的向量检索根本不知道“它”指的是谁。



#### QueryExpander
`QueryExpander` 走的是另一条路——不是改查询，而是把一条查询扩展成多条语义相似但不完全相同的变体。`MultiQueryExpander` 是内置实现，调用 LLM 把用户问题从多个角度改写，然后多条查询同时去检索，结果合并。

这个策略的代码示例：

```java
MultiQueryExpander queryExpander = MultiQueryExpander.builder()
.chatClientBuilder(chatClientBuilder)
.numberOfQueries(3)
.build();
List<Query> queries = queryExpander.expand(new Query("你们的退货政策是什么？"));
```

分别输出“退货流程”、“退款条件”、“如何申请售后”等多条相关查询，大幅提升召回面。缺点是会多花几倍的 token，自己掂量着用。

### 2.2 检索中—多源查找与智能合并
#### DocummentRetriever
`DocumentRetriever` 是检索阶段的核心组件。`VectorStoreDocumentRetriever` 封装了向量检索的完整逻辑，支持三个维度的精细控制：

+ `topK`：返回多少个最相似的文档片段（默认 4）。
+ `similarityThreshold`：相似度阈值（默认 0.0），低于该值的文档会被过滤掉。
+ `filterExpression`：基于元数据的过滤表达式。

```java
DocumentRetriever retriever = VectorStoreDocumentRetriever.builder()
.vectorStore(vectorStore)
.similarityThreshold(0.70)
.topK(5)
.filterExpression(new FilterExpressionBuilder()
                  .eq("department", "customer_service")
                  .build())
.build();
```

这个能力在处理多部门、多业务线的知识库时很实用——一个公司内部的知识库，客服部门只应该看到 FAQ，研发部门才能看到技术文档。通过 metadata 过滤可以实现这种权限隔离。

#### DocumentJoiner
检索到的文档通常来自多个数据源（或多个查询变体），`DocumentJoiner` 可以负责把它们合并成一个统一的列表。`ConcatenationDocumentJoiner` 是最简单的实现，**直接把结果连接在一起**。如果要做去重、按相关性排序等更复杂的合并逻辑，可以自己实现 `DocumentJoiner` 接口。

### 2.3 检索后—精排、去重与压缩
向量检索追求速度，通常用近似最近邻算法（ANN）快速捞回一批候选文档，但精确度有限。`DocumentRanker`、`DocumentSelector` 和 `DocumentCompressor` 在检索后阶段各司其职：

| 组件 | 核心操作 | 解决什么问题 | 三者区分 |
| --- | --- | --- | --- |
| `DocumentRanker` | 重新排序 | “中间丢失”现象——排在中间的文档可能被忽略 | **只改变顺序/打分，不删文档不改内容** |
| `DocumentSelector` | 删除/保留 | 结果集里有大量噪音，污染上下文 | **删除整篇文档，不改内容** |
| `DocumentCompressor` | 压缩内容 | 文档太长撑爆上下文窗口，且大量冗余信息浪费 token | **逐篇压缩内容，不删文档不改顺序** |


`**DocumentRanker**`**——重新打乱顺序，把最有价值的文档往前排**

> ⚠️ **版本提示**：Spring AI 1.0.0-M8 中，`DocumentRanker`、`DocumentSelector`、`DocumentCompressor` 三个接口均已被标记为 `@Deprecated`。在 `RetrievalAugmentationAdvisor` 的新模块化架构下，**官方不再推荐在外部手动编排这三个组件，而是将它们作为 **`**RetrievalAugmentationAdvisor.Builder**`** 的可选构建参数直接传入**，由框架内部统一编排。
>

从定位上看，`DocumentRanker` 的核心职责是 **重新排序，而不是删除或修改文档**。单纯用相似度分数排序很容易把真正相关但分数低的文档埋在后面，而 Cross-Encoder 这类重排序模型把 Query 和 Document 一同输入，能让 Attention 机制充分交互，打分更精准。



实战中有两种主流的重排序方案：

#### 方案一：API 调用式重排序（以 Spring AI Alibaba DashScope 为例）
如果你的项目用了阿里云百炼平台，Spring AI Alibaba 的 `RetrievalRerankAdvisor` 直接封装了 DashScope 的重排序 API，把重排序逻辑内嵌进 `ChatClient` 调用链中：

```java
@Configuration
public class RerankConfig {
    @Bean
    public RerankModel dashScopeRerankModel(DashScopeApi dashScopeApi) {
        return new DashScopeRerankModel(dashScopeApi);
    }
}

@RestController
public class RerankController {
    private final ChatClient chatClient;

    public RerankController(ChatClient.Builder builder, 
                            VectorStore vectorStore, 
                            RerankModel rerankModel) {
        this.chatClient = builder
        .defaultAdvisors(new RetrievalRerankAdvisor(vectorStore, rerankModel))
        .build();
    }

    @GetMapping("/rerank")
    public String query(@RequestParam String input) {
        return chatClient.prompt().user(input).call().content();
    }
}
```

****

#### 方案二：本地部署 Cross-Encoder 模型（零外部调用）
如果不想依赖外部 API 做重排序，可以在本地通过 DJL（Deep Java Library）或 ONNX Runtime 部署量化后的 BGE-Reranker-v2-m3 这类模型。核心思路是先捞回 TopK 候选文档，再用本地 Cross-Encoder 对 Query 和每个 Document 配对做精排，选出最有价值的 TopN 传给 LLM。

`**DocumentSelector**`**——批量删除文档，从结果集中移除整篇文档**

官方文档对 `DocumentSelector` 的定位是 **在不对文档内容做任何改动的前提下，从列表中删除整篇文档**。典型用途包括：

+ **去重**：检索结果中可能有多篇内容高度重复的文档，保留一个就够了；
+ **过期数据剔除**：根据元数据中的 `last_modified` 字段，过滤掉超过某个时间阈值的文档；
+ **权限安全**：根据文档的访问级别元数据，剔除当前用户无权查看的文档。

实现 `DocumentSelector` 只需要实现 `select` 方法，遍历文档列表，按规则筛选出符合保留条件的子集：

```java
public class TimeBasedSelector implements DocumentSelector {
    private final Instant cutoffTime;

    @Override
    public List<Document> select(List<Document> documents) {
        return documents.stream()
        .filter(doc -> {
            Instant lastModified = doc.getMetadata().getOrDefault("last_modified", Instant.MIN);
            return lastModified.isAfter(cutoffTime);
        })
        .collect(Collectors.toList());
    }
}
```

****

`**DocumentCompressor**`**——逐篇压缩文档内容，精简上下文**

`DocumentCompressor` 与 `DocumentSelector` 完全不同。`DocumentSelector` 是从列表中 **删除整篇文档**，而 `DocumentCompressor` 是对 **每篇文档的内容进行压缩**，不删文档也不改顺序。

**为什么需要压缩？** 检索回来的文档片段经常包含大量冗余信息——页眉页脚、导航菜单、免责声明等。直接把几 KB 的噪音喂给 LLM，既浪费 token 也容易干扰回答质量。

`DocumentCompressor` 的核心方法接收 `List<Document>`，经过压缩算法处理后输出一个新的 `List<Document>`（数量不变，但每个 Document 的 `getContent()` 被大幅精简）。简化版示例：

```java
public class SummaryCompressor implements DocumentCompressor {
    private final ChatModel chatModel;

    @Override
    public List<Document> compress(Query query, List<Document> documents) {
        return documents.stream().map(doc -> {
            String summary = chatModel.call(
                "请用一句话总结以下内容：" + doc.getContent()
            );
            Document compressed = new Document(summary);
            compressed.getMetadata().putAll(doc.getMetadata());
            return compressed;
        }).collect(Collectors.toList());
    }
}
```

****

**附：新架构下的集成方式**

在 `RetrievalAugmentationAdvisor.Builder` 下，文档后处理逻辑通过以下方法链式组装：

```java
RetrievalAugmentationAdvisor.builder()
.documentRetriever(retriever)
.documentRanker(myRanker)        // 如果有重排序逻辑
.documentSelector(mySelector)    // 如果有筛选逻辑
.documentCompressor(myCompressor)// 如果有压缩逻辑
.build();
```



## 三、查询增强和关联
聊完检索环节，再来看看怎么把这些能力无缝注入到 AI 对话流程里。Spring AI 的 Advisors API 本质上就是一套 AOP 风格的拦截器——在用户请求发送给大模型之前和之后，执行一系列增强逻辑。

它的执行顺序是栈式的：顺序值越小的 Advisor 越先处理请求、越后处理响应，整个链条最后一个 Advisor 才是实际调用 ChatModel 的那个。

```java
var chatClient = ChatClient.builder(chatModel)
.defaultAdvisors(
    MessageChatMemoryAdvisor.builder(chatMemory).build(),
    QuestionAnswerAdvisor.builder(vectorStore).build()
)
.build();
```

### 3.1 QuestionAnswerAdvisor
这应该是最常用的 RAG Advisor。它的工作原理很直接：`从用户消息里提取问题 → 去向量库检索相关文档 → 把文档内容拼接到用户消息前面 → 再送给大模型`。

默认的 Prompt 模板是：

```plain
{query}
Context information is below.
{question_answer_context}
Given the context information and no prior knowledge, answer the query.
```

其中的 `{query}` 会被替换成用户原问题，`{question_answer_context}` 替换成检索到的文档拼起来的字符串。这个设计的意图是让模型优先基于检索到的上下文回答问题，而不是依赖训练时的先验知识去“凭感觉答”——这是减少幻觉的关键设计。

`SearchRequest` 提供了检索控制：

```java
SearchRequest.builder()
.query("用户的问题")
.similarityThreshold(0.5)   // 相似度阈值
.topK(5)                    // 检索数量
.filterExpression("source == 'faq.md'")  // 元数据过滤
.build();
```

### 3.2 RetrievalAugmentationAdvisor
对于需要更精细控制的场景（比如多查询扩展、多数据源检索、文档重排序），`RetrievalAugmentationAdvisor` 把前面讲的三阶段组件全部集成进来，提供了一个统一的装配入口。

```java
Advisor advisor = RetrievalAugmentationAdvisor.builder()
.queryTransformers(queryTransformer)      // 可选：改写查询
.queryExpander(queryExpander)            // 可选：扩展查询
.documentRetriever(retriever)            // 必填：检索器
.documentJoiner(documentJoiner)          // 可选：合并多源结果
.queryAugmenter(queryAugmenter)          // 可选：增强查询
.build();
```

对比一下两个 Advisor 的定位：`QuestionAnswerAdvisor` 适合快速验证、简单场景，代码量少，认知负担低。`RetrievalAugmentationAdvisor` 专门为生产级 RAG 设计，每个环节都可插拔，可以按需组合成多查询扩展、HyDE、RAG-Fusion 等复杂策略。

### 3.3 ContextualQueryAugmenter
`ContextualQueryAugmenter` 是 `QueryAugmenter` 接口的内置实现，专门负责把检索到的文档以合适的格式增强到用户查询中。与 `QuestionAnswerAdvisor` 的简单拼接不同，它提供了更灵活的配置，比如可以控制文档的插入位置（查询前/查询后）、自定义拼接模板等，适合需要定制 Prompt 结构的场景。



## 总结
Spring AI 的 RAG 模块从数据摄取（ETL）、向量化存储（VectorStore）、检索增强（模块化三阶段）到查询增强（Advisors），已经形成了一个覆盖全链路的完整生态。核心设计思路可以概括为三个关键词：

1. **接口统一**：用 `DocumentReader`、`DocumentTransformer`、`DocumentWriter` 把不同来源、不同格式的数据处理抽象成统一流水线。
2. **环节可拆**：预检索、检索、检索后三个阶段各自独立，开发者可以按需替换或组合。
3. **能力可插**：通过 Advisors API 把 RAG 能力注入到 AI 对话流程中，业务代码只需关心“发起对话”这一个动作。

沿着这条路线，后续几篇会分别深入到这几个方向：

+ **检索精度优化**：如何引入精排模型（重排序）和混合检索策略（向量检索 + BM25 关键词检索）来提高召回质量？
+ **向量数据库选型与调优**：PGVector、Milvus、Elasticsearch 在不同数据量和查询模式下的表现如何？
+ **RAG 评估体系构建**：怎么量化你的 RAG 系统到底好不好用——召回率、精确率、MRR、端到端答案正确性？
+ ......

如果你同样对这些问题感兴趣，欢迎关注我的公众号 **AutowiredAI**，后续文章会第一时间推送。后台回复 **「RAG实战」** 可获取本文的完整代码仓库。



<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/jpeg/28248978/1779124910488-a61fb964-e4d7-436c-93ee-bb9b9a3d608a.jpeg)

