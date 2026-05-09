# Oh My Note

博客文章内容仓库。所有文章存放在 `content/articles/` 目录下。

## 文章格式

```markdown
---
title: 文章标题
slug: article-slug
date: 2026-05-06
category: 分类
tags: [标签1, 标签2]
summary: 文章摘要（可选）
featured: true
status: published
---

文章正文内容，支持 Markdown 语法。
```

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | ❌ | 文章标题。**可选**，未设置时根据文件名自动生成（支持中文） |
| `slug` | ❌ | URL 友好标识（如 `my-article`）。**可选**，未设置时使用雪花算法自动生成唯一 ID |
| `date` | ❌ | 发布日期（格式：`YYYY-MM-DD`）。**可选**，未设置时使用文件修改时间 |
| `category` | ❌ | 分类名称 |
| `tags` | ❌ | 标签数组 |
| `summary` | ❌ | 文章摘要 |
| `featured` | ❌ | 是否为精选文章（默认：`false`） |
| **`status`** | ❌ | **文章状态**（见下方说明） |

### 🆕 自动生成功能（推荐）

为了简化文章创建流程，`title`、`slug` 和 `date` 字段现在都支持**自动生成**：

#### Title 自动生成规则

如果 Front Matter 中没有定义 `title`，系统会使用**文件名**自动生成标题：

**转换规则：**
1. 去掉 `.md` 后缀
2. 将连字符 `-` 或下划线 `_` 替换为空格
3. 首字母大写（英文单词）

**示例：**
```
文件名: my-first-post.md          →  title: "My First Post"
文件名: hello_world.md            →  title: "Hello World"
文件名: 深入剖析Java8的Stream并行原理.md  →  title: "深入剖析Java8的stream并行原理"
文件名: test-auto-title.md        →  title: "Test Auto Title"
```

> 💡 **优势**: 完美支持中文文件名，无需手动输入标题

#### Slug 自动生成规则（雪花算法 Snowflake）

如果 Front Matter 中没有定义 `slug`，系统会使用**雪花算法（Snowflake ID）**自动生成一个全局唯一的数字 ID。

**雪花算法特点：**
- ✅ **全局唯一**: 即使在分布式环境中也不会重复
- ✅ **时间有序**: ID 大致按时间递增，可看出文章创建顺序
- ✅ **高性能**: 本地生成，无需网络请求或数据库查询
- ✅ **高可用**: 单机每毫秒可生成 4096 个不重复 ID

**生成的 Slug 示例：**
```
328555143477104640    # 18位数字 ID
328555143478125824    # 下一个文章的 ID（更大）
328555143479147008    # 再下一个
```

**技术细节：**
```
ID 结构 (64位):
┌────────────┬───────────┬──────────┐
│ 时间戳     │ 机器ID    │ 序列号   │
│ (42位)     │ (10位)    │ (12位)   │
│ 毫秒级     │ 随机生成  │ 自增     │
└────────────┴───────────┴──────────┘
```

> 💡 **优势对比文件名方案:**
> - ❌ 文件名方案: 可能重复、中文文件名问题、依赖命名规范
> - ✅ 雪花方案: 绝对唯一、无语言限制、更专业

#### Date 自动生成规则

如果 Front Matter 中没有定义 `date`，系统会使用**文件的最后修改时间**作为发布日期。

**最小化 Front Matter 示例（极简模式）：**

```markdown
---
---

文章内容...
```

或者**完全省略 Front Matter**（直接写 Markdown）：

```markdown
# 文章标题

文章正文内容...
```

上面的配置会自动生成：
- `title`: 从文件名自动生成（如 `我的文章.md` → "我的文章"）
- `slug`: 雪花算法生成的唯一 ID（如 `328555143477104640`）
- `date`: 文件修改时间
- `status`: `published` (默认值)

> 📝 **提示**: 
> - 自动生成的 title 支持中文，会保留原始文件名（仅格式化空格和大小写）
> - 自动生成的 slug 是纯数字，URL 会类似 `/articles/328555143477104640`
> - 如果希望使用有意义的 URL 或自定义标题，建议手动指定对应字段

**完整 Front Matter 示例（推荐用于正式发布）：**

```markdown
---
title: 我的文章
slug: my-article
date: 2026-05-09
category: 技术
tags: [Vue, Nuxt]
summary: 文章摘要
status: published
---

文章内容...
```

### status 字段（文章状态）

| 值 | 说明 | 是否展示 |
|----|------|----------|
| `published` | 已发布 | ✅ 展示 |
| `draft` | 草稿 | ❌ 隐藏 |
| `archived` | 归档 | ❌ 隐藏 |

**注意：**
- 默认值为 `published`（如果不设置该字段）
- 兼容旧版 `draft: true` 写法（会自动转换为 `draft` 状态）
- 只有 `status: published` 的文章会在网站上显示

## 目录结构

```
oh_my_note/
├── content/
│   └── articles/          # 存放所有文章
│       └── *.md
├── scripts/
│   └── sync-to-mongo.js   # MongoDB 同步脚本
├── .github/
│   └── workflows/
│       └── sync-mongo.yml # GitHub Actions 工作流
├── .env.example            # 环境变量模板
├── package.json
├── README.md
└── .gitignore
```

## 自动化

