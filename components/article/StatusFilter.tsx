import { ArticleStatus } from '@/types';
import Pill from '@/components/ui/Pill';

interface StatusFilterProps {
  current: ArticleStatus | undefined;
  onChange: (status: ArticleStatus | undefined) => void;
}

const filters: { label: string; value: ArticleStatus | undefined }[] = [
  { label: '全部', value: undefined },
  { label: '草稿', value: ArticleStatus.DRAFT },
  { label: '已发布', value: ArticleStatus.PUBLISHED },
  { label: '已归档', value: ArticleStatus.ARCHIVED },
];

export default function StatusFilter({ current, onChange }: StatusFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((filter) => (
        <Pill
          key={filter.label}
          label={filter.label}
          active={current === filter.value}
          onClick={() => onChange(filter.value)}
        />
      ))}
    </div>
  );
}
