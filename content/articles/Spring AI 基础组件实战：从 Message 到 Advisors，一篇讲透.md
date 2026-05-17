---
title: Spring AI 基础组件实战：从 Message 到 Advisors，一篇讲透
date: 2026-05-15T23:30:00.000Z
category: AI 应用开发
tags:
  - Advisors API
  - AI 大模型基础
  - Spring AI
  - AI 编排框架
summary: Spring AI 基础组件实战指南，系统讲解 Message（消息角色体系）、Prompt（多消息容器与模板）、ChatModel（统一模型接口与流式调用）、ChatClient（链式 API 与实体映射）及 Advisors（拦截器模式实现记忆/RAG/敏感词过滤）。通过丰富代码示例，帮你快速掌握 Spring AI 核心设计思路，提升 Java 调用大模型的工程化能力。
featured: true
status: published
slug: '330764400525496320'
---

上一篇文章我们聊了提示词工程，学会了怎么跟 AI “好好说话”。但光会说话还不够，怎么在 Java 代码里优雅地调用大模型，才是我们程序员的日常。

Spring AI 的出现，就是帮你把那些繁琐的 HTTP 调用、参数封装、多模型适配统统屏蔽掉。这篇文章从 Message 到 Prompt，再到 ChatClient 和 Advisors，一步步带你读懂 Spring AI 基础组件的设计思路。

**适用读者**：初学 Spring AI 的 Java 开发者，对 AI 模型调用感兴趣但不想被底层细节劝退的朋友。

## 一、Message：对话的基本单元
### 1.1 消息的分层设计
在 Spring AI 中，每一次跟 AI 的交互，本质上都是一条条消息的传递。**Message** 就是这些消息的载体。

一条消息（`Message`）通常包含三样东西：

+ **角色（Role）**：这条消息是谁发的（用户、助手、系统、工具），在Spring AI中对应`MessageType`。
    - `SYSTEM`：系统消息（用于配置 AI 行为）；
    - `USER`：用户消息（用户输入）；
    - `ASSISTANT`：助手消息（AI 输出）；
    - `TOOL`：工具消息（工具调用或工具返回结果）。
+ **内容（Content）**：你说了什么，或者 AI 回了什么，是在Spring AI消息体系核心设计，对应`Message` 接口，Spring 提供了四个不同用途的实现类：
    - `SystemMessage`：类型固定为 `SYSTEM`，用于传递系统级指令（如 AI 的人设、规则）。
    - `UserMessage`：类型固定为 `USER`，支持多模态输入 —— 通过 `media()` 方法关联 `Media` 集合（如用户发送的图片）。
    - `AssistantMessage`：类型固定为 `ASSISTANT`，支持**工具调用**—— 通过 `toolCalls` 关联 `ToolCall` 集合。
    - `ToolResponseMessage`：类型固定为 `TOOL`，承载**工具返回结果**—— 通过 `responses` 关联 `ToolResponse` 集合
+ **元数据（Metadata）**：可选，用于存一些额外信息（如时间戳、来源等）。

Spring AI 的 Message API 设计得挺清晰的，下面是它的核心类图（简化版）：

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778696279956-dcd1cfd7-b9f2-4c3c-a7f4-6998ad382e04.png)

### 1.2 四种消息子类的特点
**SystemMessage**：系统消息，通常用来配置 AI 的行为。比如“你是一个 Java 技术顾问，回答要简洁”。

```java
SystemMessage systemMessage = new SystemMessage("你是一个 Java 技术顾问，回答要简洁");
```

**UserMessage**：用户消息，支持多模态（文字 + 图片）。你可以通过 `media()` 方法附带图片或音频。

```java
UserMessage userMessage = new UserMessage("这张图片里有什么？");
// 如果想加图片，可以用 Media 对象
// userMessage = new UserMessage("描述图片", List.of(new Media(MimeType.valueOf("image/png"), "https://xxx.png")));
```

**AssistantMessage**：AI 的响应消息。如果 AI 需要调用外部工具，它会生成 `ToolCall` 列表，而不是直接返回文本。

