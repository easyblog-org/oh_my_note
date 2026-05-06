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
├── README.md
└── .gitignore
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

## 自动化

每次 push 到 `main` 分支后，博客网站会在 30 分钟内自动更新。
