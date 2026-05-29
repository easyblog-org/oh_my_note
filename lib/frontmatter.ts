import matter from 'gray-matter';
import { Frontmatter, ArticleStatus, Article } from '@/types';
import { generateSlug } from './snowflake';

export interface ParsedArticle {
  frontmatter: Frontmatter;
  content: string;
  rawContent: string;
}

function generateTitleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.md$/, '')
    .replace(/\.txt$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
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
      status: Object.values(ArticleStatus).includes(data.status as ArticleStatus)
        ? data.status as ArticleStatus
        : ArticleStatus.DRAFT,
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
