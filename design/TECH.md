# OhMyNote 技术方案设计

> **版本**: v1.0  
> **参考**: [REQUIREMENT.md](./REQUIREMENT.md) · [DESIGN.md](./DESIGN.md)

---

## 1. 技术栈明细

| 层级 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| 框架 | Next.js (App Router) | 16.x | Server Components + API Routes |
| UI 渲染 | React | 19.x | Client/Server Components 混合 |
| 样式 | TailwindCSS | ^4.x | 纯灰度 Ollama 风格，无阴影 |
| 字体 | system-ui | — | 无外部字体依赖，完全基于系统字体 |
| GitHub SDK | Octokit REST | ^21.x | Node.js 模式，仅服务端使用 |
| Markdown 渲染 | react-markdown | ^10.x | GFM + 代码高亮 |
| GFM 扩展 | remark-gfm | ^4.x | 表格、任务列表、删除线 |
| 代码高亮 | rehype-highlight | ^7.x | highlight.js 集成 |
| Frontmatter 解析 | gray-matter | ^5.x | YAML front matter |
| 类型系统 | TypeScript | ^5.x | 全量类型覆盖 |
| 通知 | sonner | ^2.x | 轻量 Toast |
| 部署 | Vercel | — | 零成本方案 |

---

## 2. 项目目录结构（详细）

```
oh_my_note/
│
├── app/                                    # Next.js App Router
│   ├── layout.tsx                          # 根布局：Navigation + Footer + <Toaster>
│   ├── page.tsx                            # 首页 → 文章列表页（Server Component + ISR）
│   ├── loading.tsx                         # 首屏加载骨架屏
│   ├── error.tsx                           # 错误边界页面
│   │
│   ├── articles/
│   │   ├── [slug]/
│   │   │   ├── page.tsx                    # 文章编辑/预览页（Client Component）
│   │   │   └── loading.tsx                 # 文章详情加载态
│   │   └── upload/
│   │       └── page.tsx                    # 文件上传页（Client Component）
│   │
│   ├── login/
│   │   └── page.tsx                        # 登录页（用户名 + 密码）
│   │
│   └── api/
│       ├── auth/
│       │   └── route.ts                    # POST /api/auth → 密码验证
│       │
│       └── github/
│           ├── articles/
│           │   ├── route.ts                # GET (列表) / POST (创建)
│           │   └── [slug]/
│           │       └── route.ts            # GET (详情) / PUT (更新) / DELETE (删除)
│           └── route.ts                    # GET /api/github → 仓库元信息
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx                      # 导航栏（Ollama 风格：纯白、无边框）
│   │   ├── Footer.tsx                      # 页脚
│   │   └── Container.tsx                   # 居中内容容器（max-w 1024-1280px）
│   │
│   ├── articles/
│   │   ├── ArticleList.tsx                 # 文章卡片列表
│   │   ├── ArticleCard.tsx                 # 单个文章卡片
│   │   ├── StatusFilter.tsx                # 状态筛选 Tab（pill 风格）
│   │   └── ArticleListSkeleton.tsx         # 列表骨架屏
│   │
│   ├── editor/
│   │   ├── ArticleEditor.tsx               # 编辑器容器（左右分屏布局）
│   │   ├── FrontmatterForm.tsx             # Frontmatter 编辑表单
│   │   ├── MarkdownEditor.tsx              # Markdown 正文编辑区
│   │   ├── TagInput.tsx                    # 标签输入（pill 标签）
│   │   └── SyncButton.tsx                  # 同步按钮（含状态指示）
│   │
│   ├── preview/
│   │   └── MarkdownPreview.tsx             # Markdown 渲染组件
│   │
│   ├── upload/
│   │   ├── FileDropZone.tsx                # 拖拽上传区域
│   │   └── FileValidationMessage.tsx       # 文件校验提示
│   │
│   ├── auth/
│   │   └── LoginForm.tsx                   # 登录表单（Ollama 风格）
│   │
│   └── ui/                                 # 基础 UI 组件（Ollama 风格）
│       ├── Button.tsx                      # 按钮：GrayPill / WhitePill / BlackPill
│       ├── Pill.tsx                         # Pill 容器（标签、筛选等）
│       ├── Card.tsx                         # 卡片容器（12px radius）
│       ├── Input.tsx                        # 输入框（pill-shaped）
│       ├── Textarea.tsx                     # 文本域
│       ├── Badge.tsx                        # 状态徽章
│       ├── Skeleton.tsx                     # 骨架屏
│       └── EmptyState.tsx                   # 空状态占位
│
├── lib/
│   ├── octokit.ts                          # Octokit 服务端实例（单例）
│   ├── github-api.ts                       # GitHub API 封装
│   │   ├── getArticlesList()               # 获取文件列表 + sha 映射
│   │   ├── getArticleByPath()              # 获取单个文件（base64 解码）
│   │   ├── getArticleBySlug()              # 通过 slug 查找文件
│   │   ├── createOrUpdateArticle()         # 创建/更新文件
│   │   ├── deleteArticle()                 # 删除文件
│   │   └── getRateLimit()                  # 查询 API 限流状态
│   ├── snowflake.ts                        # Snowflake ID 生成器
│   ├── frontmatter.ts                      # Frontmatter 解析与生成
│   │   ├── parseFrontmatter()              # 解析 Markdown + YAML head
│   │   ├── serializeArticle()              # Frontmatter + 正文 → .md 字符串
│   │   └── validateFrontmatter()           # Frontmatter 字段校验
│   ├── validators.ts                       # 通用校验函数
│   └── auth.ts                             # 密码验证工具
│
├── types/
│   └── index.ts                            # 全局类型定义
│       ├── Article                         # 文章完整类型
│       ├── Frontmatter                     # Frontmatter 字段类型
│       ├── SyncStatus                      # 同步状态枚举
│       ├── ArticleFilter                   # 筛选条件类型
│       └── GitHubFileInfo                  # GitHub API 返回的文件信息
│
├── content/                                # 保留原有目录结构（不移动）
├── scripts/                                # 保留原有脚本（不修改）
├── design/                                 # 设计文档
├── public/
│   └── logo.svg                            # 可选 Logo（纯黑线稿，Ollama 风格）
├── .env.example                            # 环境变量示例
├── next.config.ts
├── tailwind.config.ts                      # 或 postcss.config.mjs
├── package.json
└── tsconfig.json
```

