---
title: Spring AI 工具调用实战：让大模型变成“有手有脚”的智能体
date: 2026-05-16T23:30:00.000Z
category: AI 应用开发
tags:
  - 工具调用
  - Tool Calling
  - Function Calling
  - AI 大模型基础
  - Spring AI
  - AI 编排框架
summary: >-
  从“纸上谈兵”到“真刀真枪”：这篇 Spring AI 工具调用实战，带你把大模型改造成能干活、会办事的智能体。读完它，你就能让 AI
  自己上网查攻略、写文件、出报告，甚至生成 PDF 约会计划。代码即拿即用，省下 3 天调研时间！
featured: true
status: published
slug: '334405400974622720'
---

之前我们通过 RAG 让 AI 能查资料。今天再往前一步：让 AI 能联网搜索、读写文件、下载图片、生成 PDF。这就是工具调用。

这篇文章我会从 Tool Calling 的基本原理讲起，再到 Spring AI 中如何使用工具调用给大模型赋能，最后带你实战，把文件操作、联网搜索、网页抓取、终端操作、资源下载、PDF 生成这六个常用工具全部实现一遍。代码可以直接拿去用。如果你正在做 AI 应用开发，这篇应该能帮你省不少时间。

这篇文章的完整代码仓库在文末，关注公众号 **AutowiredAI** 回复「工具调用」即可获取。

## 一、工具调用介绍
### 1.1 什么是工具调用？
**工具调用（Tool Calling）**可以理解为让 AI 大模型借用外部工具来完成它自己做不到的事情。就像一个人光有凭手脚干不了所有活，但可以用工具箱里的工具来帮忙。

工具可以是任何东西。网页搜索、外部 API 调用、访问数据库、执行特定代码，都算。

举个例子，用户问“帮我查询上海最新的天气”。AI 本身没有实时天气数据，但它可以调用一个“天气查询工具”来完成这个任务。目前主流的大模型和 AI 开发平台基本都支持工具调用，技术已经比较成熟了。

### 1.2 工具调用的原理
工具调用的工作原理其实很简单。**不是 AI 服务器自己去调用工具，也不是把工具代码发给 AI 让它执行**。**AI 只负责提出要求**，说“我需要执行 XX 工具来完成这个任务”。**真正执行工具的是我们自己的应用程序。程序执行完后，再把结果告诉 AI，让 AI 继续往下走**。

下面用一个完整例子来说明。假设用户提问“EasyBlog 网站有哪些热门文章？”

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779702025158-b6937f12-57a5-406b-9198-69fc3d52efa1.png)

图中流程简单总结如下：

1. 用户把问题发给程序。
2. 程序把问题转给大模型。
3. 大模型分析问题，判断需要用到网页抓取工具来获取文章列表。
4. 大模型返回工具名称和参数。比如：使用网页抓取工具，参数 URL = xxxx。
5. 程序收到这个调用请求，执行网页抓取操作。
6. 工具抓取网页，返回文章数据。
7. 程序把抓取结果传回给大模型。
8. 大模型分析网页内容，生成关于 EasyBlog 热门文章的回答。
9. 程序把最终回答返回给用户。

虽然看起来像是 AI 在调用工具，但整个工具调用的过程是由我们的程序控制的。AI 只负责决定什么时候需要用工具、需要传什么参数。真正干活的是程序。



**为什么不让 AI 服务器直接调用工具？**

你可能会好奇：为什么要这么设计？这不是让程序跟 AI 来回沟通好几次吗？为什么不干脆让 AI 服务器直接调用工具？

有这个想法很正常。但你自己想想，如果你来设计一个大模型服务，你就会明白了。很关键的一点是**安全性**。AI 模型永远不应该直接接触你的 API 或系统资源。所有操作都必须通过你的程序来执行，这样你才能完全控制 AI 能做什么、不能做什么。

举个例子，你有一个爆破工具。用户跟 AI 说“我要拆这栋房子”。AI 判断可以用爆破工具，但它不能直接炸，必须经过你的同意才能执行。反过来，如果把爆破工具直接植入给 AI，AI 觉得自己能炸了，直接就炸了，不需要再问你的意见。而且这样也会给 AI 服务器本身增加压力。

### 1.3 Tool Calling vs Function Calling
大家可能看到过 Function Calling (功能调用) 这个概念，别担心，其实它和 Tool Calling (工具调用) 完全是同一概念！只是不同平台或每个人习惯的叫法不同而已。

