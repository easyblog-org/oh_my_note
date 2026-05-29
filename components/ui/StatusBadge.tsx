import { ArticleStatus } from '@/types';

interface StatusBadgeProps {
  status: ArticleStatus;
  className?: string;
}

const statusConfig: Record<ArticleStatus, { label: string; dot: string; text: string }> = {
  [ArticleStatus.DRAFT]: {
    label: '草稿',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
  },
  [ArticleStatus.PUBLISHED]: {
    label: '已发布',
    dot: 'bg-green-500',
    text: 'text-green-700',
  },
  [ArticleStatus.ARCHIVED]: {
    label: '已归档',
    dot: 'bg-gray-400',
    text: 'text-gray-500',
  },
};

export default function StatusBadge({ status, className: extraClassName }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[ArticleStatus.DRAFT];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[0.75rem] whitespace-nowrap ${config.text} ${extraClassName || ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