---

## 3. TailwindCSS 主题配置（Ollama 风格）

```typescript
// tailwind.config.ts 核心配置
const config = {
  theme: {
    extend: {
      colors: {
        // 严格按照 DESIGN.md 配色方案
        'primary-text':    '#000000',  // Pure Black
        'secondary-text':  '#737373',  // Stone
        'muted-text':      '#a3a3a3',  // Silver
        'dark-text':       '#262626',  // Near Black
        'btn-text-dark':   '#404040',  // Button Text Dark
        'mid-gray':        '#525252',  // Mid Gray

        // Surface
        'page-bg':         '#ffffff',  // Pure White
        'subtle-bg':       '#fafafa',  // Snow
        'btn-bg':          '#e5e5e5',  // Light Gray
        'darkest':         '#090909',  // Darkest Surface

        // Border
        'border-light':    '#d4d4d4',  // Border Light
        'border-gray':     '#e5e5e5',  // Light Gray (same as btn-bg)

        // Accessibility only
        'focus-ring':      'rgba(59, 130, 246, 0.5)', // Ring Blue
      },
      borderRadius: {
        // 严格按照二值体系
        'container': '12px',     // 非交互容器
        'pill':      '9999px',   // 交互元素
      },
      fontFamily: {
        display:  ['system-ui', '-apple-system', 'ui-sans-serif'],
        body:     ['system-ui', '-apple-system', 'ui-sans-serif'],
        mono:     ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        // 严禁使用 600(bold) 及以上
      },
      fontSize: {
        'hero':       ['3rem',    { lineHeight: '1.0', fontWeight: '500' }],
        'section':    ['2.25rem', { lineHeight: '1.11', fontWeight: '500' }],
        'subheading': ['1.88rem', { lineHeight: '1.20', fontWeight: '400' }],
        'card-title': ['1.5rem',  { lineHeight: '1.33', fontWeight: '400' }],
        'body-lg':    ['1.13rem', { lineHeight: '1.56', fontWeight: '400' }],
        'body':       ['1rem',    { lineHeight: '1.50', fontWeight: '400' }],
        'caption':    ['0.88rem', { lineHeight: '1.43', fontWeight: '400' }],
        'small':      ['0.75rem', { lineHeight: '1.33', fontWeight: '400' }],
      },
      // 严禁配置 boxShadow — 整个系统零阴影
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      maxWidth: {
        'container': '1280px',
      },
    },
  },
  // Ollama 风格没有 transition/animation
};
```

### 关键约束
- **零阴影**：全站不定义 `boxShadow`，不使用 `shadow-*` class
- **零过渡**：不使用 `transition`、`duration`、`ease-*`，交互直接切换
- **零渐变色**：不使用 `bg-gradient-*`、`from-*`、`to-*`
- **零色彩色**：除 `focus-ring` 外，没有任何蓝色/红色/绿色
- **font-weight ≤ 500**：不使用 `font-semibold`、`font-bold`、`font-extrabold`
- **border-radius 二值化**：仅 `rounded-container`(12px) 和 `rounded-pill`(9999px)

---

## 4. 类型定义

```typescript
// types/index.ts

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum SyncStatus {
  IDLE = 'idle',           // 待同步
  LOADING = 'loading',     // 同步中
  SUCCESS = 'success',     // 同步成功
  ERROR = 'error',         // 同步失败
}

export interface Frontmatter {
  title: string;
  date: string;            // ISO 8601
  category: string;
  tags: string[];
  summary: string;
  featured: boolean;
  status: ArticleStatus;
  slug: string;
}

export interface Article {
  slug: string;
  fileName: string;        // 仓库中的文件名（含 .md 扩展名）
  path: string;            // 仓库中的完整路径
  sha: string;             // GitHub blob sha（更新时需要）
  frontmatter: Frontmatter;
  content: string;         // Markdown 正文（不含 Frontmatter）
  rawContent: string;      // 原始文件内容（含 Frontmatter）
  updatedAt: string;
}

export interface ArticleListFilter {
  status?: ArticleStatus;
}

export interface GitHubFileInfo {
  name: string;
  path: string;
  sha: string;
  size: number;
  content?: string;        // base64 编码
  encoding?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  commitSha?: string;
}

export interface UploadValidation {
  valid: boolean;
  message?: string;
  fileName?: string;
  fileContent?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
}
```

---

