# OhMyNote 工程化改造需求文档

> **版本**: v1.0  
> **技术栈**: Next.js + TailwindCSS + Octokit (GitHub API SDK)  
> **部署平台**: Vercel

---

## 1. 项目背景与目标

### 1.1 当前痛点
- 每次发布笔记需要打开 IDE，手动编写 Markdown 文件后 `git push` 到 GitHub 仓库
- 没有预览能力，写完才能看到效果
- 依赖本地 Node.js 环境运行 `init-meta`、`sync-to-mongo` 、 `clean-html-tags`等脚本
- 操作链路长、门槛高，不适合移动端或轻量快速发布场景

### 1.2 改进目标
将 oh_my_note 从「纯脚本 + 本地编辑」模式升级为**在线化管理平台**，提供 Web UI 进行笔记的撰写、预览、发布全流程操作，并保持与现有 GitHub 仓库 + MongoDB 同步机制兼容。

---

## 2. 功能需求拆解

### 2.1 用户认证模块

**目标**: 确保只有仓库拥有者/授权用户才能操作

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| AUTH-01 | 使用 Vercel 环境变量存储 GitHub Personal Access Token，无需前端登录页面 | P0 |
| AUTH-02 | 所有 API 路由通过服务端校验 Token，前端不暴露 Token | P0 |
| AUTH-03 | 支持简单的访问密码保护（可选，通过环境变量配置），防止公开页面被随意访问 | P1 |

**技术实现**:
- GitHub PAT 存储在 `GITHUB_TOKEN` 环境变量中（Vercel Environment Variables）
- Next.js API Routes 在服务端使用 Octokit 实例化，Token 不出现在客户端代码中
- 可选：通过 `ACCESS_PASSWORD` 环境变量实现简单的页面访问锁

---

### 2.2 文章列表与浏览模块

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| LIST-01 | 从 GitHub 仓库 `content/articles/` 目录拉取所有 `.md` 文件列表 | P0 |
| LIST-02 | 解析每篇文章的 Frontmatter（title, date, category, tags, summary, featured, status） | P0 |
| LIST-03 | 列表页面展示：标题、日期、分类、标签、状态（published/draft） | P0 |
| LIST-04 | 支持按状态筛选（全部 / 已发布 / 草稿） | P1 |
| LIST-05 | 支持按分类或标签筛选 | P2 |
| LIST-06 | 文章卡片点击进入预览/编辑页面 | P0 |
| LIST-07 | 列表页支持分页或无限滚动（文章数量 >20 时） | P2 |

**技术实现**:
- 通过 `octokit.rest.repos.getContent()` 获取 `content/articles/` 目录文件列表
- 使用 `gray-matter` 解析每个文件的 Frontmatter
- 使用 ISR（Incremental Static Regeneration）缓存列表数据，减少 GitHub API 调用

---

### 2.3 文章预览模块（Markdown 渲染）

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| PREV-01 | 支持 GitHub Flavored Markdown (GFM) 渲染 | P0 |
| PREV-02 | 代码块语法高亮（支持 Java、Python、JavaScript、YAML、SQL 等常见语言） | P0 |
| PREV-03 | 支持表格、任务列表、删除线等 GFM 扩展语法 | P0 |
| PREV-04 | 支持图片渲染（相对路径和外部 URL） | P1 |
| PREV-05 | 渲染效果与最终博客展示效果一致 | P1 |
| PREV-06 | 支持分屏模式：左侧源码编辑，右侧实时预览 | P1 |

**技术实现**:
- 使用 `react-markdown` + `remark-gfm` + `rehype-highlight` 实现 GFM 渲染
- 图片路径处理：`content/articles/` 下的相对路径自动转为 GitHub raw URL
- 分屏模式使用 CSS Grid/Flexbox 布局，左右各 50%

---

### 2.4 文章编辑器模块

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| EDIT-01 | 可视化编辑 Frontmatter 元数据字段（title, date, category, tags, summary, featured, status） | P0 |
| EDIT-02 | Markdown 正文编辑器（使用 Textarea 或简易代码编辑器） | P0 |
| EDIT-03 | 编辑时实时预览渲染效果（右侧面板） | P0 |
| EDIT-04 | Frontmatter 各字段校验：title 必填、date 格式校验（ISO 8601）、status 枚举值校验 | P1 |
| EDIT-05 | 自动生成 slug（复用现有 Snowflake 算法，转为 TypeScript 实现） | P0 |
| EDIT-06 | 自动生成 date（默认当前时间，使用 ISO 8601 格式） | P0 |
| EDIT-07 | 标签输入支持多选/标签输入框组件 | P1 |

**技术实现**:
- 使用受控表单组件编辑 Frontmatter
- 将现有 `init-meta.js` 中的 Snowflake 算法迁移为 TypeScript
- 日期使用 `<input type="datetime-local">` 或日期选择器

---

### 2.5 文章上传模块