```java
// 普通文本响应
AssistantMessage assistantMessage = ...;
// 如果有工具调用
List<ToolCall> toolCalls = assistantMessage.getToolCalls();
```

**ToolResponseMessage**：工具执行完后，把结果封装成 ToolResponseMessage 返回给 AI，让 AI 继续生成最终答案。

### 1.3 一条消息的完整流转过程
理解消息流转，对后面调优很有帮助。整个流程大致是这样：

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778818325829-c50290ce-fbc6-4923-91cc-6560dd62ad08.png)

1. 用户发起请求 → 创建 `UserMessage`
2. 开发者配置 `SystemMessage`（可选）
3. 将 `SystemMessage + UserMessage` 组装成 `Prompt` 发送给 AI
4. AI 返回 `AssistantMessage`（可能带 `ToolCall`）
5. 如果有工具调用，执行工具后生成 `ToolResponseMessage`
6. AI 根据工具结果再次生成最终 `AssistantMessage`

这个流程会在后面 **Advisors** 部分更清晰地看到。

## 二、Prompt：把多条消息打包发给 AI
在 Spring AI 中，你跟 AI 的每一次问答，都不是直接传字符串，而是通过 **Prompt** 对象。那么可能你会产生疑问：**为什么Spring AI提供了Message还需要Prompt？**

### 2.1 为什么提供了Message还需要Prompt？
在 Spring AI 中，‌**Message**‌ 和 ‌**Prompt**‌ 是两个不同抽象层次的组件，它们各自承担明确的职责。即使已有 Message，仍需设计 Prompt，原因如下：

#### ‌（1）职责分离：Message 是单元，Prompt 是容器‌
+ ‌**Message**‌ 表示对话中的‌**单条语义单元**‌，包含内容、角色（如 USER、SYSTEM）和元数据。
+ ‌**Prompt**‌ 是一个‌**容器对象**‌，用于组织多个 Message，并可附加模型调用参数（如 temperature、maxTokens 等）‌‌。

> 例如：一次对话可能包含系统指令、用户问题、历史回复等多条 Message，Prompt 将它们打包成一个完整的请求。
>

---

#### ‌（2）支持复杂交互与上下文管理‌
现代大模型（如 GPT）基于‌**对话历史**‌生成响应，而非仅处理单条输入。Prompt 通过维护有序的 Message 列表，支持：

+ **多轮对话上下文**
+ **系统设定 + 用户查询 + 助手回复的混合结构**
+ 工具调用结果的回传（ToolResponseMessage）‌‌

---

#### ‌（3）统一接口与模型兼容性‌
不同 AI 模型对输入格式要求各异（有的接受字符串，有的需结构化消息）。Prompt 提供‌**标准化接口**‌，屏蔽底层差异：

+ 底层可适配 OpenAI、Anthropic、本地模型等
+ 上层统一使用 `Prompt` 对象传递给 `ChatModel` ‌‌

---

#### ‌（4）与模板系统（PromptTemplate）协同‌
Prompt 可由 ‌**PromptTemplate**‌ 动态生成，支持参数化注入：

```java
 // 1. 定义提示词模板，使用占位符 {topic} 和 {adjective}
String template = "请用{adjective}的风格，讲一个关于{topic}的笑话。";
        
// 2. 创建 PromptTemplate 实例并传入模板
PromptTemplate promptTemplate = new PromptTemplate(template);
        
// 3. 创建参数 Map（注意：Spring AI 中 create 方法接受 Map<String, Object>）
Map<String, Object> params = Map.of("topic", topic, "adjective", adjective);
        
// 4. 通过 create 方法生成 Message 或 Prompt
// 这里我们生成 Prompt 对象（包含一个 UserMessage）
Prompt prompt = promptTemplate.create(params);
......
```

这使得提示词可复用、可配置，而 Message 仅负责承载最终构造好的内容 ‌‌。



> **总结**✨
>
> + ‌**Message**‌ 是“砖块”，描述一条消息的内容与角色；
> + ‌**Prompt**‌ 是“建筑”，将多块砖合理组合，并加上施工说明（ChatOptions）。
>
> 两者协同，既保证了灵活性与结构化，又提升了工程化能力与模型兼容性。
>