### GitHub Actions 自动同步到 MongoDB

每次 push 到 `master` 或 `main` 分支后，会自动触发同步脚本将文章写入 MongoDB。

#### 配置步骤

1. **Fork 或 Clone 本仓库**

2. **配置 GitHub Secrets**

   进入仓库 → Settings → Secrets and variables → Actions → New repository secret

   添加以下 Secret：

   | Secret 名称 | 说明 | 示例 |
   |------------|------|------|
   | `MONGODB_URI` | MongoDB 连接字符串（**必填**） | 见下方详细说明 |
   | `MONGODB_DB_NAME` | 数据库名称（可选） | `oh_my_note` |
   | `MONGODB_COLLECTION` | 集合名称（可选） | `articles` |
   | `CLEANUP_ORPHANED` | 是否清理已删除文章（可选） | `true` / `false` |

   **⚠️ 重要：MONGODB_URI 的正确格式**

   ✅ **正确示例**（直接复制，**不要加引号**）：
   ```
   mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

   ❌ **错误示例**（这些都会导致失败）：
   ```
   "mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority"
   ^                                                                    ^
   不要在值的两端添加双引号
   ```

   **配置步骤：**
   1. 复制你的 MongoDB 连接字符串
   2. 确保字符串**不包含**首尾的双引号或单引号
   3. 确保字符串**没有**前导或尾随空格、换行符
   4. 在 Secret 的 "Value" 输入框中粘贴
   5. 点击 "Add secret"

   > 💡 **提示**: 如果从 .env 文件复制，注意不要复制等号和变量名，只要等号右边的值

3. **推送代码测试**

   ```bash
   git add .
   git commit -m "配置 MongoDB 自动同步"
   git push origin main
   ```

4. **查看运行结果**

   进入仓库 → Actions → 选择最新的 workflow run 查看日志

#### 工作流特性

- ✅ **自动触发**: push 到 master/main 分支时自动运行
- ✅ **连接检测**: 运行前先测试 MongoDB 连接是否可用
- ✅ **失败停止**: 如果 MongoDB 不可用，立即终止构建并报告错误
- ✅ **手动触发**: 支持通过 Actions 页面手动触发同步
- ✅ **详细日志**: 输出完整的同步过程和统计信息

#### 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填写你的 MongoDB 连接信息

# 3. 运行同步
npm run sync
```

## 发布流程

```bash
# 1. 创建新文章
cat > content/articles/my-new-post.md << 'EOF'
---
title: 我的新文章
date: 2026-05-06
slug: my-new-post
category: 技术
tags: [Vue, Nuxt]
status: published
---

文章内容...
EOF

# 2. 提交推送
git add .
git commit -m "发布新文章: 我的新文章"
git push origin main
```

推送后，博客网站会自动拉取并重新构建部署。

## 文章命名规范

- 文件名为 `content/articles/{slug}.md`
- `slug` 必须与文章 Front Matter 中的 `slug` 字段一致
- `date` 格式：`YYYY-MM-DD`
- 使用小写字母和连字符（kebab-case）

## 故障排查

### ❌ MongoParseError: Invalid scheme

**错误信息：**
```
MongoParseError: Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"
```

**原因：** GitHub Secrets 中的 `MONGODB_URI` 值格式不正确

**解决方案：**

1. **检查是否包含引号**（最常见原因）
   - 进入仓库 → Settings → Secrets and variables → Actions
   - 点击 `MONGODB_SECRET` 编辑
   - 检查值是否以 `"` 或 `'` 开头或结尾
   - 如果有，删除引号后保存

2. **检查是否有额外空格或换行符**
   - 在编辑框中，确保值前后没有空格
   - 确保没有多余的换行符

3. **重新配置 Secret（推荐）**
   - 删除现有的 `MONGODB_URI` Secret
   - 重新创建，在粘贴时注意：
     - ✅ 只粘贴连接字符串本身
     - ❌ 不要包含 `MONGODB_URI=` 前缀
     - ❌ 不要包含双引号
     - ❌ 不要有多余空格

### MongoDB 连接失败

如果遇到 `ETIMEOUT` 或 `ECONNREFUSED` 错误：

1. **检查网络连接**
   - 确保可以访问外网
   - 尝试更换 DNS 服务器（如 8.8.8.8）

2. **检查 MongoDB Atlas IP 白名单**
   - 登录 [MongoDB Atlas 控制台](https://cloud.mongodb.com)
   - 进入 Network Access → 添加当前 IP 或选择 "Allow Access from Anywhere"

3. **验证连接字符串格式**
   - 确保使用正确的 SRV 格式：`mongodb+srv://...`
   - 检查用户名和密码是否正确

### GitHub Actions 失败

1. **检查 Secrets 配置**
   - 确保 `MONGODB_URI` 已正确添加到 GitHub Secrets
   - 验证 Secret 值没有多余的空格或换行

2. **查看详细日志**
   - 进入 Actions 页面 → 点击失败的 run → 查看 "Test MongoDB Connection" 步骤的输出

## 技术栈

- **Node.js** - 运行时环境
- **MongoDB** - 数据库（推荐使用 [MongoDB Atlas](https://www.mongodb.com/atlas)）
- **gray-matter** - Markdown Front Matter 解析器
- **GitHub Actions** - CI/CD 自动化
