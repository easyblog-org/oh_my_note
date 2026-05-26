---
title: Spring AI 工具调用进阶：从源码读懂底层机制
date: 2026-05-16T23:30:00.000Z
category: AI 应用开发
tags:
  - 工具调用
  - Tool Calling
  - Function Calling
  - AI 大模型基础
  - Spring AI
  - AI 编排框架
summary: 从源码和底层机制入手，把 Spring AI 工具调用的原理彻底讲清楚。面试官要是问起来，你也能聊上几句。
featured: false
status: published
slug: '334767514760937472'
---

上一篇文章我们动手实现了六个常用工具。今天换个角度，从源码和底层机制入手，把工具调用的原理彻底讲清楚。面试官要是问起来，你也能聊上几句。

其实关于工具调用，掌握核心概念和开发方法就够日常开发用了。但为了帮大家更好理解 Spring AI 的工具调用机制，我还是把一些进阶知识整理了出来。这部分不用死记硬背，了解就行。

## 一、工具底层数据结构
先思考一个问题：AI 怎么知道有哪些工具可以用？每个工具的调用规则又是什么？

Spring AI 工具调用的核心是 `ToolCallback` 接口，它是所有**工具实现的基础**。看一下源码：

```java
public interface ToolCallback {

    /**
     * 工具定义
     */
    ToolDefinition getToolDefinition();

    /**
     * 工具元信息
     */
    default ToolMetadata getToolMetadata() {
        return ToolMetadata.builder().build();
    }

    /**
     * 工具执行
     */
    String call(String toolInput);

    /**
     * Execute tool with the given input and context, and return the result to send back to the AI model.
     */
    default String call(String toolInput, @Nullable ToolContext toolContext) {
        if (toolContext != null && !toolContext.getContext().isEmpty()) {
            throw new UnsupportedOperationException("Tool context is not supported!");
        }
        return call(toolInput);
    }
}
```

### 1.1 ToolDefinition
`ToolDefinition` 是给 AI 模型看的说明书，**告诉模型这个工具是干什么的、需要什么参数**。

手动创建工具定义的示例：

```java
ToolDefinition toolDefinition = ToolDefinition.builder()
    .name("currentWeather")
    .description("Get the weather in location")
    .inputSchema("""
        {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string"
                },
                "unit": {
                    "type": "string",
                    "enum": ["C", "F"]
                }
            },
            "required": ["location", "unit"]
        }
    """)
    .build();
```

这里的 `inputSchema` 遵循 JSON Schema 规范，告诉 AI 参数的类型、取值范围和哪些是必填的。

### 1.2 ToolMetadata
`ToolMetadata` 用于控制工具执行的行为，现阶段最重要的属性是 `returnDirect`，表示工具执行结果是否直接返回给用户，不再经过 AI 模型处理。

```java
ToolMetadata toolMetadata = ToolMetadata.builder()
.returnDirect(true)  // 跳过 AI 二次处理
.build();
```

### 1.3 注解式定义的幕后工作
回到我们上一篇文章的做法：用一个 `@Tool` 注解就把普通 Java 方法变成了 AI 可调用的工具。Spring AI 在背后做了几件事：

1. **扫描 **`**@Tool**`** 注解**：`ToolCallbacks.from(new DateTimeTools())` 会扫描对象中的方法，找出所有带 `@Tool` 注解的方法。
2. **生成 ToolDefinition**：`JsonSchemaGenerator` 解析方法签名和参数上的 `@ToolParam` 注解，自动生成符合 JSON Schema 规范的参数定义。
3. **封装 MethodToolCallback**：把每个带注解的方法包装成 `MethodToolCallback`，使其符合 `ToolCallback` 接口规范。

```java
// ToolCallbacks.from() 的底层逻辑
public static ToolCallback[] from(Object toolObject) {
return Arrays.stream(toolObject.getClass().getDeclaredMethods())
.filter(method -> method.isAnnotationPresent(Tool.class))
.map(method -> MethodToolCallback.builder()
     .toolMethod(method)
     .toolObject(toolObject)
     .build())
.toArray(ToolCallback[]::new);
}
```

这种设计让我们只需关注业务逻辑，不用操心底层通信和参数转换。

## 二、工具上下文（ToolContext）
实际业务中，工具执行往往需要额外的上下文信息，比如当前登录用户、会话 ID、请求追踪 ID 等。Spring AI 通过 `ToolContext` 提供了这个能力。

