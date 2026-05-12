---
title: 别再手写API文档了！试试 SpringBoot3 + Knife4j，轻松生成OpenAPI3文档
date: 2026-05-12
category: 技术分享
tags: [Spring Boot 3, Knife4j, OpenAPI3]
summary: SpringBoot3 + Knife4j，轻松生成OpenAPI3文档
featured: false
status: published
---


作为一名后端程序员，你有没有经历过这样的场景：

> 凌晨两点，前端同事在群里@你：“这个接口返回的字段到底是字符串还是数字？文档里没写清楚啊。”
>

于是你翻开三个月前写的Yapi文档，发现早就过时了。没办法，只能忍着困意重新整理了一份，然后把文档链接发到群里。第二天下午，前端又发来消息：“接口改了，文档更新了吗？”

你叹了口气，心想：有没有一种方式，可以在改代码的同时，文档自动跟着更新？

**有的。答案就是 Knife4j。**

今天这篇文章，我会带你从头到尾，在 Spring Boot 3 项目中集成 Knife4j，实现一句话：**代码即文档**。文末附完整代码示例。

## 一、为什么要用 Knife4j？Swagger 不够香吗？
先简单介绍一下。**Swagger** 是一个 RESTful API 文档生成工具，通过代码里的注解自动生成在线接口文档。**Knife4j** 是 Swagger 的增强版，前身叫 `swagger-bootstrap-ui`，名字取自“匕首”，寓意**小巧、轻量、功能强悍**，提供更现代化的 UI、分组展示、在线调试、离线文档下载等实用功能。

Spring Boot 3 是一个重大升级，把底层的 `javax` 包迁移到了 `jakarta` 包，所以老版本的 Swagger 在 Spring Boot 3 上会启动失败。因此，选用原生支持 Jakarta EE 规范的 Knife4j Jakarta 版本是必经之路。

Knife4j 的实际价值：你只需在代码里加上几个注解（`@Tag` 给接口分类，`@Operation` 描述接口用途，`@Parameter` 说明参数），它就能自动生成实时、准确、可交互的在线文档：

+ **前端同事**可以直接在线调试，不用再反复问“这个字段是干嘛的”
+ **测试同学**天然获得一份接口测试清单
+ **你自己**也省掉了手动维护文档的烦恼

**Knife4j官网**：[https://doc.xiaominfo.com/](https://doc.xiaominfo.com/)

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778565324953-6c8661a6-765a-4777-9ddb-783eb339ee86.png)

## 二、环境准备
+ **JDK 17+**（Spring Boot 3.x 要求 JDK 17 或更高版本）
+ **Spring Boot 3.x**（本文使用 3.4.5）
+ **Knife4j**：本文使用 4.5.0（Jakarta 版本）