[SpringAl工具调用文档](https://docs.spring.io/spring-ai/reference/api/tools.html#_quick_start) 的开头就说明了这一点:

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779702802971-30b22204-a802-4fde-a7b3-436100871d1f.png)

### 1.4 工具调用的技术选型
为什么我们需要用框架来实现工具调用？先梳理一下工具调用的完整流程。

1. **工具定义**：程序告诉 AI“你可以使用这些工具”，并描述每个工具的功能和所需参数。
2. **工具选择**：AI 在对话中判断需要用哪个工具，并准备好相应的参数。
3. **返回意图**：AI 返回“我想用 XX 工具，参数是 XX”的信息。
4. **工具执行**：程序收到请求，执行对应的工具操作。
5. **结果返回**：程序把工具执行的结果发回给 AI。
6. **继续对话**：AI 根据工具返回的结果，生成最终回答给用户。

从上面流程可以看到，程序需要和 AI 多次交互，还要能够执行对应的工具。怎么实现呢？当然可以自己从头开发，但更推荐用 Spring AI、LangChain 这类框架。有些大模型服务商也提供了对应的 SDK，都能帮你简化代码编写。

本教程后续部分将以 Spring Al 为例，带大家实战工具调用开发。

需要注意的是，不是所有大模型都支持工具调用。有些基础模型或早期版本可能不支持这个能力。可以在[ Spring Al官方文档](https://docs.spring.io/spring-ai/reference/api/chat/comparison.html#page-title) 中查看各模型支持情况。

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779351804135-cdfa452e-567e-4909-8286-f34d5d6038ac.png)

## 二、Spring AI 工具开发基础
### 2.1 Spring AI 工具调用原理

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779723155178-d905926d-e048-4b1e-be51-b63dc7c663c2.png)

Spring AI 对工具调用的支持贯穿整个交互链路，主要分六个环节：

1. **工具定义与注册**  
通过注解（`@Tool`）自动生成工具定义和 JSON Schema，把普通 Java 方法转换成 AI 可调用的工具。
2. **工具调用请求**  
Spring AI 自动处理与 AI 模型的通信，解析模型返回的工具调用请求，并且支持多个工具链式调用。
3. **工具执行**  
提供统一的工具管理接口，根据 AI 返回的请求自动找到对应的方法，解析参数并执行。开发者只需要专注业务逻辑。
4. **处理工具结果**  
内置结果转换和异常处理机制，支持各种复杂 Java 对象作为返回值，能优雅处理错误情况。
5. **返回结果给模型**  
封装响应结果并管理上下文，确保工具执行结果正确传递给 AI 模型，或者直接返回给用户（取决于流程）。
6. **生成最终响应**  
自动整合工具调用结果到对话上下文中，支持多轮复杂交互，保证 AI 回复的连贯性和准确性。

这个流程对开发者是透明的：从 AI 决定调用工具，到执行工具方法，再到把结果返回给模型，最后模型生成回答，Spring AI 都帮你做好了。你只需要写好工具的业务逻辑。

### 2.2 Spring AI 中定义工具
Spring AI 提供了两种定义工具的模式：**基于 Methods（方法）** 和 **基于 Functions（函数式）**。

在实际开发中，我们主要使用 **Methods 方式**，另一种了解一下就行。原因很简单：Methods 方式更容易编写、更容易理解，支持的参数和返回类型也更多。

两种方式的对比大致如下：

| **特性** | **Methods 方式** | **Functions 方式** |
| --- | --- | --- |
| **定义方式** | 普通 Java 方法 + 注解 | 函数式接口实现 |
| **语法复杂度** | 低 | 中等 |
| **参数类型支持** | 丰富 | 有限 |
| **返回类型支持** | 丰富 | 有限 |
| **代码可读性** | 高 | 一般 |


所以后续示例都采用 Methods 方式。

#### 1. 基于Methoda/注解式（推荐）
用 `@Tool` 注解标记一个普通 Java 方法，Spring AI 就能自动识别它为一个可用工具。每个工具最好都加上清晰的 `description`，帮助 AI 理解什么时候该调用这个方法。参数可以用 `@ToolParam` 描述含义和是否必填。

```java
public class WeatherTool {

    @Tool(description = "获取指定城市的当前天气情况")
    public String getWeather(@ToolParam(description = "城市名称", required = true) String city) {
        // 实际开发中调用天气 API
        return city + " 天气晴，气温25℃";
    }
}
```