## 5. 核心架构数据流

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │ ArticleList  │   │  Upload Page │   │  ArticleEditor   │ │
│  │ (RSC+ISR)   │   │  (Client)    │   │  (Client)        │ │
│  └──────┬──────┘   └──────┬───────┘   └────────┬─────────┘ │
│         │                 │                     │            │
│         ▼                 ▼                     ▼            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Next.js API Routes (Server)             │   │
│  │                                                       │   │
│  │  GET  /api/github/articles       → 文章列表           │   │
│  │  GET  /api/github/articles/[slug] → 单篇文章          │   │
│  │  POST /api/github/articles       → 创建新文章         │   │
│  │  PUT  /api/github/articles/[slug] → 更新文章          │   │
│  │  DELETE /api/github/articles/[slug] → 删除文章        │   │
│  │  POST /api/auth                  → 密码验证           │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
│                  ┌──────▼───────┐                            │
│                  │    Octokit    │                            │
│                  │  + GITHUB_TOKEN                          │
│                  └──────┬───────┘                            │
└─────────────────────────┼────────────────────────────────────┘
                          │ HTTPS
                 ┌────────▼────────┐
                 │   GitHub REST    │
                 │      API         │
                 └────────┬────────┘
                          │
                 ┌────────▼────────┐
                 │ oh_my_note 仓库 │
                 │ content/articles/│
                 └────────┬────────┘
                          │ push event
                 ┌────────▼────────┐
                 │  GitHub Actions  │
                 │  sync-mongo.yml  │
                 └────────┬────────┘
                          │
                 ┌────────▼────────┐
                 │    MongoDB       │
                 └─────────────────┘