> 💡 **Knife4j 版本怎么选？** 建议先查看 [官方文档的版本参考](https://doc.xiaominfo.com/docs/quick-start/start-knife4j-version)，了解不同 Spring Boot 版本对应的 Knife4j 版本兼容性。然后再去 Maven 中央仓库搜索 `knife4j-openapi3-jakarta-spring-boot-starter` 确认最新版本号。
>



## 三、整合步骤
### 3.1 引入依赖
创建一个 Spring Boot 3.x 项目，然后在 `pom.xml` 中加入以下依赖：

```xml
<dependencies>
  <!-- Spring Boot Web 依赖 -->
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>

  <!-- Knife4j OpenAPI3 Jakarta 依赖 - 适配 Spring Boot 3.x -->
  <dependency>
    <groupId>com.github.xiaoymin</groupId>
    <artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId>
    <version>4.5.0</version>
  </dependency>
</dependencies>
```

**为什么是这个 starter？**

`knife4j-openapi3-jakarta-spring-boot-starter` 是一个“全家桶”依赖，它同时引入了 **SpringDoc OpenAPI**（Swagger 在 OpenAPI 3.0 时代的官方实现）和 **Knife4j **的 UI 界面，无需再单独引入其他 Swagger 依赖。

### 3.2 添加YAML 配置（核心）
在 `application.yml` 中，只需简单配置就能完成 API 文档的基本信息、分组、开关等。**无需编写任何 Java 配置类**。

```yaml
# application.yml
spring:
  application:
    name: knife4j-demo

# Knife4j 配置
knife4j:
  enable: true                      # 开启 Knife4j 增强功能
  setting:
    language: zh_CN                # 中文界面
    enableSwaggerModels: true      # 显示 Swagger Model

# SpringDoc 配置
springdoc:
  api-docs:
    enabled: true                  # 开启 API 文档接口
    path: /v3/api-docs            # 文档接口路径（默认）
  swagger-ui:
    enabled: true                  # 开启 Swagger UI 界面
    path: /swagger-ui.html        # UI 路径（Knife4j 会用 /doc.html 覆盖）
  # 接口分组配置（按路径匹配）
  group-configs:
    - group: 'default'
      paths-to-match: '/**'
      packages-to-scan: com.example.demo.controller   # 配置controller根目录
  # 全局参数配置（可选，例如添加统一请求头）
  # global-request-parameters:
  #   - name: "X-Token"
  #     in: header
  #     description: "认证令牌"
  #     required: false
```

**重点说明**：

+ `springdoc.api-docs` 和 `springdoc.swagger-ui` 一般使用默认配置即可。
+ `springdoc.group-configs` 可以实现接口分组，按 `paths-to-match` 规则将不同路径的接口归入不同分组。
+ 后续如果要调整文档信息，只需修改 YAML 文件，无需改动 Java 代码。

### 3.3 写一个示例接口并加上注解
为了测试文档效果，需要写几个带注解的接口。注解规范使用 OpenAPI 3 标准注解。

**实体类：**

```java
package com.example.demo.entity;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "用户实体")    //使用Schema
public class User {

    @Schema(description = "用户ID", example = "1")
    private Long id;

    @Schema(description = "用户名", example = "autowiredai")
    private String username;

    @Schema(description = "邮箱", example = "autowiredai@example.com")
    private String email;

    @Schema(description = "年龄", example = "25")
    private Integer age;
}
```

**Controller：**

```java
package com.example.demo.controller;

import com.example.demo.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@Tag(name = "用户管理", description = "用户的增删改查接口")
public class UserController {

    private final List<User> userList = new ArrayList<>();

    @PostMapping
    @Operation(summary = "创建用户", description = "创建一个新用户")
    public User createUser(@RequestBody User user) {
        user.setId((long) (userList.size() + 1));
        userList.add(user);
        return user;
    }

    @GetMapping("/{id}")
    @Operation(summary = "根据ID查询用户", description = "通过用户ID获取用户详细信息")
    public User getUserById(
        @Parameter(description = "用户ID", example = "1")
        @PathVariable Long id) {
        return userList.stream()
        .filter(user -> user.getId().equals(id))
        .findFirst()
        .orElse(null);
    }

    @GetMapping
    @Operation(summary = "查询所有用户", description = "获取用户列表")
    public List<User> getAllUsers() {
        return userList;
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新用户", description = "根据ID更新用户信息")
    public User updateUser(
        @Parameter(description = "用户ID", example = "1")
        @PathVariable Long id,
        @RequestBody User user) {
        for (int i = 0; i < userList.size(); i++) {
            if (userList.get(i).getId().equals(id)) {
                user.setId(id);
                userList.set(i, user);
                return user;
            }
        }
        return null;
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除用户", description = "根据ID删除用户")
    public String deleteUser(
        @Parameter(description = "用户ID", example = "1")
        @PathVariable Long id) {
        userList.removeIf(user -> user.getId().equals(id));
        return "删除成功";
    }
}
```

启动项目，访问** **`http://localhost:8080/doc.html`，你会看到漂亮的文档界面，并且已经根据 YAML 中的分组配置，展示出“用户端接口”和“管理端接口”两个标签。点击“调试”按钮可以直接在线测试接口。

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778568984357-6bf9c4a6-642b-4693-9b96-e35e262babd5.png)

## 四、进阶：使用 Java 代码配置（可选）
YAML 配置足以满足大部分场景。但如果你需要**更灵活的控制**（例如根据环境动态注册分组、配置复杂的 OAuth2 安全方案、或者自定义分组规则），可以使用 Java 代码配置。

下面是一个完整的代码配置示例，实现了与上面 YAML 配置完全相同的效果（文档信息 + 两个分组）。你可以根据需要复制到项目中。