#### 2. **基于 Functions/**编程式
如果你想在运行时动态创建工具，可以选择编程式定义，更灵活。

先定义一个普通的工具类（不加注解）：

```java
public class WeatherTool {
    public String getWeather(String city) {
        return city + " 天气晴，气温25℃";
    }
}
```

然后用 `MethodToolCallback` 把它包装成 `ToolCallback`：

```java
Method method = ReflectionUtils.findMethod(WeatherTool.class, "getWeather", String.class);
ToolCallback toolCallback = MethodToolCallback.builder()
.toolDefinition(ToolDefinition.builder(method)
                .description("获取指定城市的当前天气情况")
                .build())
.toolMethod(method)
.toolObject(new WeatherTool())
.build();
```

你会发现，编程式其实就是把注解里的那些参数，改成通过 Builder 方法手动设置而已。

> **注意**：工具方法的参数和返回值类型选择有讲究。Spring AI 支持大多数常见 Java 类型（基本类型、复杂对象、集合等），但**返回值必须是可序列化的**，因为要通过网络发给 AI 模型。  
目前不支持的类型包括：
>
> + `Optional`
> + 异步类型（`CompletableFuture`、`Future`）
> + 响应式类型（`Flow`、`Mono`、`Flux`）
> + 函数式类型（`Function`、`Supplier`、`Consumer`）
>

### 2.3 Spring AI 中使用工具
定义好工具后，Spring AI 提供了多种方式把工具提供给 `ChatClient`，让 AI 能在需要时调用。

#### 1. 按需使用（最常用）
直接在构建请求时通过 `.tools()` 附加工具。适合只在特定对话中使用某些工具的场景。

```java
String response = ChatClient.create(chatModel)
.prompt("北京今天天气怎么样？")
.tools(new WeatherTool())
.call()
.content();
```

#### 2. 全局使用
如果某些工具需要在所有对话中都可用，可以在构建 `ChatClient` 时注册默认工具。这样同一个客户端发起的所有对话都能使用这些工具。

```java
ChatClient chatClient = ChatClient.builder(chatModel)
.defaultTools(new WeatherTool(), new TimeTool())
.build();
```

#### 3. 更底层的使用方式（绑定到 ChatModel）
除了给 `ChatClient` 绑定工具，你也可以直接绑定到更底层的 `ChatModel`。适合需要更精细控制的场景。

```java
ToolCallback[] weatherTools = ToolCallbacks.from(new WeatherTool());
ChatOptions chatOptions = ToolCallingChatOptions.builder()
.toolCallbacks(weatherTools)
.build();
Prompt prompt = new Prompt("北京今天天气怎么样？", chatOptions);
chatModel.call(prompt);
```

