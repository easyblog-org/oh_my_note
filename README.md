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
| `title` | ✅ | 文章标题 |
| `slug` | ✅ | URL 友好标识（如 `my-article`） |
| `date` | ✅ | 发布日期（格式：`YYYY-MM-DD`） |
| `category` | ❌ | 分类名称 |
| `tags` | ❌ | 标签数组 |
| `summary` | ❌ | 文章摘要 |
| `featured` | ❌ | 是否为精选文章（默认：`false`） |
| **`status`** | ❌ | **文章状态**（见下方说明） |

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
   | `MONGODB_URI` | MongoDB 连接字符串 | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
   | `MONGODB_DB_NAME` | 数据库名称（可选） | `oh_my_note` |
   | `MONGODB_COLLECTION` | 集合名称（可选） | `articles` |
   | `CLEANUP_ORPHANED` | 是否清理已删除文章（可选） | `true` / `false` |

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