```

### 关键设计决策

| 决策 | 理由 |
|------|------|
| API Routes 作为唯一 GitHub 通信通道 | Token 安全，前端不直接调用 GitHub API |
| 列表页使用 Server Component + ISR | 减少客户端请求，利用缓存避免 GitHub API 限流 |
| 编辑页使用 Client Component | 需要交互状态（表单、分屏预览、同步状态） |
| 上传完全在前端处理（FileReader） | 不需要上传到 Vercel 文件系统，直接读入内存 |
| slug 作为文章唯一标识 | 兼容现有 Snowflake 算法，路由友好 |

---

## 6. API Routes 设计详案

### 6.1 认证中间件

所有 `/api/github/*` 路由和受保护页面使用统一认证中间件，基于 Cookie Session 方案：

```typescript
// lib/auth.ts

const SESSION_COOKIE = 'oh_my_note_session';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 天

// 从环境变量读取凭据配置（Browser 端不可见）
function getConfiguredCredentials(): { username: string; password: string } | null {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  if (username && password) return { username, password };
  return null;
}

export function isAuthEnabled(): boolean {
  return getConfiguredCredentials() !== null;
}

// 验证登录请求
export function verifyLogin(username: string, password: string): boolean {
  const credentials = getConfiguredCredentials();
  if (!credentials) return true; // 未配置 → 直接放行
  return username === credentials.username && password === credentials.password;
}

// 生成 session token（简单 HMAC 签名）
function generateSessionToken(username: string): string {
  const secret = process.env.AUTH_PASSWORD || 'default-secret';
  const payload = `${username}:${Date.now()}`;
  const signature = Buffer.from(`${payload}:${secret}`).toString('base64');
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

// 校验 session token
export function validateSession(token: string | undefined): boolean {
  const credentials = getConfiguredCredentials();
  if (!credentials) return true; // 未配置 → 直接放行
  if (!token) return false;

  try {
    const [payloadB64, signatureB64] = token.split('.');
    const secret = process.env.AUTH_PASSWORD || 'default-secret';
    const expectedSignature = Buffer.from(`${Buffer.from(payloadB64, 'base64').toString('utf-8')}:${secret}`).toString('base64');
    return signatureB64 === expectedSignature;
  } catch {
    return false;
  }
}

// 从请求中获取 session
export function getSessionFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match?.[1];
}

// 生成 Set-Cookie 响应头
export function createSessionCookie(username: string): string {
  const token = generateSessionToken(username);
  const expires = new Date(Date.now() + SESSION_TTL).toUTCString();
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}; Secure`;
}

// 清除 session cookie
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
```

**安全设计原则**：
- 凭据仅存储在 Vercel 环境变量中，前端代码不可见
- Session Cookie 设为 `HttpOnly`，防止 XSS 窃取
- Cookie 带 `SameSite=Lax`，防止 CSRF 攻击
- Vercel 部署时 `Secure` 自动生效（HTTPS）
- 不配置 `AUTH_USERNAME` + `AUTH_PASSWORD` 环境变量时，系统不启用认证

### 6.2 API 路由签名

| 方法 | 路径 | 功能 | 请求体 | 响应体 |
|------|------|------|--------|--------|
| `GET` | `/api/github/articles` | 获取文章列表 | query: `?status=draft` | `{ articles: Article[], total: number }` |
| `GET` | `/api/github/articles/[slug]` | 获取单篇文章 | — | `{ article: Article }` |
| `POST` | `/api/github/articles` | 创建新文章 | `{ article: Article }` | `{ success: boolean, message: string }` |
| `PUT` | `/api/github/articles/[slug]` | 更新文章 | `{ article: Article }` | `{ success: boolean, message: string }` |
| `DELETE` | `/api/github/articles/[slug]` | 删除文章 | — | `{ success: boolean, message: string }` |
| `GET` | `/api/github` | 仓库信息 | — | `{ repo: string, owner: string, rateLimit: object }` |
| `POST` | `/api/auth` | 登录验证 | `{ username, password }` | `{ success: boolean, message?: string }` + 设置 Session Cookie |
| `POST` | `/api/auth/logout` | 退出登录 | — | `{ success: boolean }` + 清除 Session Cookie |

### 6.3 列表 API 实现逻辑

```
GET /api/github/articles?status=draft

1. 调用 octokit.rest.repos.getContent() 获取 content/articles/ 目录
2. 遍历返回的 .md 文件列表
3. 对每个文件调用 octokit.rest.repos.getContent() 获取文件内容
4. base64 解码 → parseFrontmatter() 解析
5. 可选：按 status 参数过滤
6. 返回 { articles: Article[], total: number }

优化策略：
- 如果文章数量 > 10：文件列表一次请求 + 每文件单独请求（最多 N+1 次）
- ISR revalidate: 60s，在产品页面不需要实时数据
```

### 6.4 文章 CRUD 实现逻辑

```
POST /api/github/articles
→ createOrUpdateArticle(articleData)
  → 1. 调用 serializeArticle(articleData) 生成 .md 文件内容
  → 2. 生成文件路径: content/articles/{articleData.fileName || slug}.md
  → 3. octokit.rest.repos.createOrUpdateFileContents({
       owner, repo, path, message: "Add: {title}",
       content: base64Encode(mdContent),
       branch
     })

PUT /api/github/articles/[slug]
→ createOrUpdateArticle(articleData, sha)
  → 同上，但传入 sha 参数

DELETE /api/github/articles/[slug]
→ octokit.rest.repos.deleteFile({
     owner, repo, path, message: "Delete: {title}",
     sha, branch
   })
```

---

## 7. GitHub API 封装（lib/github-api.ts）

```typescript
// 核心函数签名
export async function getArticlesList(filter?: ArticleListFilter): Promise<{
  articles: Article[];
  total: number;
  error?: string;
}>;

export async function getArticleBySlug(slug: string): Promise<{
  article: Article | null;
  error?: string;
}>;

export async function createOrUpdateArticle(
  article: Article,
  sha?: string
): Promise<SyncResult>;

export async function deleteArticle(
  slug: string,
  sha: string
): Promise<SyncResult>;

export async function getRateLimit(): Promise<{
  remaining: number;
  limit: number;
  reset: string;
}>;
```

### 错误处理策略

```typescript
// 统一错误处理包装
async function withErrorHandling<T>(fn: () => Promise<T>): Promise<{
  data: T | null;
  error?: { code: number; message: string; retryAfter?: number };
}> {
  try {
    const data = await fn();
    return { data };
  } catch (error: any) {
    if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
      return {
        data: null,
        error: {
          code: 429,
          message: 'GitHub API 请求次数已达上限，请稍后再试',
          retryAfter: parseInt(error.response.headers['retry-after'] || '60'),
        },
      };
    }
    if (error.status === 401) {
      return {
        data: null,
        error: { code: 401, message: 'GitHub Token 无效或已过期' },
      };
    }
    if (error.status === 409) {
      return {
        data: null,
        error: { code: 409, message: '文件已被修改，请刷新页面后重新编辑' },
      };
    }
    return {
      data: null,
      error: { code: error.status || 500, message: error.message || '操作失败' },
    };
  }
}
```

---

## 8. Markdown 渲染方案

### 8.1 渲染管线

```
Markdown 原文
    │
    ▼
┌─────────────────┐
│  gray-matter     │  → 分离 Frontmatter(返回 YAML) 与 Markdown 正文
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  react-markdown  │  → 核心渲染引擎
│  + remark-gfm    │  → 表格、任务列表、删除线
│  + rehype-       │  → 语法高亮
│    highlight     │
└────────┬────────┘
    │
    ▼
┌─────────────────┐
│  自定义组件映射  │
│  - <code>        │  → 代码高亮组件
│  - <a>           │  → 外部链接新窗口打开
│  - <img>         │  → 相对路径 → GitHub raw URL
│  - <table>       │  → 响应式表格包裹
└────────┬────────┘
    │
    ▼
  渲染后的 React 组件树
```

### 8.2 MarkdownPreview 组件设计

```typescript
// components/preview/MarkdownPreview.tsx

interface MarkdownPreviewProps {
  content: string;           // Markdown 原文正文（不含 Frontmatter）
  repoBaseUrl?: string;      // GitHub raw URL 前缀，用于转换相对图片路径
}

// 关键样式（Ollama 风格）：
// - 代码块: bg-subtle-bg, border border-gray, rounded-container (12px)
// - 行内代码: bg-subtle-bg, text-small, rounded (4px here is an exception for inline code)
// - 表格: 无背景色区分，仅边框分隔
// - 链接: text-primary-text, 无下划线装饰，hover 也无变化
// - 标题: 从 h1→h6 纯靠字号区分，不加粗
```

### 8.3 图片路径转换

```typescript
// 将 Markdown 中的相对路径图片转为 GitHub raw URL
function transformImageUrls(content: string): string {
  // 匹配 ![...](./images/xxx.png) 或 ![...](images/xxx.png)
  return content.replace(
    /!\[([^\]]*)\]\(\.?\/?(images\/[^)]+)\)/g,
    (_, alt, path) => `![${alt}](https://raw.githubusercontent.com/${owner}/${repo}/${branch}/content/articles/${path})`
  );
}
```

---

## 9. 前端路由设计

| 路由 | 组件类型 | 渲染模式 | 说明 |
|------|---------|---------|------|
| `/` | ArticleList (页面) | ISR | 文章列表首页，revalidate=60s |
| `/articles/[slug]` | ArticleEditor | Client | 文章编辑/预览，slug 匹配 |
| `/articles/upload` | FileDropZone | Client | 文件上传页 |
| `/login` | LoginForm | Client | 登录页（用户名 + 密码） |

### 路由守卫逻辑

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'oh_my_note_session';

export function middleware(request: NextRequest) {
  // 未配置认证凭据 → 跳过路由守卫
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  if (!username || !password) return NextResponse.next();

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const isValid = validateSession(sessionToken);

  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth');

  // 未登录且不在登录页 → 重定向到 /login
  if (!isValid && !isLoginPage && !isApiAuth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录且访问登录页 → 重定向到首页
  if (isValid && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 10. 前端组件调用链

### 10.1 首页（文章列表）

```
page.tsx (Server Component, ISR)
 └─ fetch articles from GitHub API
     │
     ▼
 ┌─ StatusFilter ───────────────┐   ← 纯 UI，通过 URL query 驱动
 │  [全部] [已发布] [草稿]       │
 └──────────────────────────────┘
     │
     ▼
 ┌─ ArticleList ───────────────────────────────────────┐
 │  ┌─ ArticleCard ───────┐  ┌─ ArticleCard ───────┐  │
 │  │  标题: 16px body    │  │  ...                │  │
 │  │  日期: caption      │  │                      │  │
 │  │  分类: Badge (pill) │  │                      │  │
 │  │  标签: Pill[]       │  │                      │  │
 │  │  状态: Badge        │  │                      │  │
 │  └─────────────────────┘  └─────────────────────┘  │
 └────────────────────────────────────────────────────┘
```

### 10.2 文章编辑/预览页

```
articles/[slug]/page.tsx (Client Component)
 ┌──────────────────────────────────────────────────┐
 │  按钮栏                                           │
 │  ┌──────────────┐  ┌──────────────────────────┐  │
 │  │ [返回列表]    │  │ SyncButton               │  │
 │  │ WhitePill    │  │ |-- Badge: sync status    │  │
 │  │              │  │ |-- BlackPill: [同步]      │  │
 │  └──────────────┘  └──────────────────────────┘  │
 └──────────────────────────────────────────────────┘
     │
     ▼  分屏布局 (grid grid-cols-2 gap-8)
 ┌─────────────────────┐  ┌─────────────────────────┐
 │  FrontmatterForm     │  │  MarkdownPreview         │
 │  ┌────────────────┐  │  │                          │
 │  │ Input: title   │  │  │  # 标题                  │
 │  │ Input: date    │  │  │  > 摘要                  │
 │  │ Input: category│  │  │                          │
 │  │ TagInput: tags │  │  │  ```java                 │
 │  │ Textarea:      │  │  │  code...                 │
 │  │   summary      │  │  │  ```                     │
 │  │ Toggle:featured│  │  │                          │
 │  │ Select: status │  │  │  实时预览渲染            │
 │  └────────────────┘  │  │                          │
 │                      │  └─────────────────────────┘
 │  ┌────────────────┐  │
 │  │ MarkdownEditor │  │
 │  │ (Textarea 编辑  │  │
 │  │  Markdown 正文) │  │
 │  └────────────────┘  │
 └─────────────────────┘  └─────────────────────────┘
```

### 10.3 上传页

```
articles/upload/page.tsx (Client Component)
 ┌──────────────────────────────────────────────┐
 │  FileDropZone                                  │
 │  ┌──────────────────────────────────────────┐ │
 │  │        拖拽 .md / .txt 文件到此处         │ │
 │  │        或 点击选择文件                    │ │
 │  │                                          │ │
 │  │    (虚线边框，无背景色，无阴影)            │ │
 │  └──────────────────────────────────────────┘ │
 │                                                │
 │  ┌──────────────────────────────────────────┐ │
 │  │  FileValidationMessage                    │ │
 │  │  (文件校验失败时显示错误信息)              │ │
 │  └──────────────────────────────────────────┘ │
 └──────────────────────────────────────────────┘
     │  上传成功后
     ▼
  跳转到 /articles/[slug] 编辑页面
```

### 10.4 登录页

```
login/page.tsx (Client Component)

┌──────────────────────────────────────────────────────────────────────┐
│                              Header                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  [OhMyNote Logo]                                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                                                                       │
│                         居中登录卡片                                  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │           Welcome to OhMyNote                                  │  │
│  │           (section 字号, font-weight 500, Pure Black)          │  │
│  │                                                                │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Username                                pill input      │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Password                                pill input      │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                     Sign In                             │  │  │
│  │  │                BlackPill CTA Button                      │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │           Invalid credentials         error message      │  │  │
│  │  │           (text-small, text #525252)                     │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Ollama 风格设计规则**：

| 元素 | 规范 |
|------|------|
| 页面背景 | `#ffffff`（Pure White） |
| 卡片背景 | `#ffffff` |
| 卡片边框 | `1px solid #e5e5e5` |
| 卡片圆角 | 12px |
| 卡片宽度 | max-w-md (448px) |
| 标题 | section (2.25rem), font-weight 500, Pure Black |
| 输入框标签 | caption (0.88rem), `#737373`（Stone） |
| 输入框 | pill-shaped (9999px), `1px solid #e5e5e5`, 10px 16px padding |
| 输入框 Placeholder | `#a3a3a3`（Silver） |
| 输入框 Focus | `focus-ring` (`rgba(59,130,246,0.5)`) ring |
| 登录按钮 | BlackPill CTA (`#000000` bg, `#ffffff` text, 9999px, 10px 24px, w-full) |
| 错误提示 | text-small (0.75rem), `#525252`（Mid Gray），位于按钮下方 |
| 卡片内间距 | 32px padding |
| 组件间距 | 16px ~ 20px |
| 垂直居中 | `min-h-screen` + `flex items-center justify-center` |
| 阴影 | **零阴影** |

**组件实现要点**：

```typescript
// components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sonner } from 'sonner';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.message || '登录失败，请检查用户名和密码');
        return;
      }

      sonner.success('登录成功');
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
      router.push(redirect);
    } catch {
      setError('网络错误，请检查网络连接');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-page-bg">
        <div className="max-w-container mx-auto px-6 h-16 flex items-center">
          <a href="/" className="text-body text-primary-text font-medium">
            OhMyNote
          </a>
        </div>
      </header>

      {/* Login Card */}
      <div className="w-full max-w-md mx-4">
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
          padding: '32px',
        }}>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: '500',
            lineHeight: '1.11',
            color: '#000000',
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            Welcome to OhMyNote
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Username */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.88rem',
                color: '#737373',
                marginBottom: '6px',
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter your username"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '9999px',
                  border: '1px solid #e5e5e5',
                  fontSize: '1rem',
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.88rem',
                color: '#737373',
                marginBottom: '6px',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '9999px',
                  border: '1px solid #e5e5e5',
                  fontSize: '1rem',
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '10px 24px',
                borderRadius: '9999px',
                backgroundColor: '#000000',
                color: '#ffffff',
                fontSize: '1.13rem',
                fontWeight: '400',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Error Message */}
            {error && (
              <p style={{
                fontSize: '0.75rem',
                color: '#525252',
                textAlign: 'center',
                margin: 0,
              }}>
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
```

**登录 API Route**：

```typescript
// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyLogin, createSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    const isValid = verifyLogin(username, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', createSessionCookie(username));
    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: '服务器错误，请重试' },
      { status: 500 }
    );
  }
}
```

**退出登录 API Route**：

```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set('Set-Cookie', clearSessionCookie());
  return response;
}
```

---

## 11. 同步状态机

```
                  ┌──────────────────┐
                  │      IDLE        │ ← 初始状态 / 重置
                  │  「同步到仓库」   │
                  └────────┬─────────┘
                           │ 用户点击「同步」
                           ▼
                  ┌──────────────────┐
                  │     LOADING      │
                  │  「同步中...」    │ ← 按钮禁用，显示 spinner
                  └────────┬─────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            │
          API 成功      API 失败        │
              │            │            │
              ▼            ▼            │
    ┌──────────────┐ ┌──────────────┐   │
    │   SUCCESS    │ │    ERROR     │   │
    │ 「同步成功」  │ │ 「同步失败」  │   │
    │  3s 后 → IDLE│ │  手动重试    │───┘
    └──────────────┘ └──────────────┘
