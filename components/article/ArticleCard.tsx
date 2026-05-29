import Link from 'next/link';
import { Article } from '@/types';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const dateStr = article.frontmatter.date
    ? new Date(article.frontmatter.date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : '';

  const metaParts = [];
  if (dateStr) metaParts.push(dateStr);
  if (article.frontmatter.category) metaParts.push(article.frontmatter.category);
  if (article.frontmatter.tags.length > 0) metaParts.push(article.frontmatter.tags.slice(0, 2).join(' · '));

  return (
    <Link href={`/articles/${article.slug}`}>
      <Card className="h-full group">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-[1.06rem] font-medium text-primary-text leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {article.frontmatter.title}
          </h3>
          <StatusBadge status={article.frontmatter.status} className="shrink-0" />
        </div>

        {article.frontmatter.summary && (
          <p className="text-[0.88rem] text-secondary-text leading-relaxed mb-4 line-clamp-2">
            {article.frontmatter.summary}
          </p>
        )}

        <div className="flex items-center gap-2 text-[0.75rem] text-muted-text pt-3 border-t border-border-gray/60">
          {metaParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1.5 text-border-light">·</span>}
              {i === metaParts.length - 1 && i > 0 && article.frontmatter.category
                ? (<span className="inline-flex items-center px-2 py-0.5 bg-subtle-bg rounded-pill text-secondary-text">{part}</span>)
                : part
              }
            </span>
          ))}
        </div>
      </Card>
    </Link>
  );
}