在调用 AI 时可以传递上下文参数：

```java
String response = chatClient
.prompt("帮我查询用户信息")
.tools(new CustomerTools())
.toolContext(Map.of("userName", "frank"))
.call()
.content();
```

在工具方法里可以通过 `ToolContext` 获取这些参数：

```java
public class CustomerTools {

    @Tool(description = "Retrieve customer information")
    public String getCustomerInfo(Long id, ToolContext context) {
        // 这里我们可以从系统上下文获取到用户登录信息然后传递给工具上下文
        String userName = (String) context.get("userName");   
        // 从数据库查询用户信息
        return customerMapper.findById(id, userName);
    }
}
```

看源码会发现，`ToolContext` 本质上就是一个 `Map`：

```java
public class ToolContext {
    private final Map<String, Object> context;
    // getter/setter...
}
```

它携带的信息**不会传递给 AI 模型**，只在应用程序内部使用。这样做既安全又灵活。

**典型应用场景**：

+ 用户认证：传递用户 token，不暴露给模型
+ 请求追踪：添加 requestId，方便日志排查
+ 自定义配置：根据不同场景传递特定参数

举个例子：假如你做了一个用户自助退款功能，用户跟 AI 说"我要退款"。有了 `ToolContext`，AI 就不用再问"你是谁"、让用户手动输入 ID 了，系统可以从上下文直接拿到 userId，退款操作一步完成。

## 三、立即返回（returnDirect）
有时候，**工具执行的结果不需要再交给 AI 模型处理，而是希望直接返回给用户**。比如生成 PDF、下载文件这类场景。Spring AI 通过 `returnDirect` 属性支持这个功能。

### 3.1 工作流程
正常工具调用流程是：用户问题 → AI → 工具 → AI → 用户。

`returnDirect` 模式改变为：用户问题 → AI → 工具 → 用户。工具执行结果直接返回，不再送回 AI 模型做后续处理。

### 3.2 使用方法
**注解方式**：在 `@Tool` 中设置 `returnDirect = true`

```java
public class DocumentTools {

    @Tool(description = "Generate PDF report", returnDirect = true)
    public String generatePDF(String content) {
        // 生成 PDF 并返回下载链接
        return "https://example.com/report.pdf";
    }
}
```

**编程方式**：手动构造 `ToolMetadata` 对象

```java
ToolMetadata toolMetadata = ToolMetadata.builder()
.returnDirect(true)
.build();

ToolCallback toolCallback = MethodToolCallback.builder()
.toolDefinition(ToolDefinition.builder(method)
                .description("Generate PDF report")
                .build())
.toolMethod(method)
.toolObject(new DocumentTools())
.toolMetadata(toolMetadata)
.build();
```



## 四、工具底层执行原理：ToolCallingManager
Spring AI 的工具调用离不开一个核心组件——`ToolCallingManager`。

### 4.1 核心职责
`ToolCallingManager` 负责整个工具调用的执行流程：

<!-- 这是一张图片，ocr 内容为： TOOLCALLINGMANAGER INTERFACE PUBLIC RESOLVE THE TOOL DEFINITIONS FROM THE MODEL'S TOOL CALLING OPTIONS. 2 IMPLEMENTATIONS LIST<TOOLDEFINITION> RESOLVETOOLDEFINITIONS(TOOLCALLINGCHATOPTIONS CHATOPTIONS); EXECUTE THE TOOL CALLS REQUESTED BY THE MODEL. 2 IMPLEMENTATIONS TOOLEXECUTIONRESULT EXECUTETOOLCALLS(PROMPT PROMPT, CHATRESPONSE CHATRESPONSE); CREATE A DEFAULT TOOLCALLINGMANAGER BUILDER. STATIC DEFAULTTOOLCALLINGMANAGER.BUILDER BUILDER() RETURN DEFAULTTOOLCALLINGMANAGER.BUILDER() -->
![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779807448662-6d8172ef-f50c-456f-928c-f8f3d1dd174e.png)

1. **解析工具定义（resolveToolDefinitions）**：从 `ChatOptions` 中解析出工具定义，确保模型能正确识别和使用工具
2. **执行工具调用（executeToolCalls）**：根据模型响应，执行相应的工具调用，并返回工具的执行结果
3. **构建工具上下文（buildToolContext）**：为工具调用提供上下文信息，包括历史的 Message 记录
4. **管理工具回调**：通过 `ToolCallbackResolver` 解析工具回调，支持动态工具调用

