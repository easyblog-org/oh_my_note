---
title: Draw.io 官方 SKILL 实测：AI 自动生成架构图，丝滑到离谱
date: 2026-05-14T17:00:00.000Z
category: AI 提效
tags:
  - AI 提效
  - drawio-skill
  - AI 生成架构图
summary: 实测Draw.io官方SKILL，通过自然语言描述即可让AI自动生成架构图，支持macOS/Windows/Linux跨平台。生成的.drawio原生格式文件可直接在桌面版中精修，支持多轮迭代优化。AI完成70%结构工作，大幅提升绘图效率，是开发者绘制技术图表的高效工具。
featured: true
status: published
slug: '330294736802803712'
---

你有没有遇到过这种场景：让AI帮你画一张架构图，它给你一段Mermaid代码，复制到编辑器里渲染出来，布局和想象的不太一样。想微调？只能回头改代码重新生成，来回折腾好几轮。

用Mermaid这类代码生成的方式画图有它的局限——**修改门槛高**。你不知道该怎么调整代码才能让某个框往左挪一点，或者某个箭头换个颜色。

今天给大家分享一个效率神器——draw.io官方推出的AI绘图SKILL，能让你用自然语言描述直接生成专业架构图。先看效果：

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778724648367-c0689aa9-3fbe-4978-b295-98f6415bbe4c.png)

甚至你可以给AI参考图，可以让AI参考你给他的图片绘制相似风格技术图：

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778724708425-1272b57c-d96b-45b3-badc-0eb949c20a6e.png)

你还可以让AI帮你改形状、颜色、线条——任何格式都行。  
虽然AI第一次画的图可能不完美（这跟你给的提示词质量有关），但最大的好处是：**AI帮你完成70%的结构，剩下的30%你自己来微调**。双击打开，直接在[draw.io](https://draw.io/)里拖拽修改，比从零开始画一张图省力太多了。

> 本文实测环境为 **macOS + TRAE**，其他系统和 Agent 平台操作思路类似，可类比迁移。

## 一、安装drawio（支持mac/win/Linux系统）
所有图表导出都依赖 draw.io 桌面版的原生 CLI，安装非常简单。

- **macOS**：如果已安装 Homebrew，可以直接在终端执行：  
  `brew install --cask drawio`  
  安装后运行 `drawio --version` 检查版本号。

- **Windows**：前往 [GitHub releases](https://github.com/jgraph/drawio-desktop/releases) 或 [官网](https://www.drawio.com/) 下载 `.exe` 或 `.msi` 文件，按提示安装。  
  安装后可用类似命令测试（根据实际安装路径调整）：  
  `"C:\Program Files\draw.io\draw.io.exe" --version`

- **Linux / Ubuntu**：需要先安装 `xvfb` 实现无界面导出：  
  `sudo apt install xvfb`  
  然后运行 `xvfb-run -a drawio --version` 查看版本。

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778735622837-c64dbd2e-8f8b-4471-9908-30f20418cc2d.png)


## 二、**安装drawio-skill（支持多个Agent平台）**
drawio-skill采用纯 `SKILL.md` 格式，不依赖任何 MCP 服务、Node.js 运行时或浏览器插件，因此可以在多个 Agent 编程平台中使用。官方Skill可以在GitHub上找到：

```shell
https://github.com/jgraph/drawio-mcp/blob/main/skill-cli/drawio/SKILL.md
```

可以将这个`SKILL.md`文件下载到本地，然后导入到Trae客户端中。不同客户端的导入方式略有差异。

**以Trae为例**：Trae支持将文件夹导入为Skill。你需要将`drawio-cli`文件夹（包含SKILL.md和相关资源）打包成**zip压缩包**，或者直接将文件夹放到` ~/.agents/skills`目录下。具体操作请参考Trae的官方文档。

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778744403364-a058568c-ea2d-42b4-abe4-40467a73837f.png)


---
📢 **闭坑提示！**

官方 SKILL 把 XML 语法参考写成了一个在线链接，每次调用都需要联网去读这个XML reference文件。而且这个链接对无法“科学”上网的用户很不友好：

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778747814816-8b7c6c19-418a-44f8-8c4a-93906dc1b757.png)

**解决方案**：把 XML 参考文件下载到本地。目录结构如下：

```shell
drawio-cli
│  SKILL.md
│  
└─reference
        xml-reference.md
```

然后在 `SKILL.md` 中把引用地址改为本地路径：

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778747989517-0187fc58-1539-461e-9fd2-ca9df7983eb6.png)

## 三、在Trae中实战**drawio-skill**
安装完成后，使用方式非常简单——不需要学习任何 DSL，直接描述你的需求即可。例如：

```markdown
画一个微服务电商架构图，包含 Mobile/Web/Admin 客户端，API Gateway（含认证+限流+路由），
Auth/User/Order/Product/Payment 微服务，Kafka 消息队列，Notification 服务，
以及各自独立的数据库和 Redis 缓存
```

AI 会自动完成以下流程：

+ **依赖检查**：确认 draw.io CLI 可用
+ **图表规划**：分析组件关系，确定使用架构图预设
+ **生成 XML**：按规范生成 `.drawio` 文件
+ **导出草稿**：生成 PNG 供自检
+ **自检修复**：检查连线、对齐、标签等问题
+ **用户确认**：展示图片，询问是否满意
+ **迭代优化**：根据反馈定向编辑（最多 5 轮）
+ **最终导出**：输出 PNG/SVG/PDF，自动打开 draw.io 桌面版供精修

**输出示例**

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778745338437-4e3c0100-adc1-4963-a4f5-aa2417dc2bae.png)

对于这一版生成效果，如果觉得线条粗细不统一，可以让 AI 统一调整粗细，并且要求线条不要穿过组件：

![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778747138058-b0879134-ee6a-4d43-b12e-d85c600a0407.png)



第二次修改之后结果如下：


![](https://cdn.nlark.com/yuque/0/2026/png/28248978/1778747168451-24f3b776-1c17-4cad-b76c-46f399ac93cf.png)

可以看到，生成的架构图质量明显提升，更加清晰美观，但线条穿过组件的问题依然存在。实际操作中你可以继续让 AI 调整，这里篇幅原因就不做更多演示了。



## 总结
总的来说，利用 **Agent 平台 + drawio-skill** 生成各种技术图目前已经具备可用性。AI 生成的图表不仅逻辑清晰，而且配色专业、布局对称、连线之间无交叉。比如微服务分层排列，Kafka 消息队列用黄色高亮，数据库用圆柱形图标，Redis 用缓存专属样式——这一切都遵循预设规范，无需人工干预。

强烈推荐大家上手一试，让绘图这件事也变得“丝滑到离谱”。



