import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Frontmatter, ArticleStatus } from '@/types';

export async function PATCH(request: Request) {
  try {
    const { slugs, status } = await request.json();

    if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json(
        { success: false, message: '请选择文章' },
        { status: 400 }
      );
    }

    if (!status || !Object.values(ArticleStatus).includes(status)) {
      return NextResponse.json(
        { success: false, message: '无效的状态' },
        { status: 400 }
      );
    }

    const articlesDir = path.join(process.cwd(), 'content', 'articles');
    if (!fs.existsSync(articlesDir)) {
      return NextResponse.json(
        { success: false, message: '文章目录不存在' },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(articlesDir).filter(file => file.endsWith('.md'));
    let updated = 0;

    for (const file of files) {
      const filePath = path.join(articlesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data, content: body } = matter(content);
      const frontmatter = data as Frontmatter;

      if (slugs.includes(frontmatter.slug) || slugs.includes(file.replace('.md', ''))) {
        frontmatter.status = status;
        const updatedContent = matter.stringify(body, frontmatter);
        fs.writeFileSync(filePath, updatedContent, 'utf-8');
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `已更新 ${updated} 篇文章状态`,
      updated,
    });
  } catch (error) {
    console.error('Error batch updating articles:', error);
    return NextResponse.json(
      { success: false, message: '批量更新失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { slugs } = await request.json();

    if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
      return NextResponse.json(
        { success: false, message: '请选择文章' },
        { status: 400 }
      );
    }

    const articlesDir = path.join(process.cwd(), 'content', 'articles');
    if (!fs.existsSync(articlesDir)) {
      return NextResponse.json(
        { success: false, message: '文章目录不存在' },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(articlesDir).filter(file => file.endsWith('.md'));
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(articlesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(content);
      const frontmatter = data as Frontmatter;

      if (slugs.includes(frontmatter.slug) || slugs.includes(file.replace('.md', ''))) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `已删除 ${deleted} 篇文章`,
      deleted,
    });
  } catch (error) {
    console.error('Error batch deleting articles:', error);
    return NextResponse.json(
      { success: false, message: '批量删除失败' },
      { status: 500 }
    );
  }
}