### 4.1 创建配置类
```java
package com.example.demo.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class Knife4jConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
        .info(new Info()
              .title("Knife4j Demo API 接口文档")
              .description("Spring Boot 3 + Knife4j 示例项目")
              .version("1.0.0"));
    }

    @Bean
    public GroupedOpenApi userApi() {
        return GroupedOpenApi.builder()
        .group("default")
        .pathsToMatch("/**")
        .packagesToScan("com.example.demo.controller")  //指定扫描路径
        .build();
    }
}
```

### 4.2 补充静态资源映射（可选）
如果项目中没有自定义拦截器，通常不需要额外配置。但如果你有拦截器或自定义 WebMvc 配置，可能需要手动放行 Knife4j 的资源路径：

```java
package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/doc.html")
        .addResourceLocations("classpath:/META-INF/resources/");
        registry.addResourceHandler("/webjars/**")
        .addResourceLocations("classpath:/META-INF/resources/webjars/");
    }
}
```

**提示**：Knife4j 的 starter 已经自带了大部分资源映射，上述配置仅在项目有自定义 `WebMvcConfigurer` 且覆盖了默认资源处理时才需要。

### 4.3 代码配置 vs YAML 配置如何选择？
| 场景 | 推荐方式 |
| --- | --- |
| 基础文档信息 + 简单的按路径分组 | **YAML**（更轻量） |
| 需要动态根据环境条件注册分组（如开发环境多一个测试分组） | **代码** |
| 需要配置复杂的 OAuth2 / API Key 安全方案 | **代码** |
| 接口数量庞大，需要自定义分组规则（如按注解、按自定义函数） | **代码** |
| 项目规范要求配置与代码分离（12-Factor） | **YAML** |


两种方式可以共存——YAML 配置基础信息，代码配置高级特性，互不冲突。



## 五、最佳实践
### 5.1 排除拦截器路径
如果你的项目配置了 Spring MVC 拦截器，不要忘记排除 Knife4j 相关的路径：

```java
@Override
public void addInterceptors(InterceptorRegistry registry) {
registry.addInterceptor(loginInterceptor)
.excludePathPatterns(
    "/doc.html",
    "/doc.html/**",
    "/swagger-resources/**",
    "/webjars/**",
    "/v3/api-docs/**",
    "/swagger-ui/**"
)
.addPathPatterns("/**");
}
```

### 5.2 生产环境关闭 Knife4j
接口文档不应该暴露到生产环境。在 `application.yml` 中配置关闭：

```yaml
springdoc:
  api-docs:
    enabled: false  # 关闭 API 文档接口
  swagger-ui:
    enabled: false  # 关闭 UI 界面
```

**更好的做法**：利用 Spring Boot 的多环境配置文件，只在 `application-dev.yml` 和 `application-test.yml` 中开启，`application-prod.yml` 中关闭。

### 5.3 常用注解速查
| 注解 | 用途 | 替代的旧版注解 |
| --- | --- | --- |
| `@Tag` | 标注 Controller 模块名 | `@Api` |
| `@Operation` | 标注方法/接口描述 | `@ApiOperation` |
| `@Parameter` | 标注参数说明 | `@ApiParam` |
| `@Schema` | 标注实体类字段说明 | `@ApiModelProperty` |
| `@Hidden` | 隐藏接口/参数 | `@ApiIgnore` |


所有注解来自 `io.swagger.v3.oas.annotations` 包。

## 六、总结
通过这篇文章，你已经学会了**Knife4j核心心法：Knife4j 不是让你多写代码，而是让你的代码本身就是文档。**

写一个接口加几个注解，文档自动生成。接口改了，重启一下服务，文档自动更新。

你可以把这篇文章收藏起来，等下次前后端同学来找你对接口的时候，直接甩一个 `doc.html` 链接过去。

**动手试一试吧！**

1. 创建一个 Spring Boot 3.x 项目
2. 按照上面的步骤引入依赖和配置
3. 写两个测试接口，加上注解
4. 访问 `http://localhost:8080/doc.html` 查看效果

如果在配置过程中遇到任何问题，欢迎在评论区留言，我会第一时间回复。

本文基于 Spring Boot 3.4.5 + Knife4j 4.5.0 编写，操作界面以实际版本为准，但核心步骤通用。完整的示例代码可以在我的 GitHub 仓库中找到（后续补链接）。

**下篇预告**：《Knife4j 高级玩法：接口分组 + 全局参数配置》

