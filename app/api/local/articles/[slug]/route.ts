import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Article, Frontmatter } from '@/types';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const articlesDir = path.join(process.cwd(), 'content', 'articles');

    if (!fs.existsSync(articlesDir)) {
      return NextResponse.json(
        { success: false, message: '文章目录不存在' },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(articlesDir).filter(file => file.endsWith('.md'));

    let foundFile = '';
    for (const file of files) {
      const filePath = path.join(articlesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(content);
      const frontmatter = data as Frontmatter;

      if (frontmatter.slug === slug || file.replace('.md', '') === slug) {
        foundFile = file;
        break;
      }
    }

    if (!foundFile) {
      return NextResponse.json(
        { success: false, message: '文章不存在' },
        { status: 404 }
      );
    }

    const filePath = path.join(articlesDir, foundFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, content: body } = matter(content);

    const frontmatter = data as Frontmatter;

    const article: Article = {
      slug: frontmatter.slug || foundFile.replace('.md', ''),
      fileName: foundFile,
      path: `content/articles/${foundFile}`,
      sha: '',
      frontmatter: {
        title: frontmatter.title || foundFile.replace('.md', ''),
        slug: frontmatter.slug || foundFile.replace('.md', ''),
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

    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    console.error('Error reading local article:', error);
    return NextResponse.json(
      { success: false, message: '读取文章失败' },
      { status: 500 }
    );
  }
}
