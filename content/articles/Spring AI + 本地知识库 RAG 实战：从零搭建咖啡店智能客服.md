---
title: Spring AI + 本地知识库 RAG 实战：从零搭建咖啡店智能客服
date: 2026-05-17T23:30:00.000Z
category: AI 应用开发
tags:
  - RAG
  - AI 大模型基础
  - Spring AI
  - AI 编排框架
  - 构建本地知识库
summary: 基于 Spring AI 框架，从零搭建咖啡店智能客服实战教程。通过 5 个直观步骤（新建工程→文档准备→文档读取→向量存储→查询增强），手把手实现本地知识库 RAG 问答。代码复制即用，最终让 AI 能基于本地咖啡店 FAQ 准确回答用户咨询。
featured: true
status: published
slug: '331491460860669952'
---

上一篇文章我们聊了 RAG 的理论基础（检索增强生成）。今天直接上代码：我会用 Spring AI 框架，基于本地知识库，从零搭建一个**咖啡店智能客服**。你只需要跟着 5 个步骤动手实操下来，你将拥有你的第一个能基于本地知识库准确回答业务问题的 AI 客服！

> 本文面向初学者，代码可以复制即用。最终效果：用户问“你们有哪些咖啡？”，AI 会从你准备好的文档里找出答案回复。
>

## 一、整体思路：简化版 RAG 开发流程
标准的 RAG 开发包含四步：**文档收集与切割** → **向量转换与存储 **→ **切片过滤与检索** → **查询增强与关联**。

但作为第一个 RAG 程序，我们不需要一上来就处理复杂的切割策略、过滤逻辑。Spring AI 官方也推荐从简入手。因此，我把上述步骤映射为 **5 个更直观的动作**：

| 步骤 | 对应 RAG 环节 | 我们要做什么 |
| --- | --- | --- |
| 1. 新建工程 | — | 创建 Spring Boot 项目，引入 Spring AI 相关依赖 |
| 2. 文档准备 | 文档收集 | 整理一份 Markdown 格式的知识库（咖啡店 FAQ） |
| 3. 文档读取 | 文档切割 | 用 `MarkdownDocumentReader`<br/> 加载文档，自动按标题拆分 |
| 4. 向量转换与存储 | 向量化 + 存储 | 用 Embedding 模型将文本片段转成向量，存入内存向量库 |
| 5. 查询增强 | 检索 + 增强生成 | 用 `QuestionAnswerAdvisor`<br/> 拦截问题，自动检索并注入上下文 |


下面按照这 5 步依次展开。每一步我都会贴出完整代码，并解释关键配置。

