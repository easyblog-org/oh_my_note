---
title: RAG 最佳实践与调优：文档、检索、查询，每一步都有坑
date: 2026-05-23T23:30:00.000Z
category: AI 应用开发
tags:
  - RAG
  - AI 大模型基础
  - Spring AI
  - AI 编排框架
summary: 为什么同样用 RAG，别人的系统精准丝滑，你的却总答非所问？本文从文档处理、向量化、检索、查询四个环节，拆解企业级 RAG 落地的关键优化技巧。
featured: true
status: published
slug: '333333172933423104'
---

上一个 RAG 应用跑通了，系统确实能回答问题了，但接下来你大概率会碰到这些问题：检索出来的文档总是不太对，问“有哪些咖啡”，结果翻出一堆关于咖啡豆产地的介绍；模型明明拿到了正确答案，却偏偏选择“自由发挥”；同样的问题换种问法，AI 就开始犯迷糊。

让 RAG 从“能跑”变成“好用”，优化空间其实很大。下面我们沿着 RAG 的四个核心步骤，把每个环节的关键优化点逐个讲清楚。

## 一、文档收集与切分：知识库质量决定 RAG 的上限
**文档质量决定了 AI 回答能力的上限，其他优化策略只是让 AI 不断接近这个上限。** 所以文档处理是 RAG 系统中最基础也最重要的环节，这一步没做好的话，后面花再多力气都很难补回来。

### 1.1 优化原始文档
**知识完备性是文档质量的首要条件****。** 如果知识库里压根没有相关内容，大模型将无法准确回答对应问题。我们需要通过收集用户反馈或统计知识库检索命中率，不断完善和优化知识库内容。

在知识完整的前提下，我们要注意 3 个方面：

**1️⃣**** 内容结构化**

**好的文档结构应该是清晰的层级关系**。比如法律文书要有“案号”“案情摘要”“判决依据”这些固定字段；技术文档要有规范的章节划分。

**结构化的文档可以更好的帮 AI 理解“这段到底在讲什么”**，每个标题下的内容聚焦单一主题，列表项之间尽量不要再嵌套下级列表。语义结构化切分按文本的天然分隔符拆分，如段落分隔符、章节标题等，能在语义断点处进行拆分，最大程度保留语义完整性。

**2️⃣**** 内容规范化**

+ **语言统一**：文档使用的主要语言应与用户的提示词一致。如果知识库是中文的，但用户偶尔用英文提问，可以借助翻译工具或查询 Transformer 做预处理。
+ **表述统一**：同一概念在全文中应使用统一表述。比如 ML、Machine Learning 应该规范为“机器学习”。这个处理可以用大模型分段扫描帮你完成。
+ **减少噪音**：尽量避免水印、表格嵌套和图片等容易干扰解析的元素。如果图片必须保留，建议将其链接化，确保 AI 回答时能正常展示（通过可公网访问的 URL）。

**3️⃣**** 格式标准化**

**优先使用 Markdown、DOC/DOCX 等文本格式——PDF 解析效果普遍不理想**，因为 PDF 更多是面向打印的格式，文本提取时容易丢失语义结构。如果只有 PDF 可用，可以借助阿里云百炼的 DashScope Parse 等工具将其转为 Markdown，再让大模型帮忙整理格式。

> 💡 小技巧：我们可以在整理知识库文档时将上述规则整理成一个 Prompt 输入给 AI 大模型，让 AI 对文档进行优化。
>



### 1.2 文档切分
文档切分是一个需要反复权衡的过程：**切太短，语义缺失，检索的时候找不到关联；切太长，引入无关信息，检索结果满篇噪音**。

不少开发者初期容易陷入“切得越大越好”的误区，以为大块能保留完整上下文。但主流中文 Embedding 模型（如 bge-small-zh-v1.5）的 token 上限通常在 512 左右，超出部分会被直接截断。而且过大的分块会引入大量无关信息，降低检索相关性。

**实践中需要注意几个权衡点：**

+ **文档类型驱动决策**：专业类文献（学术论文、技术手册）内容密集、逻辑性强，适当增加分块长度有助于保留上下文；社交媒体内容则应该切短，避免不同话题混在一起
+ **提示词复杂度**：用户问题复杂且具体时，可能需要更长的上下文支撑；反之可以直接给出短小精悍的切片