### 2.2 传统意义上 Prompt 基本组成结构
+ **角色（Role）**

给模型设定身份和视角，如“你是一名医疗AI领域专家”。

+ **指令（Instruction）**

明确告诉模型要做什么任务，这是最核心部分。

+ **上下文（Context）**

提供任务背景、受众、应用场景等信息，帮助模型理解语境。

+ **输入（Input）**

模型需要处理的具体数据或内容。

+ **输出（Output Indicator）**

明确输出的格式、结构、风格，如 Markdown、JSON、列表等，但是模型输出不一定按照给出的格式进行百分百的输出

+ **约束（Constraints）**

对结果进行限制，如字数、语气、必须包含的内容、不允许的内容等。

简单理解：**Prompt = 角色 + 指令 + 上下文 + 输入 + 输出指示 + 约束**  
在工程中应当把它们"接口化、模板化、结构化"，而不是随意拼接一句话，这样大模型能够更加准确地理解用户的意图。

> **在 Spring AI 中的映射关系**：
> - **角色** → `MessageType`（SYSTEM/USER/ASSISTANT/TOOL）
> - **指令 + 输入** → `UserMessage` 或 `SystemMessage` 的 `content`
> - **上下文** → 历史 `Message` 列表（多轮对话记忆）
> - **输出指示 + 约束** → `ChatOptions`（temperature、maxTokens 等参数控制）

### 2.3 Spring AI Prompt 接口组成
```java
public class Prompt implements ModelRequest<List<Message>>{
    private final List<Message> messages;

   // 封装了大模型的可选参数，后续说明
    private final ChatOptions options;
}

//ModelRequest = 发给大模型的一次“完整请求”抽象
public interface ModelRequest<T> {
   // 真正要交给模型的输入内容”
    T getInstructions();

   // 这次请求调用模型时的参数配置  
    ChatOptions getOptions();
}
```

核心就两个方法：`getInstructions` 和 `getOptions`

+ `getInstructions`：真正要交给模型的输入内容，这一部分Spring AI聚合了一个由`Message`组成的列表来实现功能，所有关于Prompt，这一部分其实就是传统意义上我们的Prompt的范围，在Spring AI中是基于Message实现
+ `getOptions`：请求调用模型时的参数配置，对应Spring AI中的 `ChatOptions`，ChatOptions封装了大模型的可选参数：
    - 模型选择（`model`）
    - 温度（`temperature`，控制随机性）
    - `topP/topK`（采样方式）
    - 最大输出长度（`maxTokens`）
    - 惩罚项（`presencePenalty/FrequencyPenalty`）：控制模型生成时的重复问题，数值越大，模型越倾向于往“新话题”拓展。



### 2.4 PromptTemplate：**提示词模板化**
#### （1）为什么需要 PromptTemplate？
例如我们需要写的提示词是这样的：

```latex
你是一个经验丰富的人工智能编程助手，名字叫可灵，请用通俗易懂的风格回答以下问题：世界上最好的语言是什么？
```

在这一句提示词中，我们可能希望助手的名字、风格，还希望回答的问题是可变的。如果我们在没有PromptTemplate的情况下，我们需要写成这样：

```java
String name = "可灵";
String voice = "通俗易懂";
String userQuestion = "世界上最好的语言是什么？"

String promptText = "你是一个经验丰富的人工智能编程助手，名字叫"+name+"，请用"+voice+"的风格回答以下问题："+userQuestion
```

这种方式存在几个明显的问题：

+ **代码臃肿**：每次需要改变提示词结构或角色设定时，都必须修改代码并重新部署。
+ **难以维护**：如果提示词逻辑变得复杂(例如需要加入系统指令、上下文历史等)，字符串拼接会变得非常混乱且容易出错。
+ **缺乏复用性**：相同的提示词结构无法轻松应用于其他类似场景。

Spring AI解决这一痛点的方法就是—— `PromptTemplate`。

#### （2）PromptTemplate 是什么
在Spring AI的开发过程中，**PromptTemplate(提示词模板)**的核心价值在于它能够将**静态的提示词结构**与**动态的业务数据**分离，从而提升代码的可维护性和复用性。当你的应用需要与大型语言模型(LLM)交互，且交互内容会根据用户输入或业务状态发生变化时，就是使用Prompt Template的典型场景。