## 二、准备工作：基础环境与依赖
### 2.1 环境要求
+ JDK 17+
+ Spring Boot 3.x
+ 一个可用的 AI 模型 API（本文使用阿里云百炼 DashScope（阿里百炼大模型程序接入的方式可以参考我的另一篇文章 [不用写代码！10分钟在阿里云百炼上搭建你的第一个AI助手](https://blog.xinxinnote.tech/article/330015998404648960)），你也可以换成 OpenAI、Ollama本地模型 等，只需改依赖和配置）

### 2.2 新建 Spring Boot 项目
使用 [Spring Initializr](https://start.spring.io/) 生成一个基础项目，**只选 Spring Web** 即可。然后手动添加下面的依赖。


![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779032497861-f4cebd99-1c7b-43c5-b4a9-6e664d009021.png)

> 这里JDK我们采用JDK 21，使用JDK 17也是可以的
>

### 2.3 添加 Spring AI 相关依赖
在 `pom.xml` 中加入以下内容（版本以 Spring AI 1.0.0 为例，若更新请参考官方文档）：

```xml
<!-- Spring AI 核心包 -->
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-core</artifactId>
  <version>1.0.0</version>
</dependency>

<!-- 阿里云 DashScope 适配（包含 ChatModel 和 EmbeddingModel 的具体实现） -->
<dependency>
    <groupId>com.alibaba.cloud.ai</groupId>
    <artifactId>spring-ai-alibaba-starter-dashscope</artifactId>
</dependency>

<!-- Markdown 文档读取器（用于加载 .md 知识库） -->
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-markdown-document-reader</artifactId>
  <version>1.0.0</version>
</dependency>

<!-- RAG 所需的 Advisor（提供 QuestionAnswerAdvisor） -->
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-advisors-vector-store</artifactId>
  <version>1.0.0</version>
</dependency>

<!-- 可选：Hutool 工具库（简化集合判空等） -->
<dependency>
  <groupId>cn.hutool</groupId>
  <artifactId>hutool-all</artifactId>
  <version>5.8.25</version>
</dependency>

<!-- Lombok 简化代码（可选） -->
<dependency>
  <groupId>org.projectlombok</groupId>
  <artifactId>lombok</artifactId>
  <optional>true</optional>
</dependency>
```

注意：如果你使用 OpenAI 而不是阿里云，请替换 `spring-ai-alibaba-starter-dashscope` 为 `spring-ai-openai-spring-boot-starter`，并修改对应的配置。

### 2.4 配置 API Key 和模型
在 `application.yml` 中添加（以 DashScope 为例）：

```yaml
spring:
  ai:
    dashscope:
      api-key: ${DASHSCOPE_API_KEY}   # 替换为你的真实 API Key，建议用环境变量
      chat:
        options:
          model: qwen-plus
      embedding:
        options:
          model: text-embedding-v1    # 阿里云的 Embedding 模型
```

如果你用的是 OpenAI，配置类似：

```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-3.5-turbo
      embedding:
        options:
          model: text-embedding-ada-002
```

## 三、详细实现步骤
### 3.1 文档准备
在 `src/main/resources/document/` 目录下创建一个 Markdown 文件，例如 `咖啡店智能客服常见问题与回答.md`。

以下是一个最小示例（实际项目应该包含 50+ 问题）：

+ [咖啡店智能客服常见问题与解答.md](https://www.yuque.com/attachments/yuque/0/2026/md/28248978/1779032009357-4094d4ac-ceaa-4019-a05f-d771f5a2d9ff.md)

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779032030406-690530a4-0793-42b7-90b1-b7b7144489f6.png)



> 💡 **如何快速获取知识库文档？** 
>
> 大家在学习RAG的过程中，也可以用 AI 帮忙生成文档。复制下面的 Prompt 发给 AI，它会生成结构化的 Markdown：“帮我生成一篇 Markdown 文章，主题是【咖啡店智能客服常见问题和回答】，分别针对咖啡店日常运营、员工守则、员工奖惩、客户咨询、投诉、新品推荐等情况做出详细规定，不同细分主题单独列一个大标题然后下辖小标题章节，内容形式为 1 问 1 答，每个问题标题使用 4 级标题，每篇内容至少 10 个问题，总共不少于 50 个问题，每个问题推荐一个相关的了解更多链接（都指向 [https://blog.xinxinnote.tech](https://blog.xinxinnote.tech/)），整理成 markdown 代码块格式给我。”
>

### 3.2 文档读取
下一步我们要对自己准备好的知识库文档进行处理，然后保存到向量数据库中。这个过程俗称**ETL**(抽取、转换、加载)，SpringAl提供了对ETL的支持，参考 [官方文档](https://docs.spring.io/spring-ai/reference/1.0/api/etl-pipeline.html#page-title)。

ETL的3大核心组件，按照顺序执行:

+ **DocumentReader**：读取文档,得到文档列表
+ **DocumentTransformer**：转换文档,得到处理后的文档列表
+ **DocumentWriter**：将文档列表保存到存储中(可以是向量数据库,也可以是其他存储)

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779032545340-daa1b7be-12b2-459c-b956-26f46d721cd0.png)



Spring AI 提供了多种 `DocumentReader`，用于加载不同格式的文件（TXT、PDF、Word、Markdown 等）。我们要读取 Markdown，所以使用 `MarkdownDocumentReader`。

在项目根包（`tech.xinxinnote.superagent`）下新建 `rag` 子包，然后创建 `CoffeeDocumentLoader` 类：

```java
package tech.xinxinnote.superagent.rag;  // 请改成你自己的包名

import cn.hutool.core.collection.CollectionUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.markdown.MarkdownDocumentReader;
import org.springframework.ai.reader.markdown.config.MarkdownDocumentReaderConfig;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
public class CoffeeDocumentLoader {

    private final ResourcePatternResolver resourcePatternResolver;

    public CoffeeDocumentLoader(ResourcePatternResolver resourcePatternResolver) {
        this.resourcePatternResolver = resourcePatternResolver;
    }

    /**
     * 加载 resources/document/*.md 下的所有 Markdown 文件，
     * 自动按四级标题（####）切分成多个 Document 对象
     */
    public List<Document> loadDocuments() {
        List<Document> allDocs = new ArrayList<>();
        try {
            // 获取 classpath:document/ 目录下所有 .md 文件
            Resource[] resources = resourcePatternResolver.getResources("classpath:document/*.md");
            for (Resource resource : resources) {
                String filename = resource.getFilename();
                // 配置解析规则：遇到水平线也作为新文档分界，不要包含代码块和引用块
                MarkdownDocumentReaderConfig config = MarkdownDocumentReaderConfig.builder()
                .withHorizontalRuleCreateDocument(true)   // 水平线也切分
                .withIncludeCodeBlock(false)             // 不把代码块单独作为一个文档
                .withIncludeBlockquote(false)            // 不把引用块单独作为文档
                .withAdditionalMetadata("filename", filename) // 存一个元数据，方便追溯
                .build();
                MarkdownDocumentReader reader = new MarkdownDocumentReader(resource, config);
                List<Document> documents = reader.get();
                if (CollectionUtil.isNotEmpty(documents)) {
                    allDocs.addAll(documents);
                }
            }
        } catch (Exception e) {
            log.error("加载文档失败", e);
        }
        return allDocs;
    }
}
```

**代码解释**：

+ `ResourcePatternResolver` 是 Spring 提供的资源查找工具，我们可以用 `"classpath:document/*.md"` 轻松获取目录下所有 `.md` 文件。
+ `MarkdownDocumentReaderConfig` 允许我们自定义解析行为。比如 `withHorizontalRuleCreateDocument(true)` 表示 Markdown 中的 `---` 分隔线也会触发切分（避免单个片段过长）。
+ `withAdditionalMetadata` 可以将文件名作为元数据附加到每个 `Document` 对象中，后续检索时可以按文件名过滤（高级用法，这里先了解）。
+ `reader.get()` 执行实际解析，返回 `List<Document>`。

### 3.3 配置向量存储（SimpleVectorStore）
Spring AI 内置了一个基于内存的 `SimpleVectorStore`，非常适合开发和测试。它实现了 `VectorStore` 接口，而 `VectorStore` 又继承了 `DocumentWriter`，因此可以直接调用 `add()` 方法写入文档。

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779032714765-967a43d8-d113-48ad-bed5-dd756a32dc67.png)



我们新建一个配置类 `CoffeeVectorStoreConfig`，在里面定义一个 `@Bean` 方法，返回 `VectorStore` 实例。同时，为了让 Bean 初始化时就把知识库文档加载进去，我们在方法内调用 `CoffeeDocumentLoader` 并执行 `add()`。

```java
package tech.xinxinnote.superagent.rag;

import cn.hutool.core.collection.CollectionUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@Slf4j
public class CoffeeVectorStoreConfig {

    @Autowired
    private CoffeeDocumentLoader coffeeDocumentLoader;

    /**
     * 创建一个基于内存的向量存储，并在启动时加载所有文档
     */
    @Bean
    public VectorStore coffeeVectorStore(EmbeddingModel embeddingModel) {
        SimpleVectorStore vectorStore = SimpleVectorStore.builder(embeddingModel).build();
        List<Document> documents = coffeeDocumentLoader.loadDocuments();
        if (CollectionUtil.isNotEmpty(documents)) {
            vectorStore.add(documents);
            log.info("成功加载 {} 个文档片段到向量存储", documents.size());
        } else {
            log.warn("没有加载到任何文档，请检查 resources/document/ 目录下是否有 .md 文件");
        }
        return vectorStore;
    }
}
```

**注意**：这里 `EmbeddingModel` 参数会自动注入，因为我们在依赖中引入了 `spring-ai-alibaba-starter-dashscope`，它提供了一个 `EmbeddingModel` 的实现 Bean（`DashScopeEmbeddingModel`）。这个模型会把每个文档片段转换成向量。

`SimpleVectorStore` 会将向量存储在内存中，服务重启后数据会丢失（每次启动都会重新从文档加载），这正好符合我们“每次训练都基于最新文档”的预期。

### 3.4 查询增强：编写智能客服对话核心类（CoffeeApp）
现在我们要创建一个 `CoffeeApp` 组件，它暴露一个 `chatWithRAG(String message, String chatId)` 方法，供外部调用。这个方法内部使用 `ChatClient`，并启用 `QuestionAnswerAdvisor` 来实现 RAG。

`ChatClient` 是 Spring AI 提供的流式 API，可以链式构建请求。我们还需要给它配置：

+ 系统提示词（定义 AI 的角色和回答边界）
+ 多轮对话记忆（MessageChatMemoryAdvisor）
+ 可选的自定义日志 Advisor（比如 `MyLoggerAdvisor`）
+ **关键的 RAG 增强**：`QuestionAnswerAdvisor`

```java
package tech.xinxinnote.superagent.config;  // 你的包名

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tech.xinxinnote.superagent.advisor.MyLoggerAdvisor;  // 自定义，可先去掉

@Component
@Slf4j
public class CoffeeApp {

    private final ChatClient chatClient;

    @Autowired
    private VectorStore coffeeVectorStore;

    /**
     * 系统提示词：定义 AI 的角色、职责、回答原则、禁止回答的内容
     */
    private static final String SYSTEM_PROMPT = """
    你是“醒石咖啡”的智能客服助手。你的职责是友好、专业地回答顾客关于门店信息、饮品菜单、优惠活动、服务流程、投诉建议等常规问题。

    回答原则：
    1. 优先使用知识库中的标准答案，若无法确定则主动建议顾客联系门店或查看官方小程序 https://blog.xinxinnote.tech。
    2. 对于员工内部制度（如奖惩、排班）、食品安全事故、法律纠纷等敏感问题，仅提供基础指引并转人工处理。
    3. 不编造任何超出已知范围的优惠、价格或库存信息。
    4. 保持礼貌、耐心，语气亲切但不过度热情。

    禁止回答的内容：
    - 顾客的个人隐私信息（如身份证号、银行卡号）
    - 对竞争对手的负面评价
    - 超出咖啡店业务范围的问题（如医疗建议、投资理财）

    当不确定时，统一回复：“您好，这个问题我需要帮您转接人工客服或您可到店咨询，感谢理解！”
    """;

    public CoffeeApp(ChatModel dashscopeChatModel) {
        // 配置多轮对话记忆：保留最近 20 条消息，使用内存存储
        MessageWindowChatMemory chatMemory = MessageWindowChatMemory.builder()
        .chatMemoryRepository(new InMemoryChatMemoryRepository())
        .maxMessages(20)
        .build();

        this.chatClient = ChatClient.builder(dashscopeChatModel)
        .defaultSystem(SYSTEM_PROMPT)                                // 设置系统提示词
        .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build()) // 全局记忆
        .build();
    }

    /**
     * 带 RAG 增强的问答方法
     * @param message 用户输入的问题
     * @param chatId  会话ID（用于区分不同用户/对话窗口）
     * @return AI 回答内容
     */
    public String chatWithRAG(String message, String chatId) {
        return chatClient.prompt()
        .user(message)
        // 传递会话ID，让记忆 Advisor 知道这是哪个对话
        .advisors(spec -> spec.param(ChatMemory.CONVERSATION_ID, chatId))
        // （可选）自定义日志 Advisor，打印请求和响应详情
        .advisors(new MyLoggerAdvisor())
        // 关键！启用 RAG：QuestionAnswerAdvisor 会从 VectorStore 中检索相关文档并自动注入
        .advisors(new QuestionAnswerAdvisor(coffeeVectorStore))
        .call()
        .content();
    }
}
```

**解释几个关键点**：

+ `MessageWindowChatMemory` 负责存储多轮对话的历史消息，我们只保留最近 20 条，避免 token 过长。
+ `QuestionAnswerAdvisor` 的构造参数是 `VectorStore`。当用户问题到达时，它会自动调用 `vectorStore.similaritySearch()`，找到最相关的几个文档片段，然后把这些片段拼接到系统提示词后面。
+ 最终调用 `.call().content()` 得到 AI 回复的纯文本。

如果你暂时不需要日志 Advisor，可以删掉那一行。`MyLoggerAdvisor` 可以自己实现（后续补充），或者先不写。

### 3.5 编写测试类验证
在 `src/test/java` 下创建测试类 `CoffeeAppTest`，用于验证整个流程。

```java
package tech.xinxinnote.superagent.app;  // 你的测试包路径

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import tech.xinxinnote.superagent.config.CoffeeApp;

import java.util.UUID;

@SpringBootTest
class CoffeeAppTest {

    @Autowired
    private CoffeeApp coffeeApp;

    @Test
    void chatWithRAG() {
        String chatId = UUID.randomUUID().toString();
        String message = "你们都有哪些品类的饮品？";

        // 注意：这个问题应该对应你文档中的问题1或问题2
        String answer = coffeeApp.chatWithRAG(message, chatId);

        Assertions.assertNotNull(answer);
        System.out.println("AI 回答：" + answer);
    }
}
```

**运行测试**：

1. 确保你的 API Key 配置正确（环境变量 `DASHSCOPE_API_KEY` 已设置）。
2. 运行 `chatWithRAG` 测试方法。
3. 观察控制台输出。如果一切正常，你会看到类似下面的回答：

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779033048986-85ce5ab8-8a71-472e-bbf7-7f1726b24e48.png)



大模型的回答符合我们的预期，下面是原文档中关于这一点的表述：

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779033072086-00ef0c7f-ba30-48db-a9cd-dc15e7037cf5.png)