**目标**: 从本地上传 Markdown 文件，支持格式校验

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| UPLOAD-01 | 支持拖拽上传或点击选择文件 | P0 |
| UPLOAD-02 | 文件格式校验：仅允许 `.md`（Markdown）和 `.txt`（纯文本）格式 | P0 |
| UPLOAD-03 | 上传后自动解析文件内容，提取 Frontmatter（如果存在） | P0 |
| UPLOAD-04 | 上传后进入编辑页面，可预览和修改内容 | P0 |
| UPLOAD-05 | 文件大小限制：单个文件不超过 10MB | P1 |
| UPLOAD-06 | 上传失败时显示错误提示（格式错误、文件过大等） | P0 |

**技术实现**:
- 使用 HTML5 File API 读取本地文件
- 文件扩展名校验：正则匹配 `/\.(md|txt)$/i`
- 使用 `gray-matter` 解析上传文件的 Frontmatter
- 文件内容读取使用 `FileReader.readAsText()`

---

### 2.6 文章同步模块（GitHub 对接）

**目标**: 将编辑后的文章同步到 GitHub 仓库，记录同步状态

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| SYNC-01 | 点击「同步到仓库」按钮，通过 GitHub API 将文章写入 `content/articles/` 目录 | P0 |
| SYNC-02 | 创建新文件：使用 `octokit.rest.repos.createOrUpdateFileContents()` → PUT 请求 | P0 |
| SYNC-03 | 更新已有文件：需要传入文件的 `sha` 值（从列表数据中获取并缓存） | P0 |
| SYNC-04 | 提交信息（commit message）自动生成，格式：`Add/Update: {文章标题}` | P0 |
| SYNC-05 | 同步成功后，自动触发 GitHub Actions `sync-mongo.yml`，同步到 MongoDB | P1 |
| SYNC-06 | 同步状态展示：待同步 / 同步中 / 同步成功 / 同步失败 | P0 |
| SYNC-07 | 删除文章功能（硬删除：通过 API 删除仓库文件） | P2 |
| SYNC-08 | 同步失败时展示错误信息（Token 权限不足、网络错误等） | P1 |
| SYNC-09 | 同步中显示 Loading 状态，禁止重复提交 | P0 |

**技术实现**:
- 通过 `octokit.rest.repos.createOrUpdateFileContents()` 创建/更新文件
- 文件内容组装：Frontmatter YAML + `---` + Markdown 正文
- `sha` 值在列表加载时一并获取，存储在状态管理中
- 文件路径格式：`content/articles/{filename}.md`
- 同步状态使用 React 状态管理（pending / loading / success / error）

---

### 2.7 错误处理与反馈

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| ERR-01 | API 请求失败时显示 Toast 通知（成功/失败） | P0 |
| ERR-02 | GitHub API 限流提示（rate limit exceeded） | P1 |
| ERR-03 | 网络异常时提示用户检查网络连接 | P1 |
| ERR-04 | 文件冲突处理（多人同时编辑同一文件时，sha 不匹配） | P2 |

**技术实现**:
- 使用 `react-hot-toast` 或 `sonner` 实现 Toast 通知
- 统一封装 API 错误处理逻辑

---

## 3. 非功能性需求

### 3.1 性能
| 编号 | 需求描述 |
|------|---------|
| PERF-01 | 列表页首屏加载时间 < 2s |
| PERF-02 | 利用 Next.js ISR 缓存文章列表，revalidate 时间 60s |
| PERF-03 | Markdown 渲染使用 `react-markdown` 的懒加载模式 |

### 3.2 安全
| 编号 | 需求描述 |
|------|---------|
| SEC-01 | GitHub PAT 仅存储在 Vercel 环境变量中，不在客户端暴露 |
| SEC-02 | 所有 GitHub API 调用通过 Next.js API Routes 代理，前端不直接调用 GitHub API |
| SEC-03 | 输入内容做 XSS 防护（react-markdown 默认安全，但需注意 HTML 标签） |
| SEC-04 | 可选页面访问密码保护 |

### 3.3 兼容性
| 编号 | 需求描述 |
|------|---------|
| COMPAT-01 | 生成的文件格式与现有 `content/articles/*.md` 完全兼容，不影响现有 CI/CD 流程 |
| COMPAT-02 | Frontmatter 字段与现有 `gray-matter` 解析逻辑保持一致 |
| COMPAT-03 | slug 生成逻辑与现有 Snowflake 算法一致（迁移为 TypeScript） |

---

## 4. 技术架构概览