#### （3）使用PromptTemplate
**渲染用户提示词示例**

```java
String promptText = "你是一个经验丰富的人工智能编程助手，名字叫{name}，请用{voice}的风格回答以下问题：{userQuestion}"
PromptTemplate userPrompt = new PromptTemplate(promptText)
Message message = userPrompt.createMessage(Map.of("name","可灵",
                "voice","通俗易懂",
                "userQuestion","世界上最好的语言是什么？"));
```

**渲染系统提示词示例**

```java
String promptText = "你是一个经验丰富的人工智能编程助手，名字叫{name}，请用{voice}的风格回答以下问题：{userQuestion}"
SystemPromptTemplate systemPrompt = new SystemPromptTemplate(promptText)
Message message = systemPrompt.createMessage(Map.of("name","可灵",
                "voice","通俗易懂",
                "userQuestion","世界上最好的语言是什么？"));
```

## 三、ChatModel：统一的模型调用接口
Spring AI 最大的价值之一，就是抽象出了一个统一的 **ChatModel** 接口。不管你底层用的是 OpenAI、智谱、DeepSeek 还是 Ollama，上层代码几乎不用改。

### 3.1 ChatModel 接口定义
```java
public interface ChatModel {
    String call(String message);           // 速记：单轮文本对话
    ChatResponse call(Prompt prompt);      // 标准：多轮 + 参数
}
```

流式版本：

```java
public interface StreamingChatModel {
    Flux<String> stream(String message);               // 流式文本
    Flux<ChatResponse> stream(Prompt prompt);          // 流式结构化结果
}
```

### 3.2 流式调用实战（SSE 输出）
长文本生成场景下，让用户干等几秒是很糟糕的体验。流式输出（打字机效果）就能解决这个问题。

下面是一个完整的 `SseEmitter` 示例，将 AI 的回答一个字一个字推送给前端：

```java
@CrossOrigin
@GetMapping(value = "/chatStream")
public SseEmitter streamChat(@RequestParam("message") String message) {
    SseEmitter emitter = new SseEmitter(180000L);  // 3分钟超时
    Prompt prompt = new Prompt(new UserMessage(message));

    // 订阅流式响应
    Disposable subscription = zhiPuAiChatModel.stream(prompt).subscribe(
        chatResponse -> {
            String content = chatResponse.getResult().getOutput().getText();
            if (content != null && !content.isEmpty()) {
                emitter.send(SseEmitter.event().data(content).build());
            }
        },
        error -> emitter.completeWithError(error),
        () -> emitter.complete()
    );

    // 客户端断开时取消订阅
    emitter.onCompletion(() -> subscription.dispose());
    emitter.onTimeout(() -> {
        subscription.dispose();
        emitter.complete();
    });

    return emitter;
}
```

前端可以用 `EventSource` 或 `fetch` 接收流式数据，实现类似 ChatGPT 的逐字输出效果。

## 四、ChatClient：更现代的流式 API
虽然 `ChatModel` 已经很好用了，但 只适用于和大模型进行简单的聊天任务，更复杂的任务比如RAG、Advisor等功能的支持需要 **ChatClient**，它采用**流式 API 风格**，链式调用，体验类似于 WebClient 或 RestClient。

### 4.1 快速创建 ChatClient
**方式一：使用自动配置的 Builder**

```java
@RestController
public class ChatController {
    private final ChatClient chatClient;

    // 在构造方法中使用ChatClient.Builder 进行构建
    public ChatController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @GetMapping("/call")
    public String chat(@RequestParam String message) {
        return chatClient.prompt()
        .user(message)
        .call()
        .content();
    }
}
```

**方式二：自己传入 ChatModel**

```java
public ChatController(ChatModel chatModel) {
  // 构建指定ChatModel的ChatClient
  this.chatClient = ChatClient.builder(chatModel).build();
}
```

### 4.2 多模型共存
如果你的项目需要同时调用多个不同厂商的模型，可以禁用自动配置，手动创建多个 ChatClient Bean：

