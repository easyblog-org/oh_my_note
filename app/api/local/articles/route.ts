import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Article, Frontmatter } from '@/types';

export async function GET(request: Request) {
  try {
    const articlesDir = path.join(process.cwd(), 'content', 'articles');

    if (!fs.existsSync(articlesDir)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const files = fs.readdirSync(articlesDir).filter(file => file.endsWith('.md'));

    const articles: Article[] = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(articlesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data, content: body } = matter(content);

        const frontmatter = data as Frontmatter;

        return {
          slug: frontmatter.slug || file.replace('.md', ''),
          fileName: file,
          path: `content/articles/${file}`,
          sha: '',
          frontmatter: {
            title: frontmatter.title || file.replace('.md', ''),
            slug: frontmatter.slug || file.replace('.md', ''),
            date: frontmatter.date ? new Date(frontmatter.date).toISOString() : new Date().toISOString(),
            category: frontmatter.category || '',
            tags: frontmatter.tags || [],
            summary: frontmatter.summary || '',
            featured: frontmatter.featured || false,
            status: frontmatter.status || 'draft',
          },
          content: body,
          rawContent: content,
          updatedAt: new Date(fs.statSync(filePath).mtime).toISOString(),
        };
      })
    );

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');

    let filteredArticles = articles;
    if (statusFilter) {
      filteredArticles = articles.filter(article => article.frontmatter.status === statusFilter);
    }

    filteredArticles.sort((a, b) =>
      new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime()
    );

    return NextResponse.json({ success: true, data: filteredArticles });
  } catch (error) {
    console.error('Error reading local articles:', error);
    return NextResponse.json(
      { success: false, message: '读取本地文章失败' },
      { status: 500 }
    );
  }
}