## 四、进阶建议与常见问题
### 4.1 如何让 AI 引用来源？
你可以在系统提示词中要求“回答时在末尾引用来源”，并且修改 `QuestionAnswerAdvisor` 的提示词模板（需自定义 Advisor）。简单做法：在知识库文档的每个回答末尾加上 `[来源：内部文档]`，AI 会自然照搬。

### 4.2 检索不到正确文档怎么办？
+ 检查文档中的问题表述是否与用户实际问法差异过大（例如用户问“有什么喝的”，文档写的是“饮品种类”）。可以适当增加同义词。
+ 调整相似度阈值：`QuestionAnswerAdvisor` 默认只返回相似度 > 0.5 的结果。你可以通过构造器设置：`new QuestionAnswerAdvisor(vectorStore, 3)` 表示返回前 3 个，不设阈值。
+ 增加文档切分的细粒度：`MarkdownDocumentReaderConfig` 中可配置 `withHorizontalRuleCreateDocument(true)`，你可以尝试用更小的分隔符。

### 4.3 内存向量库在重启后会丢失，生产环境怎么办？
生产环境请使用持久化向量数据库，比如 **PGVector**、**Milvus**、**Elasticsearch** 等。Spring AI 提供了对应的 `VectorStore` 实现。你只需要将 `CoffeeVectorStoreConfig` 中的 `@Bean` 方法换成对应的实现，其余代码（`CoffeeApp` 等）**完全不需要修改**。