### 4.2 自动配置
如果使用 Spring Boot Starter，Spring AI 会自动配置 `ToolCallingManager`。它会扫描所有 `ToolCallback` 类型的 Bean，注册到工具调用管理器中。

<!-- 这是一张图片，ocr 内容为：TOOLCALLBACK.JAVA TOOLCALLINGAUTOCONFIGURATION.JAVA FILEOPERATIONTOOLTESTJAVAX TOOLCALLINGMANAGER.JAVA FILEOPERATIONTOOL.JAVA TOOLCONTEXT.JAVA 78 @BEAN 79 @CONDITIONALONMISSINGBEAN TOOLEXECUTIONEXCEPTIONPROCESSOR TOOLEXECUTIONEXCEPTIONPROCESSOR[ 80 FALSE) 81 (ALWAYSTHROW: RETURN NEW DEFAULTTOOLEXECUTIONEXCEPTIONPROCESSOR( 子 82 83 @BEAN 84 @CONDITIONALONMISSINGBEAN 85 TOOLCALLINGMANAGER TOOLCALLINGMANAGER(TOOLCALLBACKRESOLVER TOOLCALLBACKRESOLVER 86 TOOLEXECUTIONEXCEPTIONPROCESSOR TOOLEXECUTIONEXCEPTIONPROCESSOR. 87 OBJECTPROVIDER<OBSERVATIONREGISTRY> OBSERVATIONREGISTRY, 88 OBJECTPROVIDER<TOOLCALLINGOBSERVATIONCONVENTION> OBSERVATIONCONVENTION) ( 89 : TOOLCALLINGMANAGER.BUILDER() 90 VAR TOOLCALLINGMANAGER :DEFAULTTOOLCALLINGMANAGER .OBSERVATIONREGISTRY(OBSERVATIONREGISTRY.GETIFUNIQUE(() -) -) OBSERVATIONREGISTRY.NOOP)) .TOOLCALLBACKRESOLVER(TOOLCALLBACKRESOLVER) ,TOOLEXECUTIONEXCEPTIONPROCESSOR(TOOLEXECUTIONEXCEPTIONPROCESSOR) 94 .BUILD(); 95 96 OBSERVATIONCONVENTION.IFAVAILABLE(TOOLCALLINGHANAGER: SETOBSERVATIONCONVENTION); 97 98 RETURN TOOLCALLINGMANAGER; 99 100 @BEAN 101 102 @CONDITIONALONMISSINGBEAN -->
![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779807992405-be465913-953e-48e9-95f0-3f08960fefed.png)

### 4.3 工具调用执行流程
Spring AI 底层执行工具调用的核心流程如下：

<!-- 这是一张图片，ocr 内容为：大模型 CHATCLIENT CALLBACK MANAGER 1注册工具TOOLCALLBACKS.FROM() 发起请求.CALL() 3调用大模型+TOOLDEFFL 4返回TOOL_CALLS[ 5解析匹配工具 本地JAVA方法! 6执行 ?返回结果 [TRUE]直接返回 直接返回 RETURNDIRECT [FALSE]发给AI生成回答 9结果发给AI 10AI生成最终回答 11返回用户 -->
![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779811897861-27d8bff7-cc83-4a8c-86dd-c0a40097bee2.png)

1. **注册工具**：`ToolCallbacks.from(new DateTimeTools())` 把普通 Java 方法包装成 `ToolCallback` 数组
2. **发起请求**：`ChatClient` 接收到用户消息和注册的工具列表
3. **调用模型**：将用户消息和工具定义（`ToolDefinition` 列表）一起发送给大模型。模型分析用户请求，判断需要使用哪个工具，返回工具名称和参数
4. **解析响应**：大模型返回响应，如果响应中包含工具调用请求，解析出工具名称和参数
5. **匹配工具**：`ToolCallingManager` 根据工具名称找到对应的 `ToolCallback`
6. **执行工具**：调用 `ToolCallback.call(toolInput)` 执行业务逻辑。这里要注意，真正执行的是程序中的 Java 方法，不是 AI 服务器自己去执行
7. **处理结果**：
    - 如果工具设置了 `returnDirect = true`，结果直接返回给用户
    - 否则，把执行结果作为新的消息发给 AI 模型，让模型生成最终回答
8. **重复循环**：如果 AI 返回了多个工具调用请求，会依次执行直到所有调用完成

## 五、ToolCallAdvisor：可观测的工具调用
Spring AI 1.1.3 引入了一个重要特性：**递归顾问（Recursive Advisor）**，支持多次循环执行顾问链。其中 `ToolCallAdvisor` 专门用于工具调用场景。

### 5.1 为什么需要 ToolCallAdvisor？
默认情况下，Spring AI 的工具执行是在 `ChatModel` 内部使用 `ToolCallingManager` 完成的。这意味着工具调用请求和响应对于 `ChatClient` Advisor 是不透明的——它发生在 Advisor 执行链之外，你无法拦截和观察。

`ToolCallAdvisor` 解决了这个问题：它把工具调用循环放到 Advisor 链中实现，让其他 Advisor 能够拦截和观察每个工具调用请求和响应。

### 5.2 使用示例
```java
var toolCallAdvisor = ToolCallAdvisor.builder()
.toolCallingManager(toolCallingManager)
.advisorOrder(BaseAdvisor.HIGHEST_PRECEDENCE + 300)
.build();

var weatherTool = FunctionToolCallback.builder("getWeather", (Request request) -> "15.0°C")
.description("Gets the weather for a location")
.inputType(Request.class)
.build();

var chatClient = ChatClient.builder(chatModel)
.defaultToolCallbacks(weatherTool)
.defaultAdvisors(toolCallAdvisor)
.build();

String response = chatClient.prompt()
.user("What's the weather in Paris and Amsterdam?")
.call()
.content();
```



## 六、ToolCallbackResolver：动态工具解析
### 6.1 什么是 ToolCallbackResolver？
前面介绍的工具用法中，工具都是在编译时就确定好的。但有些场景下，工具需要根据运行时情况动态确定——比如从数据库加载用户自定义的工具，或者根据不同租户加载不同工具集。

`ToolCallbackResolver` 就是用来解决这个问题的。它是一个函数式接口，可以在运行时动态解析工具：

```java
@FunctionalInterface
public interface ToolCallbackResolver {
    List<ToolCallback> resolve(Prompt prompt, ToolContext context);
}
```

### 6.2 使用示例
```java
ToolCallbackResolver dynamicResolver = (prompt, context) -> {
    // 根据 prompt 内容或上下文动态决定注册哪些工具
    String userId = (String) context.get("userId");
    List<ToolCallback> tools = loadToolsFromDatabase(userId);
    return tools;
};

String response = ChatClient.create(chatModel)
.prompt("帮我处理我的数据")
.toolCallbackResolver(dynamicResolver)
.call()
.content();
```



## 总结
这篇文章我们深入了 Spring AI 工具调用的底层机制：

| 知识点 | 核心内容 | 源码/组件 |
| --- | --- | --- |
| 数据结构 | `ToolCallback`<br/> 接口 + `ToolDefinition`<br/> + `ToolMetadata` | `MethodToolCallback` |
| 注册原理 | `ToolCallbacks.from()`<br/> 扫描 `@Tool`<br/> 注解，包装成 `ToolCallback` | `ToolCallbacks` |
| 工具上下文 | `ToolContext`<br/> 传递请求级参数，不暴露给 AI | `ToolContext` |
| 立即返回 | `returnDirect`<br/> 让工具结果直接返回，跳过 AI 二次处理 | `ToolMetadata` |
| 执行原理 | `ToolCallingManager`<br/> 统一调度，支持多轮多工具调用 | `ToolCallingManager` |
| 可观测工具调用 | `ToolCallAdvisor`<br/> 在顾问链中实现工具调用循环 | `ToolCallAdvisor` |
| 动态解析 | `ToolCallbackResolver`<br/> 运行时动态决定可用工具 | `ToolCallbackResolver` |


这些内容日常开发不需要天天琢磨，但理解它们能帮你写出更健壮、更灵活的工具调用代码。面试官问起来，你也能说出个一二三。



如果这篇文章对你有帮助，欢迎关注我的公众号 **AutowiredAI**。后续我会继续分享 AI Agent 实战。向量数据库选型、RAG 评估这些内容。后台回复「工具调用」可以拿到本文的完整代码仓库。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779808630671-904c3582-b907-47e5-ae2b-3a545dc87c09.png)