```java
@Configuration
public class ChatClientConfig {
    @Bean
    public ChatClient deepseekClient(DeepSeekChatModel model) {
        return ChatClient.builder(model).build();
    }

    @Bean
    public ChatClient zhipuClient(ZhiPuAiChatModel model) {
        return ChatClient.builder(model).build();
    }
}
```

使用时通过 `@Qualifier` 区分：

```java
@Autowired
@Qualifier("zhipuClient")
private ChatClient zhipuClient;
```

### 4.3 返回不同格式的结果
ChatClient 提供了三种响应处理方式：

#### （1）返回 String（最常用）
```java
String content = chatClient.prompt()
.user("你是谁")
.call()
.content();
```

#### （2）返回 ChatResponse（带元数据）
```java
ChatResponse response = chatClient.prompt()
.user("你是谁")
.call()
.chatResponse();
// 可以从 response 中拿到 token 消耗、模型名称等信息
```

#### （3）直接映射成实体对象
假设你有一个 `Book` 类，想让 AI 直接给你填好：

```java
public class Book {
    private String title;
    private String author;
    private int year;
    // getter/setter
}
```

调用方式：

```java
Book book = chatClient.prompt()
.system("你是一个书籍专家，每次只推荐一本书，返回JSON格式")
.user("推荐一本Java入门书")
.call()
.entity(Book.class);
```

如果 AI 返回的是 JSON 数组（比如推荐多本书），可以用 `ParameterizedTypeReference`：

```java
List<Book> books = chatClient.prompt()
.system("你是一个书籍专家，每次推荐3本书")
.user("推荐摄影类书籍")
.call()
.entity(new ParameterizedTypeReference<List<Book>>() {});
```