#### 4. 动态解析工具
一般情况下，前面三种方式就够用了。对于更复杂的应用，Spring AI 还支持通过 `ToolCallbackResolver` 在运行时动态解析工具。例如，根据对话上下文从数据库中查找要调用的工具。这部分属于进阶特性，后面会单独介绍，这里先了解有这个概念就行。感兴趣的话可以阅读我的另一篇文章：[《Spring AI 工具使用进阶》](https://localhost:8080)

### 2.4 工具生态
工具的本质就是一种插件。能复用别人的成果，就尽量别自己从头写。

[Spring AI Alibaba 官方文档](https://java2ai.com/integration/toolcalls/tool-calls#%E6%94%AF%E6%8C%81%E7%9A%84%E6%89%A9%E5%B1%95%E5%AE%9E%E7%8E%B0) 里提到了少量社区插件。但其实我们可以顺藤摸瓜，在 [Spring AI Ablibaba GitHub 主页](https://github.com/chicky/spring-ai-alibaba/tree/48c45d4d8eb4e19b07c2ef53c2815d131193e5e7/community/tool-calls)上找到官方提供的更多工具源码，里面包含了大量实用的工具：翻译、网页搜索、网页爬虫、地图工具等等。花点时间翻一翻，很可能你需要的工具已经有人实现好了。

关于主流工具（文件操作、联网搜索、网页抓取等）的具体实现代码，我们将在下一节详细展开。

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779723816476-f53aa293-9eca-4e09-8247-c423e6fc5526.png)

## 三、六个常用工具实战
下面我们来逐一实现需求分析里提到的六个工具。所有工具类放在 `tools` 包下。

### 3.1 文件操作工具
```java
/**
 * 文件操作工具类
 *
 */
public class FileOperationTool {

    // 定义文件操作的根目录
    private final String FILE_ROOT = FileUtils.FILE_SAVE_DIR + "/file";

    @Tool(description = "Read content from a file")
    public String readFile(@ToolParam(description = "Name of file to read", required = true) String fileName) {
        String filePath = FILE_ROOT + "/" + fileName;
        try {
            return FileUtil.readUtf8String(filePath);
        } catch (Exception e) {
            return "Error reading file: " + e.getMessage();
        }
    }

    @Tool(description = "Write content to a file")
    public String writeFile(@ToolParam(description = "Name of file to write", required = true) String fileName,
                            @ToolParam(description = "Content to write to the file", required = true) String content) {
        String filePath = FILE_ROOT + "/" + fileName;
        try {

            FileUtil.mkdir(FILE_ROOT);
            FileUtil.writeUtf8String(content, filePath);
            return "File written successfully to: " + filePath;
        } catch (Exception e) {
            return "Error writing to file: " + e.getMessage();
        }
    }

}

```

### 3.2 联网搜索工具
这里以调用第三方搜索 API（例如 [SearchAPI](https://www.searchapi.io/) 或自建搜索引擎）为例。

```java
/**
 * 网页搜索工具
 */
public class WebSearchTool {

    // SearchAPI 的搜索接口地址
    private static final String SEARCH_API_URL = "https://www.searchapi.io/api/v1/search";

    private final String apiKey;

    public WebSearchTool(String apiKey) {
        this.apiKey = apiKey;
    }

    @Tool(description = "Search for information from Baidu Search Engine")
    public String searchWeb(
            @ToolParam(description = "Search query keyword") String query) {
        Map<String, Object> paramMap = new HashMap<>();
        paramMap.put("q", query);
        paramMap.put("api_key", apiKey);
        paramMap.put("engine", "baidu");
        try {
            String response = HttpUtil.get(SEARCH_API_URL, paramMap);
            // 取出返回结果的前 5 条
            JSONObject jsonObject = JSONUtil.parseObj(response);
            // 提取 organic_results 部分
            JSONArray organicResults = jsonObject.getJSONArray("organic_results");
            List<Object> objects = organicResults.subList(0, 5);
            // 拼接搜索结果为字符串
            String result = objects.stream().map(obj -> {
                JSONObject tmpJSONObject = (JSONObject) obj;
                return tmpJSONObject.toString();
            }).collect(Collectors.joining(","));
            return result;
        } catch (Exception e) {
            return "Error searching Baidu: " + e.getMessage();
        }
    }
}

```

### 3.3 网页抓取工具
使用 Jsoup 抓取网页内容。

```java
/**
 * 网页抓取工具
 */
public class WebScrapingTool {

    @Tool(description = "Scrape the content of a web page")
    public String scrapeWebPage(@ToolParam(description = "URL of the web page to scrape") String url) {
        try {
            Document document = Jsoup.connect(url).get();
            return document.html();
        } catch (Exception e) {
            return "Error scraping web page: " + e.getMessage();
        }
    }
}

```

### 3.4 终端操作工具
执行本地命令（注意安全限制）。

```java
/**
 * 终端操作工具
 */
public class TerminalOperationTool {

    @Tool(description = "Execute a command in the terminal")
    public String executeTerminalCommand(@ToolParam(description = "Command to execute in the terminal") String command) {
        StringBuilder output = new StringBuilder();
        try {
            Process process = Runtime.getRuntime().exec(command);
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                output.append("Command execution failed with exit code: ").append(exitCode);
            }
        } catch (IOException | InterruptedException e) {
            output.append("Error executing command: ").append(e.getMessage());
        }
        return output.toString();
    }
}

```

### 3.5 资源下载工具
下载图片、音频等文件。

```java
/**
 * 资源下载工具
 */
public class ResourceDownloadTool {

    @Tool(description = "Download a resource from a given URL")
    public String downloadResource(@ToolParam(description = "URL of the resource to download") String url, @ToolParam(description = "Name of the file to save the downloaded resource") String fileName) {
        String fileDir = FileUtils.FILE_SAVE_DIR + "/download";
        String filePath = fileDir + "/" + fileName;
        try {
            // 创建目录
            FileUtil.mkdir(fileDir);
            // 使用 Hutool 的 downloadFile 方法下载资源
            HttpUtil.downloadFile(url, new File(filePath));
            return "Resource downloaded successfully to: " + filePath;
        } catch (Exception e) {
            return "Error downloading resource: " + e.getMessage();
        }
    }
}

```

### 3.6 PDF 生成工具
使用 iText 或 Apache PDFBox 生成 PDF。

```java
import cn.hutool.core.io.FileUtil;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import tech.xinxinnote.superagent.util.FileUtils;

import java.io.IOException;
import java.nio.file.Paths;

/**
 * PDF 生成工具
 */
public class PDFGenerationTool {

    @Tool(description = "Generate a PDF file with given content", returnDirect = false)
    public String generatePDF(
            @ToolParam(description = "Name of the file to save the generated PDF") String fileName,
            @ToolParam(description = "Content to be included in the PDF") String content) {
        String fileDir = FileUtils.FILE_SAVE_DIR + "/pdf";
        String filePath = fileDir + "/" + fileName;
        try {
            // 创建目录
            FileUtil.mkdir(fileDir);
            // 创建 PdfWriter 和 PdfDocument 对象
            try (PdfWriter writer = new PdfWriter(filePath);
                 PdfDocument pdf = new PdfDocument(writer);
                 Document document = new Document(pdf)) {
                // 自定义字体（需要人工下载字体文件到特定目录）
                String fontPath = Paths.get("src/main/resources/fonts/SourceHanSansSC-Medium.otf")
                        .toAbsolutePath().toString();
                PdfFont font = PdfFontFactory.createFont(fontPath, "Identity-H", PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED);
                // 使用内置中文字体
                //PdfFont font = PdfFontFactory.createFont("STSongStd-Light", "Identity-H");
                document.setFont(font);
                // 创建段落
                Paragraph paragraph = new Paragraph(content);
                // 添加段落并关闭文档
                document.add(paragraph);
            }
            return "PDF generated successfully to: " + filePath;
        } catch (IOException e) {
            return "Error generating PDF: " + e.getMessage();
        }
    }
}

```



## 总结
通过 Spring AI 的工具调用，我们可以把大模型从一个“只会说话的专家”升级成“会干活的智能体”。本文实现的六个工具只是抛砖引玉，懂原理后你完全可以扩展出更多：发邮件、调第三方 API、操作数据库、发送微信通知……**只要你能写出来的Java方法，都能变成 AI 的工具**。

**关于工具定义的几点建议**：

+ 描述要清晰具体，AI 靠它判断什么时候调用
+ 描述最好使用英文，大多数大模型对英文的理解能力比中文好 

> 2026 年 1 月，一篇发表在 **arXiv** 上的学术论文[《Lost in Execution》](https://ar5iv.labs.arxiv.org/html/2601.05366)首次系统评估了大模型在多语言场景下的工具调用表现。研究团队提出了 MLCL 基准测试，在英语、中文、印地语、 韩语等几种语言上进行了大规模评测。论文的核心发现是：**参数值语言不匹配是最主要的失败模式**——模型能正确理解用户意图、选对工具，但在生成参数值时会把用户提示中的非英语内容直接复制进去。比如用户用中文问“查询上海的天气”，模型选对了天气工具，但生成的参数值却是中文“上海”，而工具接口期待的是英文“Shanghai”。这种不匹配导致调用失败，但错误原因并非模型不懂用户意思，而是语言边界上的执行失败。论文还发现，即使引入翻译后处理的优化策略，模型依然无法完全恢复到英语水平的执行表现。
>
> 另外，在软件工程任务 SWE-bench Lite 上的实证研究也表明，用中文写提示的成功率普遍低于用英文，且这种差异在各个模型上都存在。多个基准测试中，中文表现也普遍滞后于英文，这个现象和模型在工具调用上的“参数值语言不匹配”本质上是一回事——同一组能力用不同语言表达时，实际执行效果并不等价。
>
> 综合来看，工具描述和参数值统一用英文，是目前实践中最稳妥的选择
>

+ 返回值尽量用 String，把结果说清楚
+ 参数要标注是否必填，缺了参数 AI 会提醒用户补充



---

如果你觉得这篇文章对你有帮助，欢迎关注我的公众号 **AutowiredAI**。后台回复「工具调用」可以拿到本文的完整代码仓库。后续我还会继续写关于工具调用高级特性（动态工具解析、工具链编排）的内容。

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1779725780737-935c77ab-19d2-4071-88cb-461ec9eb3f83.png)

