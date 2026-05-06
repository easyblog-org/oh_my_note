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
---

文章正文内容，支持 Markdown 语法。
```

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
---
---
: [Vue, Nu..: [Vue, Nu..: [Vue, Nu..: [Vue, Nu..: [Vue, Nu..: [Vue, Nu..: [Vue, Nu??: [Vue, Nu..: [Vue, Nu..: [Vue, Nu..: [Vue, Nu.??? [Vue, Nu..: ? [Vue,? [Vue, Nu..: [Vue, Nu..: [Vue, Nu..: [Vue, Nu..: [Vue, Nu..: [Vue,on: [Vue, Nu..: [Vue, Nu..: [Vue, Nu..: [Vu??? [Vue, Nu..: tter 中的 `slug` 字段一致
- `date` 格式：`YYYY-MM-DD`
- 使用小写字母和连字符（kebab-case）

## 自动化

每次 push 到 `main` 分支后，博客网站会在 30 分钟内自动更新。