```
┌─────────────────────────────────────────┐
│                  Vercel                   │
│  ┌─────────────────────────────────┐    │
│  │        Next.js App Router        │    │
│  │                                  │    │
│  │  ┌──────────┐  ┌──────────────┐ │    │
│  │  │  前端页面  │  │  API Routes  │ │    │
│  │  │  (RSC +   │  │  /api/github │ │    │
│  │  │  Client)  │  │  /api/auth   │ │    │
│  │  └─────┬────┘  └──────┬───────┘ │    │
│  │        │              │          │    │
│  │        └──────┬───────┘          │    │
│  │               │                  │    │
│  │     ┌─────────▼──────────┐       │    │
│  │     │  Octokit (Server)  │       │    │
│  │     │  + GITHUB_TOKEN    │       │    │
│  │     └─────────┬──────────┘       │    │
│  └───────────────┼─────────────────┘    │
└──────────────────┼──────────────────────┘
                   │ HTTPS
          ┌────────▼────────┐
          │   GitHub API     │
          │   (REST API)     │
          └────────┬────────┘
                   │
          ┌────────▼────────┐
          │ oh_my_note 仓库  │
          │ content/articles/│
          └────────┬────────┘
                   │ push 事件触发
          ┌────────▼────────┐
          │  GitHub Actions  │
          │ sync-mongo.yml   │
          └────────┬────────┘
                   │
          ┌────────▼────────┐
          │    MongoDB       │
          └─────────────────┘
```

---

## 5. 项目目录结构（规划）

```
oh_my_note/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页 → 文章列表
│   ├── loading.tsx               # 加载态
│   ├── error.tsx                 # 错误边界
│   ├── articles/
│   │   ├── [slug]/
│   │   │   └── page.tsx          # 文章预览 / 编辑页
│   │   └── upload/
│   │       └── page.tsx          # 文件上传页
│   ├── api/
│   │   ├── github/
│   │   │   ├── articles/
│   │   │   │   ├── route.ts      # GET (列表) / POST (新建)
│   │   │   │   └── [slug]/
│   │   │   │       └── route.ts  # GET / PUT / DELETE
│   │   │   └── route.ts          # 仓库信息等
│   │   └── auth/
│   │       └── route.ts          # 密码验证
│   └── login/
│       └── page.tsx              # 可选：密码登录页
├── components/
│   ├── ArticleCard.tsx           # 文章卡片组件
│   ├── ArticleEditor.tsx         # 文章编辑器（含 Frontmatter 表单）
│   ├── ArticleList.tsx           # 文章列表
│   ├── MarkdownPreview.tsx       # Markdown 渲染组件
│   ├── FrontmatterForm.tsx       # Frontmatter 编辑表单
│   ├── TagInput.tsx              # 标签输入组件
│   ├── FileUploader.tsx          # 文件上传组件（支持拖拽）
│   └── Layout.tsx                # 布局组件（导航栏等）
├── lib/
│   ├── octokit.ts                # Octokit 实例（服务端）
│   ├── github-api.ts             # GitHub API 封装函数
│   ├── snowflake.ts              # Snowflake ID 生成器（TypeScript 迁移）
│   ├── frontmatter.ts            # Frontmatter 解析/生成工具
│   └── auth.ts                   # 密码验证工具
├── types/
│   └── index.ts                  # TypeScript 类型定义
├── .env.example                  # 环境变量示例
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

## 6. 环境变量

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `GITHUB_TOKEN` | 是 | GitHub Personal Access Token，需 `repo` 权限 |
| `GITHUB_OWNER` | 是 | GitHub 用户名或组织名 |
| `GITHUB_REPO` | 是 | 仓库名称（默认: `oh_my_note`） |
| `ACCESS_PASSWORD` | 否 | 页面访问密码，不设置则无密码保护 |
| `GITHUB_BRANCH` | 否 | 分支名（默认: `main`） |

---

## 7. 开发阶段规划

| 阶段 | 内容 | 预计产出 |
|------|------|---------|
| Phase 1: 基础框架 | Next.js 项目初始化、TailwindCSS 配置、Octokit 集成、基础布局 | 可运行的空白页面 |
| Phase 2: 文章列表 | 拉取仓库文件列表、Frontmatter 解析、卡片展示 | 文章列表页可用 |
| Phase 3: 预览渲染 | Markdown 渲染组件、代码高亮、文章详情页 | 可在线预览文章 |
| Phase 4: 编辑器与上传 | Frontmatter 表单、Markdown 编辑器、文件上传组件 | 可上传并编辑文章 |
| Phase 5: 文章同步 | GitHub API 写入、文件同步、同步状态展示 | 完整闭环可用 |
| Phase 6: 部署上线 | Vercel 部署、环境变量配置、域名绑定 | 线上可访问 |

---

## 8. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| GitHub API 限流（5000 req/h） | 频繁请求可能被限 | 使用 ISR 缓存，减少 API 调用频率 |
| PAT Token 泄露 | 仓库安全风险 | Token 仅存储在 Vercel 环境变量，前端不暴露 |
| 文件冲突 | 多人编辑时 sha 不匹配 | 保存前重新获取最新 sha，提示用户刷新 |
| Vercel 冷启动 | 首次加载慢 | 使用 ISR，关掉不必要的冷启动 |