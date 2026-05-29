import { ArticleStatus } from '@/types';

interface StatusBadgeProps {
  status: ArticleStatus;
  className?: string;
}

const statusConfig: Record<ArticleStatus, { label: string; className: string }> = {
  [ArticleStatus.DRAFT]: {
    label: '草稿',
    className: 'bg-btn-bg text-btn-text-dark',
  },
  [ArticleStatus.PUBLISHED]: {
    label: '已发布',
    className: 'bg-primary text-white',
  },
  [ArticleStatus.ARCHIVED]: {
    label: '已归档',
    className: 'bg-border-gray text-muted-text',
  },
};

export default function StatusBadge({ status, className: extraClassName }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[ArticleStatus.DRAFT];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-[0.75rem] font-normal rounded-pill whitespace-nowrap ${config.className} ${extraClassName || ''}`}
    >
      {config.label}
    </span>
  );
}