```

```typescript
// 组件状态管理
const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.IDLE);
const [syncError, setSyncError] = useState<string>('');

async function handleSync() {
  setSyncStatus(SyncStatus.LOADING);
  try {
    const res = await fetch(`/api/github/articles/${slug}`, {
      method: article.sha ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || '同步失败');
    setSyncStatus(SyncStatus.SUCCESS);
    sonner.success('文章已同步到仓库');
    setTimeout(() => setSyncStatus(SyncStatus.IDLE), 3000);
  } catch (err: any) {
    setSyncStatus(SyncStatus.ERROR);
    setSyncError(err.message);
    sonner.error(err.message || '同步失败，请重试');
  }
}
```

---

## 12. 文件上传方案

### 12.1 FileDropZone 组件

```typescript
interface FileDropZoneProps {
  onFileAccepted: (fileName: string, content: string) => void;
  onFileRejected: (message: string) => void;
}

// 允许的 MIME 类型和扩展名
const ACCEPTED_TYPES = ['text/markdown', 'text/plain'];
const ACCEPTED_EXTENSIONS = ['.md', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

### 12.2 上传流程

```
1. 用户拖拽文件 / 点击选择
2. 浏览器 File API 读取文件
   ├─ 扩展名校验 → .md 或 .txt
   ├─ MIME 校验 → text/markdown 或 text/plain
   └─ 大小校验 → ≤ 10MB
3. FileReader.readAsText() 读取内容
4. gray-matter 解析内容：
   ├─ 存在 Frontmatter → 提取元数据
   └─ 不存在 Frontmatter → 设置默认值
5. 自动生成 slug（Snowflake）
6. 构建 Article 对象
7. 跳转到 /articles/[slug] 编辑页（状态通过 URL 或 sessionStorage 传递）
```

### 12.3 校验逻辑

```typescript
// lib/validators.ts
export function validateFileUpload(file: File): UploadValidation {
  // 校验扩展名
  const ext = file.name.match(/\.(md|txt)$/i)?.[0];
  if (!ext) {
    return {
      valid: false,
      message: `不支持的文件格式：${file.name}。仅支持 .md 和 .txt 格式。`,
    };
  }

  // 校验大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `文件大小超过限制（最大 10MB），当前文件大小：${(file.size / 1024 / 1024).toFixed(1)}MB。`,
    };
  }

  return { valid: true, fileName: file.name };
}
```

---

## 13. Snowflake 算法 TypeScript 迁移

将 `scripts/init-meta.js` 中的 `SnowflakeIdGenerator` 迁移为 TypeScript：

```typescript
// lib/snowflake.ts
export class SnowflakeIdGenerator {
  private epoch: bigint = BigInt(1700000000000); // 2023-11-15
  private workerId: bigint;
  private sequence: bigint = 0n;
  private lastTimestamp: bigint = -1n;

  constructor(workerId?: number) {
    this.workerId = BigInt(workerId ?? Math.floor(Math.random() * 1024));
  }

  nextId(): string {
    let timestamp = BigInt(Date.now());

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & 4095n;
      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(timestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    const id = ((timestamp - this.epoch) << 22n)
             | (this.workerId << 12n)
             | this.sequence;

    return id.toString();
  }

  private waitNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = BigInt(Date.now());
    while (timestamp <= lastTimestamp) {
      timestamp = BigInt(Date.now());
    }
    return timestamp;
  }
}

// 单例导出
export const snowflake = new SnowflakeIdGenerator();

export function generateSlug(): string {
  return snowflake.nextId();
}
```

### 兼容性保证
- 算法逻辑与 `init-meta.js` 完全一致
- Epoch 值相同 (`1700000000000n`)
- workerId 范围 0-1023
- 生成的 slug 长度和格式与现有文章完全兼容

---

## 14. Frontmatter 序列化与反序列化

```typescript
// lib/frontmatter.ts
import matter from 'gray-matter';
import { Frontmatter, ArticleStatus } from '@/types';

export interface ParsedArticle {
  frontmatter: Frontmatter;
  content: string; // Markdown 正文（不含 Frontmatter）
  rawContent: string; // 原始全文
}

export function parseFrontmatter(rawContent: string, fileName: string): ParsedArticle {
  const { data, content } = matter(rawContent);

  return {
    frontmatter: {
      title: data.title || generateTitleFromFileName(fileName),
      slug: data.slug || generateSlug(),
      date: data.date || new Date().toISOString(),
      category: data.category || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      summary: data.summary || '',
      featured: data.featured ?? false,
      status: (Object.values(ArticleStatus).includes(data.status as ArticleStatus)
        ? data.status as ArticleStatus
        : ArticleStatus.DRAFT
      ),
    },
    content: content.trim(),
    rawContent,
  };
}

export function serializeArticle(article: Article): string {
  const fm: Record<string, unknown> = {
    title: article.frontmatter.title,
    date: article.frontmatter.date,
    category: article.frontmatter.category || '',
    tags: article.frontmatter.tags,
    summary: article.frontmatter.summary || '',
    featured: article.frontmatter.featured,
    status: article.frontmatter.status,
    slug: article.frontmatter.slug,
  };

  const yaml = matter.stringify('', fm);
  // gray-matter.stringify 返回 '---\n...\n---\n\n'
  // 需要去掉末尾的空行和多余的前导行
  const frontmatterBlock = yaml.trim();
  return `${frontmatterBlock}\n${article.content}`;
}

export function validateFrontmatter(fm: Partial<Frontmatter>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!fm.title || fm.title.trim() === '') {
    errors.push('标题不能为空');
  }

  if (fm.date && isNaN(new Date(fm.date).getTime())) {
    errors.push('日期格式无效（需要 ISO 8601 格式）');
  }

  if (fm.status && !Object.values(ArticleStatus).includes(fm.status)) {
    errors.push(`状态值无效，可选：${Object.values(ArticleStatus).join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 15. ISR 缓存策略

```typescript
// app/page.tsx (首页 - 文章列表)

// 使用 fetch + next.revalidate 实现 ISR
export default async function HomePage() {
  const articles = await fetchArticles(); // 内部 fetch 带 { next: { revalidate: 60 } }

  return <ArticleList articles={articles} />;
}

// lib/github-api.ts
export async function getArticlesList(filter?: ArticleListFilter) {
  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);

  // 服务端内部调用，不走 HTTP，但 Next.js ISR 需要通过 fetch
  // 方案：在 page.tsx 中 fetch('/api/github/articles')，Next 自动缓存
  // 或：使用 unstable_cache 指定 revalidate
}
```

### 缓存层级

| 层级 | 位置 | 策略 |
|------|------|------|
| ISR 页面缓存 | Vercel Edge | 60s revalidate |
| Octokit 实例 | Node.js 服务端 | 单例（无缓存，每次实例化） |
| 浏览器端 | ArticleEditor | 无缓存，每次进入页面前刷新 sha |

---

## 16. 错误处理全景

```
                    ┌──────────────┐
                    │   用户操作    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         网络异常       API 错误    业务逻辑错误
              │            │            │
              ▼            ▼            ▼
    ┌─────────────────────────────────────────┐
    │         lib/withErrorHandling()          │
    │                                          │
    │  401 → "Token 无效"                      │
    │  403/429 → "请求超限"                    │
    │  404 → "文件不存在"                      │
    │  409 → "文件冲突，请刷新"                 │
    │  5xx → "服务器错误，请重试"               │
    └──────────────────┬──────────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────┐
    │          API Route → Response            │
    │  { success: false, error: {             │
    │      code: number,                      │
    │      message: string                    │
    │  }}                                     │
    └──────────────────┬──────────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────┐
    │          Client Component                │
    │  catch error → sonner.error(message)     │
    │    + setSyncStatus(ERROR)                │
    │    + setSyncError(message)               │
    └─────────────────────────────────────────┘
```

---

## 17. 组件样式规范速查（Ollama 风格）

| 元素 | 背景 | 边框 | 圆角 | 文字颜色 |
|------|------|------|------|---------|
| 页面 | `#ffffff` | — | — | — |
| 导航栏 | transparent | 无 | — | — |
| 文章卡片 | `#ffffff` | `1px solid #e5e5e5` | 12px | — |
| 卡片 hover | `#fafafa` | `1px solid #e5e5e5` | 12px | — |
| 登录卡片 | `#ffffff` | `1px solid #e5e5e5` | 12px | — |
| 按钮 Primary | `#e5e5e5` | `1px solid #e5e5e5` | 9999px | `#262626` |
| 按钮 Secondary | `#ffffff` | `1px solid #d4d4d4` | 9999px | `#404040` |
| 按钮 CTA | `#000000` | — | 9999px | `#ffffff` |
| 输入框 | `#ffffff` | `1px solid #e5e5e5` | 9999px | `#000000` |
| Placeholder | — | — | — | `#a3a3a3` |
| 标签 Pill | `#e5e5e5` | — | 9999px | `#262626` |
| 代码块 | `#fafafa` | `1px solid #e5e5e5` | 12px | — |
| 分屏容器 | `#ffffff` | `1px solid #e5e5e5` | 12px | — |
| 上传区域 | `#ffffff` | `1px dashed #e5e5e5` | 12px | `#a3a3a3` (提示文字) |
| Footer | `#fafafa` | — | — | `#737373` |

### 间距规范
- 按钮内部 padding: `10px 24px`
- 卡片内部 padding: `24px`
- 区块间距: `48px ~ 88px`
- 组件间距: `16px ~ 24px`

---

## 18. 环境变量完整清单

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `GITHUB_TOKEN` | ✅ | GitHub PAT，需 `repo` 权限 | `ghp_xxxxxxxxxxxxxxxxxxxx` |
| `GITHUB_OWNER` | ✅ | GitHub 用户名或组织名 | `easyblog-org` |
| `GITHUB_REPO` | ✅ | 仓库名称 | `oh_my_note` |
| `GITHUB_BRANCH` | ❌ | 操作分支，默认 `main` | `main` |
| `AUTH_USERNAME` | ❌ | 登录用户名，不配置则不启用认证 | `admin` |
| `AUTH_PASSWORD` | ❌ | 登录密码，不配置则不启用认证 | `mypassword` |

---

## 19. Vercel 部署配置

```jsonc
// vercel.json（可选）
{
  "functions": {
    "app/api/github/**/*": {
      "maxDuration": 30 // API Routes 函数最大执行时长 30s
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

### 部署步骤
1. 在 GitHub 创建 PAT（Settings → Developer settings → Personal access tokens → Tokens (classic)），勾选 `repo` 权限
2. 将项目推送到 GitHub 仓库
3. 在 Vercel 中 Import 该仓库
4. 在 Vercel Project Settings → Environment Variables 中配置上述 3 个必需变量
5. Deploy → 自动构建 → 上线

---

## 20. 开发顺序建议

| 步骤 | 内容 | 检查点 |
|------|------|--------|
| 1 | `npx create-next-app` 初始化 | `npm run dev` 能启动 |
| 2 | TailwindCSS 主题配置（Olama 风格） | 确认无 shadow、无彩色、二值 radius |
| 3 | `lib/auth.ts` → 登录认证逻辑 + Session Cookie | 登录/退出测试通过 |
| 4 | `POST /api/auth` + `POST /api/auth/logout` API Routes | curl 测试登录/退出 |
| 5 | `app/login/page.tsx` + `components/auth/LoginForm.tsx` | 登录页 Ollama 风格渲染 |
| 6 | `middleware.ts` → 路由守卫 | 未登录自动跳转 /login |
| 7 | `lib/octokit.ts` + 环境变量 | `console.log(octokit)` 实例化成功 |
| 8 | `lib/github-api.ts` → `getArticlesList()` | 能打印文章列表 |
| 9 | `GET /api/github/articles` API Route | curl 能返回 JSON |
| 10 | `app/page.tsx` → 文章列表首页 | 页面渲染文章卡片 |
| 11 | `types/index.ts` | 类型定义完成 |
| 12 | `components/preview/MarkdownPreview.tsx` | Markdown 能正确渲染 |
| 13 | `GET /api/github/articles/[slug]` API Route | curl 能返回单篇文章 |
| 14 | `app/articles/[slug]/page.tsx` → 文章详情页 | 页面能预览文章 |
| 15 | `lib/snowflake.ts` + `lib/frontmatter.ts` | 单元测试通过 |
| 16 | `components/editor/*` → 编辑器组件 | 编辑 → 预览联动 |
| 17 | `components/upload/FileDropZone.tsx` → 上传组件 | 文件校验通过 |
| 18 | `POST/PUT/DELETE /api/github/articles` API Routes | curl 测试 CURD 通过 |
| 19 | `components/editor/SyncButton.tsx` → 同步按钮 | 同步 → GitHub 仓库验证 |
| 20 | Toast 通知 + 错误处理完善 | 各种异常能友好提示 |
| 21 | Vercel 部署 + 环境变量配置 | 线上可访问 |

---

*本文档基于 [REQUIREMENT.md](./REQUIREMENT.md) 和 [DESIGN.md](./DESIGN.md) 编写，所有 UI 规范严格遵守 Ollama 官网风格：纯灰度、零阴影、二值圆角、pill-shaped 交互元素。*