**前提**：AI 返回的文本必须是合法的 JSON 格式，且字段名与实体类匹配。你可以在 System 提示词里明确要求“只返回 JSON，不要有其他解释”，但由于AI幻觉问题的存在，不一定百分百每次AI都会返回正确的JSON结构，所以需要我们做一些工程上的控制和优化，篇幅原因这个话题不在这里细讲，感兴趣可以阅读我的另一篇文章：[Agent开发中怎么让模型稳定输出结构化结果](https://www.yuque.com/zhangsan-l9fwq/pc8ix8/pnlkuf3l6lgiadg8)

#### （4）流式输出
```java
Flux<String> contentStream = chatClient.prompt()
.user("写一首关于春天的诗")
.stream()
.content();
```

配合 Spring WebFlux，可以直接返回给前端，自动实现 Server-Sent Events。

## 五、Advisors：让 AI 交互更智能
Spring AI [Advisors API](https://docs.spring.io/spring-ai/reference/api/advisors.html) 提供了一种灵活而强大的方式来**拦截、修改和增强 Spring 应用程序中由 AI 驱动的交互**。它的作用类似于 Web 开发中的拦截器或 AOP 切面，能在请求前和响应后插入自定义逻辑。Advisors 常见使用场景：

+ 将常见的生成式AI模式（如对话记忆、敏感词过滤、RAG检索）打包成可重用单元，简化开发流程
+ 创建可跨越不同模型和用例工作的可重用转换组件，提升代码灵活性

### 5.1 Advisor 工作流程

回顾一下 1.3 节的消息流转图 —— Advisor 链正是插入在「组装 Prompt → 发送给大模型」和「大模型返回响应」这两个关键节点之间，对请求和响应进行拦截增强。

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778827716246-17080063-3d6b-4530-a235-90e8f3d43195.png)

简单解释下流程:

1. 用户发起请求，Spring AI 将 Prompt 传入 Advisor 链
2. Spring AI 框架会**根据 Advisor 的优先级从高到低**（数字越小优先级越高），**依次执行**链中每个 Advisor 的 `before` 方法
3. 执行完所有的 `before` 方法后，将处理后的 Prompt 发送给大模型
4. 大模型返回响应后，Spring AI 框架会**按照优先级的反序**依次执行链中每个 Advisor 的 `after` 方法
5. 执行完所有的 `after` 方法后，我们获得了最终的大模型响应内容，执行结束。

### 5.2 内置的常用 Advisor
#### ✅ MessageChatMemoryAdvisor（多轮对话记忆）
让 AI 记住之前聊过什么。你需要指定一个 `conversationId` 来区分不同用户。

```java
MessageChatMemoryAdvisor memoryAdvisor = 
new MessageChatMemoryAdvisor(new InMemoryChatMemory());

ChatClient chatClient = ChatClient.builder(openAiModel)
.defaultAdvisors(memoryAdvisor)
.build();

// 第一轮
String resp1 = chatClient.prompt()
.user("我叫小明")
.advisors(a -> a.param("chat_memory_conversation_id", "user123"))
.call()
.content();

// 第二轮，AI 能记住你叫小明
String resp2 = chatClient.prompt()
.user("我叫什么名字？")
.advisors(a -> a.param("chat_memory_conversation_id", "user123"))
.call()
.content();
```

**注意**：`MessageChatMemoryAdvisor` 会把完整的历史消息追加到对话中。如果你的模型本身不支持多轮（极少数情况），可以用 `PromptChatMemoryAdvisor`，它会把历史塞进系统提示词。

#### ✅ VectorStoreChatMemoryAdvisor（向量存储记忆）
当对话历史太长（超过模型上下文窗口）时，可以用向量检索代替全量加载。它会根据当前问题，从历史中检索最相关的几条消息。

```java
VectorStoreChatMemoryAdvisor advisor = 
VectorStoreChatMemoryAdvisor.builder(vectorStore).build();
```

#### ✅ QuestionAnswerAdvisor（RAG 检索）
这个最常用：从知识库中检索相关文档，注入到用户问题之前，让 AI 基于私有知识回答。

```java
// 准备一个文档
vectorStore.add(List.of(new Document("你的年龄在10-20岁左右")));

QuestionAnswerAdvisor advisor = new QuestionAnswerAdvisor(vectorStore);
ChatClient client = ChatClient.builder(openAiModel)
.defaultAdvisors(advisor)
.build();

String answer = client.prompt()
.user("你几岁了")
.call()
.content();  // AI 会回答 10-20 岁
```

#### ✅ SafeGuardAdvisor（敏感词过滤）
基于关键词或正则表达式拦截非法输入。

```java
SafeGuardAdvisor advisor = new SafeGuardAdvisor(List.of("JJ", "GG"));
// 如果用户消息包含这些词，会被过滤或拒绝
```

### 5.3 自定义 Advisor：统计响应耗时
我们可以使用 Advisor 定义任何我们想让Spring AI在请求大模型前后的参数和响应的增强，比如如果你想统计每次 AI 调用的耗时，可以自己写一个 Advisor。

```java
@Slf4j
public class TimingAdvisor implements BaseAdvisor {

    @Override
    public ChatClientRequest before(ChatClientRequest request, AdvisorChain chain) {
        request.context().put("startTime", System.currentTimeMillis());
        return request;
    }

    @Override
    public ChatClientResponse after(ChatClientResponse response, AdvisorChain chain) {
        Long start = (Long) response.context().get("startTime");
        if (start != null) {
            log.info("AI 调用耗时: {}ms", System.currentTimeMillis() - start);
        }
        return response;
    }

    @Override
    public int getOrder() {
        return 0;  // 数值越小，优先级越高
    }
}
```

使用：

```java
ChatClient client = ChatClient.builder(model)
.defaultAdvisors(new TimingAdvisor())   //注册advisor
.build();
```

### 5.4 高级案例：基于数据库的对话记忆（手动实现）
前面内置的 `MessageChatMemoryAdvisor` 已经够用，但作为学习，你也可以自己实现一个基于数据库的对话记忆将用户消息持久化。

```java
@Slf4j
public class MySQLMessageChatMemoryAdvisor implements BaseChatMemoryAdvisor {

    private final ChatMessageMapper messageMapper;

    private final static String CONVERSATION_ID = "MY_CONVERSATION_ID";

    public MySQLMessageChatMemoryAdvisor(ChatMessageMapper messageMapper) {
        this.messageMapper = messageMapper;
    }

    @NotNull
    @Override
    public ChatClientRequest before(ChatClientRequest request, AdvisorChain chain) {
        String conversationId = getConversationId(request.context(), CONVERSATION_ID);
        // 只加载历史消息（不包含当前消息）
        List<Message> history = getUserHistoryMessage(conversationId);

        // 当前消息直接从 request 中获取
        List<Message> currentMessages = request.prompt().getInstructions();

        List<Message> allMessages = new ArrayList<>(history);
        allMessages.addAll(currentMessages);
        Prompt newPrompt = request.prompt().mutate().messages(allMessages).build();
        ChatClientRequest processedChatClientRequest = request.mutate().prompt(newPrompt).build();

        // 保存当前消息到数据库
        // 这里还可以更加解耦，将数据库操作抽象为ChatMemory接口，这样替换保存逻辑时上层代码不用改变
        List<UserMessage> userMessages = processedChatClientRequest.prompt().getUserMessages();
        messageMapper.saveMessage(conversationId, MessageType.USER, userMessages);
        return processedChatClientRequest;
    }

    private List<Message> getUserHistoryMessage(String conversationId) {
        try {
            if (StringUtils.isBlank(conversationId)) {
                return Collections.emptyList();
            }


            List<ChatMessage> chatMessages = messageMapper.selectListByConversationId(conversationId);
            if (CollectionUtils.isEmpty(chatMessages)) {
                return Collections.emptyList();
            }

            log.debug("Loaded {} history messages for conversation {}", chatMessages.size(), conversationId);
            return chatMessages.stream().filter(Objects::nonNull)
                    .sorted(Comparator.comparing(ChatMessage::createTime))
                    .map(this::convert2Message).
                    filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to load history for conversation: {}", conversationId, e);
            return List.of(); // 降级：当作无历史
        }
    }

    private Message convert2Message(ChatMessage chatMessage) {
        if (Objects.isNull(chatMessage)) {
            return null;
        }

        switch (StringUtils.upperCase(chatMessage.role())) {
            case "USER":
                return new UserMessage(chatMessage.message());
            case "SYSTEM":
                return new SystemMessage(chatMessage.message());
            case "ASSISTANT":
                return new AssistantMessage(chatMessage.message());
            default:
                log.warn("暂不支持的消息类型: " + chatMessage.role());
        }

        return UserMessage.builder().text(chatMessage.message()).build();
    }

    @NotNull
    @Override
    public ChatClientResponse after(ChatClientResponse response, AdvisorChain advisorChain) {
        String conversationId = getConversationId(response.context(), CONVERSATION_ID);
        // 保存 AI 的回复到历史
        List<Message> assistantMessages = Optional.ofNullable(response)
                .map(resp -> response.chatResponse()
                        .getResults()
                        .stream()
                        .map(g -> (Message) g.getOutput())
                        .toList()).orElse(Collections.emptyList());

        messageMapper.saveMessage(conversationId, MessageType.ASSISTANT, assistantMessages);
        return response;
    }

    @Override
    public int getOrder() {
        return 1;
    }
}

```

使用时通过 `advisorSpec.param()` 传入 `conversationId` 即可。



## 总结
这一篇我们完整梳理了 Spring AI 的几个核心基础组件：

| 组件 | 作用 |
| --- | --- |
| `Message` | 对话的最小单元，区分角色（用户/系统/助手/工具） |
| `Prompt` | 多条消息的容器，支持携带模型参数 |
| `ChatModel` | 统一的调用接口，屏蔽底层模型差异，支持同步和流式 |
| `ChatClient` | 流式 API，链式调用，支持实体映射和响应式流 |
| `Advisors` | 拦截器模式，实现记忆、RAG、敏感词过滤等横切功能 |
| `PromptTemplate` | 模板化提示词，避免字符串拼接，提升可维护性 |


**一句话总结**：Spring AI 的设计思路是让 Java 开发者用最熟悉的方式（Spring 风格）去调用大模型，把复杂留给了框架，把简单留给了你。

接下来的文章，我们会深入 **RAG**、 **Function Calling**（工具调用）**&** **MCP 和** **Eval**（评估），真正把 AI 能力融入到业务代码中。欢迎持续关注。