详细的文档切分策略可以阅读我的这一篇文章：[别再乱切文档了：实测5种切分策略在RAG中的效果](http://localhost:80)

### 1.3 元数据标注
单纯的文档切片只负责把内容分成小块。加上元数据标注之后，每个片段会附带来源文件、章节归属、创建时间、文档类型这些结构化信息。检索时可以用这些字段做过滤，结果会更精准。

实践中有两种添加元数据的方式：

+ **手动标注**：单个文档或少量文档可以直接加元数据
+ **批量标注**：利用 `DocumentReader` 在加载时为每篇文章自动添加特定标签

例如，在加载 Markdown 文档时，可以为同一批文档统一打上“部门=研发”“分类=技术规范”等标签。这样后续检索时可以按元数据过滤，提升精准度。

在 Spring AI 中，[ETL Pipeline](https://docs.spring.io/spring-ai/reference/1.0/api/etl-pipeline.html#page-title) 提供了完整的文档处理支持。`DocumentReader` 负责从各类数据源加载文档，`DocumentTransformer` 负责切分和元数据增强，`DocumentWriter` 负责将处理后的文档写入向量存储。三个组件通过函数式接口串联成一个标准化的数据摄入流水线。

比如在加载 Markdown 文档时，可以为同一批文档统一打上`department=研发`、`category=技术规范` 等标签：

```java
MarkdownDocumentReaderConfig config = MarkdownDocumentReaderConfig.builder()
    .withAdditionalMetadata("department", "研发")
    .withAdditionalMetadata("category", "技术规范")
    .build();
MarkdownDocumentReader reader = new MarkdownDocumentReader(resource, config);
List<Document> documents = reader.get();
// 每个doc都会自动带上 department=研发 和 category=技术规范
```

这样后续检索时可以按元数据过滤，提升精准度。



## 二、向量转换与存储
文档处理好之后，要把文本转成计算机能理解的数字，也就是向量。**向量存储的选型和配置，直接影响系统的效率和准确性**。

### 2.1 嵌入模型选型
嵌入模型的任务是把文本转成向量。不同模型产出的向量维度和语义表达能力差别不小。这里梳理几个选型时需要关注的点：

+ **领域匹配。** 这是影响效果的首要因素。通用模型（比如 OpenAI 的 text-embedding-ada-002）在常见话题上表现不错，但一旦涉及垂直领域就出问题。例如，医疗问答系统里，通用模型很难准确理解“心肌梗死”和“冠状动脉粥样硬化”这种专业术语。如果你的知识库是医疗、法律、金融这些专业领域，最好用对应领域预训练的专用模型，比如 BioBERT 处理生物医学文献，LegalBERT 处理法律文书。如果没有现成的领域模型，也可以在自有数据上微调通用模型。
+ **维度与成本。** 维度越高，表达能力越强，能捕获更细的语义差异。但高维度意味着更多的存储空间和更慢的检索速度。比如 1024 维向量和 384 维向量，存储空间差两三倍，检索速度也差不少。如果只是做通用语义检索，384 或 768 维通常够用。
+ **中文场景优先选国产模型。** 有评测数据可以说明这一点。在 5000 篇中文文档、200 个真实查询的测试里，bge-large-zh 平均召回率 81.5%，glm-embedding 83.5%，而 OpenAI 的 text-embedding-3-large 和 Cohere 都没超过 80%。差距主要因为国产模型的训练语料中文占比更高，对中文语义把握更准。

> 💡 注意：选 Embedding 模型时，要确保它的输出维度和向量数据库设置的维度一致。如果两者不匹配，会导致向量无法存入数据库或检索失败。通常情况下，向量库的维度在创建时就已固定，后续无法更改。
>

### 2.2 向量存储的选型
文本经过 Embedding 模型转换成向量后需要存储到介质中以供后续流程查询检索使用，支持存储和检索向量的数据的我们称为**向量数据库**，向量数据库的选型，表面上是选数据库，实际上是在索引算法、运维成本和数据规模之间找平衡点。

不同 Embedding 模型产生的向量维度不一样。维度越高，表达能力越强，能捕获更丰富的语义信息，但也更吃存储和计算。

#### 索引算法的选择：HNSW 与 IVF_FLAT
向量检索的核心是索引。没有索引，每次查询都要把数据库里所有向量算一遍相似度，数据量一大就扛不住。索引的作用就是提前把向量组织好，让查询时只扫描一小部分候选集。

| 索引类型 | 检索方式 | 精确度 | 内存占用 | 构建速度 | 适用场景 |
| --- | --- | --- | --- | --- | --- |
| FLAT | 暴力计算 | 100% | 高 | - | 数据量小、要求精确 |
| IVF_FLAT | 聚类+查询 | 95%-99% | 中等 | 快 | 大规模数据、资源受限 |
| HNSW | 多层图结构 | 98%-99% | 高 | 慢 | 追求速度、内存充足 |


IVF_FLAT 的底层原理是把向量分桶聚类，先定位到相关的桶再计算。使用 IVF_FLAT 时需要先对数据做聚类训练，适合数据相对稳定的场景。**HNSW 不需要训练步骤，可以在空表上直接建索引**，查询性能通常比 IVF_FLAT 更好，但构建时间更长，内存占用也更多。

#### 各场景的选型建议
| 场景 | 推荐方案 | 理由 |
| --- | --- | --- |
| 开发测试、数据量小 | 内存向量库 | 不用配置、速度快、用完就丢 |
| 中小规模生产 | PGVector / Redis Stack | 依赖现有数据库，运维简单 |
| 大规模生产（百万级以上） | Milvus / Elasticsearch | 能分布式扩展，扛高并发 |


+ **开发测试**：内存向量库，零配置速度快，适合小规模验证。
+ **中小规模生产**：PGVector 或 Redis Stack，依托成熟PostgreSQL，运维成本低；数据量超百万或性能要求高时，再考虑专用向量库。
+ **大规模生产**：Milvus或Elasticsearch，专为海量向量设计，支持分布式和高并发；Milvus吞吐量更高，Elasticsearch适合需要全文检索的场景。

## 三、文档过滤与检索
在技术栈已经确定的情况下，**优化文档过滤与检索可以显著提升系统整体效果**。这也是开发者最能发挥创造力的环节。Spring AI 提供了模块化的三阶段检索架构，每一个环节都可以独立配置和优化：

+ **预检索**：优化用户查询，让它更适配检索
+ **检索中**：执行检索、合并多源结果
+ **检索后**：精排、去重、压缩

### 3.1 多查询扩展
在多轮会话或用户输入不够明确时，多查询扩展可以帮我们捞回更多可能相关的文档。这个过程本质上是让大模型把一个问题从不同角度拆解成多个子问题，然后分别检索，最后汇总结果。

**使用时注意三点：**

+ 设置合适的查询数量（建议 3~5 个），太多会影响性能和成本
+ 确保扩展后的查询保留原问题的核心语义
+ 扩展后需要合并多个查询的检索结果，可以用 `DocumentJoiner` 做合并去重

Spring AI 中实现多查询扩展的完整流程如下：

```java
@Component
public class MyMultiQueryExpander {

    @Autowired
    private ChatClient.Builder builder;

    public List<Query> expand(String query) {
        MultiQueryExpander multiQueryExpander = MultiQueryExpander.builder()
        .chatClientBuilder(builder)
        .numberOfQueries(3)
        .build();
        return multiQueryExpander.expand(new Query(query));
    }
}

//测试代码
@SpringBootTest
public class MyMultiQueryExpanderTest {

    @Autowired
    private MyMultiQueryExpander myMultiQueryExpander;

    @Test
    void expand() {
        List<Query> queries = myMultiQueryExpander.expand("你们店里有什么饮品啊啊啊啊？");
        System.out.println(queries);
        Assert.notEmpty(queries,"输入为空");
    }
}
```

在我本地的执行上述代码，查询关键词被扩展为了相关联的3个问题：

<!-- 这是一张图片，ocr 内容为：LAULOWITEQ PRIVATE MYMULTIQUERYEXPANDER MYMULTIQUERYEXPANDER; MYMULTIQUERYEXPANDER: MYMULTIQUER @TEST  VOID EXPAND( 日 LIST<QUERY> Q QUERIES - MYMULTIQUERYEXPANDER.EXPAND(QUERY:"你们店里有什么饮品啊啊啊? SYSTEM.OUT.PRINTLN(QUERIES); "输入为空") SIZE 三 4  ASSERT.NOTEMPTY(QUERIES, QUERIES: MESSAGE: VALUATE EXPRESSION (() ADD A WATCH OR THIS:{MYMULTIQUERYEXPANDERTEST@11295} QUERIES{ARRAYLIST@11296?SIZEA -0三(QUERY@1131E)"QUERY(TEXT-你们店里有什么饮品啊啊?,HISTORY-].CONTEXT-0) 1-(QUERY@11316"QUERYLTEXT-你们店铺提供哪些冷热饮品选择?,HISTORY三[,CONTEXT-0]" "QUERY[TEXT三店内最受欢迎的特色饮品有哪些?,HISTORY-[L,CONTEXT二创" 2 {QUERY@11317 33{QUERY@11318 "QUERY(TEXT三菜单上包含哪些无酒精饮料和健康饮品选项?,HISTORY-D,CONTEXT三0]" -->
![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779469314329-934eb3dd-6a2a-42b9-b7c4-5b9f07138aab.png)

在我们拿到多查询扩展器帮我们扩展后的查询列表后，可以有三种使用方式：

1. **使用扩展后的查询召回文档**：遍历扩展后的查询列表，对每个查询使用 `DocumentRetriever` 来召回相关文档。
2. **整合召回的文档**：将每个查询召回的文档进行整合，形成一个包包含所有相关信息的文档集合。(也可以使用文档合并器去重)
3. **使用召回的文档改写Prompt**：将整合后的文档内容添加到原始Prompt中，为大语言模型提供更丰富的上下文信息。

需要注意，多查询扩展会增加查询次数和计算成本，效果也不易量化评估，所以个人建议慎用这种优化方式。

### 3.2 查询重写
多查询扩展是从不同角度问，查询重写则是把问法本身优化得更清晰。

查询重写主要解决用户提问时常见的三个问题：**语义模糊（用户没明确限定关键维度）**、**术语不匹配（知识库用词与用户用词不一致）**、**上下文缺失（未结合历史对话信息）**。如果经过分析发现是问题质量太差导致

Spring AI 提供了 `RewriteQueryTransformer` 组件，用大模型将原始查询重写成更精炼、更清晰的表达，然后才送去检索。

```java
@Component
public class QueryRewriter {

    private final QueryTransformer queryTransformer;

    public QueryRewriter(ChatModel chatModel) {
        ChatClient.Builder builder = ChatClient.builder(chatModel);

        //创建查询重写器
        this.queryTransformer = RewriteQueryTransformer.builder()
                .chatClientBuilder(builder)
                .build();
    }


    /**
     * 执行查询重写
     *
     * @param prompt 原始提示词
     * @return
     */
    public String doQueryRewriter(String prompt) {
        if (StringUtils.isBlank(prompt)) {
            return prompt;
        }

        Query query = new Query(prompt);
        Query newQuery = queryTransformer.transform(query);
        return newQuery.text();
    }

}


// 测试代码
@Test                                                      
void chatWithRAG() {                                       
    String chatId = UUID.randomUUID().toString();          
    // 第一轮                                                 
    String message = "你们都有哪些品类的饮品？";                       
    String answer = coffeeApp.chatWithRAG(message, chatId);
    Assertions.assertNotNull(answer);                      
}                                                          
```

在我本地执行上面的代码，测试结果显示大模型将提示词进行了更加精炼的优化：<!-- 这是一张图片，ocr 内容为：出租 EVALUATE EXPRESSION OR ADD WATCH(08) THIS{COFFEEAPP@11189] PERA P MESSAGE:"你们都有哪些品类的饮品?" E.S CHATLD-"FFOE2BOE-CFOD-4C42-A98D-68606B0BFA55" REWRITEPROMPT"饮品品类列表" 40 O COFFEEVECTORSTORE 三 {SIMPLEVECTORSTORE@11196] 00 NVO QUERYREWRITER@{QUERYREWRITER@11194} DK. 00 OO CHATCLIENT@DEFAULTCHATCLIENT@11195} TEN ENG TING -->
![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779469652942-30648fa6-0443-44b9-99f9-592d40604c79.png)

### 3.3 检索器参数调优
检索器配置是日常调优中最频繁的操作，主要包括三部分：

+ **相似度阈值**：控制文档被召回的“及格线”。阈值设太低，会捞回一堆无关内容；设太高，又可能漏掉真正相关的信息。相似度阈值的调整建议：

| 现象 | 可能原因 | 调整方向 |
| --- | --- | --- |
| 召回结果不完整，漏掉相关信息 | 阈值太高 | 降低相似度阈值，提高召回片段数 |
| 召回结果包含大量无关内容 | 阈值太低 | 提高相似度阈值，过滤低相关性文档 |


+ **返回文档数量（TopK）**：一般设为 3~5 条。太少可能漏信息，太多会让大模型“信息过载”。
+ **过滤规则**：基于元数据或关键词的预过滤。



Spring AI 的 `VectorStoreDocumentRetriever` 提供了三个维度的检索控制：

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

### 3.4 精排
单纯靠向量检索排序，有时会错过真正相关的文档。更可靠的方案是引入**重排序模型（Re-ranking）**：先召回一个较大的候选集（比如 100 条），再用 **重排序模型** 对每条结果重新打分和排序，选出最相关的 **TopK**。

典型的**混合搜索 + 重排**策略：

1. **召回（Recall）**：用向量检索 + BM25 关键词检索（混合搜索）快速捞回较大候选集
2. **重排（Rerank）**：用 Cross-Encoder 模型（计算量更大但精度更高）对候选集重新打分，选出最终 TopK
3. **生成**：用重排后的文档作为上下文交给大模型生成答案

混合搜索结合了密集检索（语义匹配）和稀疏检索（关键词匹配）的优点，前者擅长理解语义，后者擅长字面匹配。同时使用这两种检索方式并合并结果，可以大大提高召回率和准确率。

精排阶段的独立模型可以跨文档全局打分，弥补向量检索的局限性。在实际工程中，精排对检索质量的提升往往比调整向量库参数更明显。

关于混合检索这是一个比较长篇幅的话题，大家感兴趣的话可以阅读我的另一篇文章：[什么是混合检索？在RAG系统中如何结合BM25与向量检索实现混合检索？](http://localhost:80)

## 四、查询增强和关联
经过前面的文档检索，系统已经获取了与用户查询相关的文档。此时，大模型需要根据用户提示词和检索内容生成最终回答。然而，返回结果可能仍未达到预期效果,需要进一步优化。

### 4.1 错误处理机制
在实际应用中,可能出现多种异常情况,如找不到相关文档、相似度过低,查询超时等。良好的错误处理机制可以提升用户体验。

异常处理主要包括:

+ 允许空上下文查询(即处理边界情况)
+ 提供友好的错误提示
+ 引导用户提供必要信息

边界情况处理可以使用 Spring Al 的 `ContextualQueryAugmenter`上下文查询增强器:

```java
RetrievalAugmentationAdvisor.builder()                          
        .queryAugmenter(                                        
                ContextualQueryAugmenter.builder()              
                        .allowEmptyContext(false)  // 允许查询到的文档为空
                        .build()                                
        );
```

### 4.2 其他优化方向
除了上述优化策略外，还可以考虑以下方面的改进:

| 问题类型 | 改进策略 |
| --- | --- |
| 大模型并未理解知识和用户提示词之间的关系，答案生硬拼凑 | 建议 **选择合适的大模型**，提升语义理解能力 |
| 返回的结果没有按照要求，或者不够全面 | 建议 **优化提示词模板**，引导模型生成更符合要求的回答 |
| 返回结果不够准确，混入了模型自身的通用知识 | 建议 **开启拒识功能**，限制模型只基于知识库回答 |
| 相似提示词，希望控制回答的一致性或多样性 | 建议 **调整大模型参数**，如温度值等 |


如果有必要的话，还可以考虑更高级的优化方向，比如分离检索阶段和生成阶段的知识块，针对不同阶段使用不同粒度的文档,进一步提升系统性能和回答质量。



## 总结
RAG 系统的优化不是一次性工程，而是一个持续迭代的过程。核心思路可以概括为：**文档质量决定上限，切片+检索策略逼近上限**：

+ **文档质量**是起点，好的知识库让你赢在起跑线
+ **切分策略和元数据**决定向量表示的有效性，是检索质量的基础
+ **检索策略**（扩展、重排、混合搜索）决定召回率，直接影响回答的上限
+ **系统提示词**决定大模型能否按预想的方式工作，是做最后一道防线



如果这篇文章对你有帮助，欢迎关注我的公众号 **AutowiredAI**。后续我会继续分享 AI Agent 实战、向量数据库选型、RAG 评估这些内容。后台回复「RAG实战」可以拿到本文的完整代码仓库。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779471216288-599f1b44-b3d3-4082-84f8-722fcc84ca40.png)