例如，使用 PGVector：

+ 添加 `org.postgresql:postgresql` 和 `org.springframework.ai:spring-ai-pgvector-store-spring-boot-starter` 依赖。
+ 配置 `application.yml` 中的数据源和 PGVector。
+ 将 `SimpleVectorStore` 替换为 `PgVectorStore`。

### 4.4 如何提升检索质量（混合检索）？
Spring AI 的 `QuestionAnswerAdvisor` 默认使用向量相似度检索。如果你想结合关键词检索（BM25），可以使用 `RetrievalAugmentationAdvisor`，它支持更灵活的检索策略（包括混合检索）。但初次学习建议先用 `QuestionAnswerAdvisor` 跑通。

## 总结
到这里，你已经用 Spring AI 完整实现了一个基于本地知识库的 RAG 应用——咖啡店智能客服。整个过程下来，你会发现 Spring AI 把 RAG 的复杂流程封装得很清晰：文档自动加载切分（这里使用了默认切分逻辑）、向量化存储、检索增强问答，每一步都有对应的组件可以直接使用，不需要你手动写繁琐的相似度计算或提示词拼接。

最终你得到的是一个能基于你提供的 FAQ 文档，准确回答用户问题的 AI 助手。它不会凭空编造，因为所有回答都有知识库作为依据。

当然，这只是一个开始。接下来你可以尝试把内存向量库换成持久化的数据库（比如 PGVector），或者给客服加上多轮对话记忆、自定义检索策略。Spring AI 的生态会让你越用越顺手。

如果这篇文章对你有帮助，欢迎关注我的公众号 **AutowiredAI**，后续我会继续更新 Spring AI 进阶实战、向量数据库选型、RAG 评估等内容。后台回复「RAG实战」可获取本文完整代码仓库。

如果遇到任何问题，欢迎在评论区留言，我会尽量解答。希望这篇教程能帮你顺利迈出 RAG 应用的第一步！

  


