'use client';

import { useState } from 'react';
import { Article, SyncStatus } from '@/types';
import { serializeArticle } from '@/lib/frontmatter';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

interface SyncButtonProps {
  article: Article;
  onSyncComplete?: () => void;
}

export default function SyncButton({ article, onSyncComplete }: SyncButtonProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.IDLE);

  async function handleSync() {
    setSyncStatus(SyncStatus.LOADING);

    try {
      const serializedContent = serializeArticle(article);

      const res = await fetch(`/api/github/articles/${article.slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: serializedContent,
          sha: article.sha,
          title: article.frontmatter.title,
          commitMessage: `Update ${article.fileName}`,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSyncStatus(SyncStatus.SUCCESS);
        toast.success('文章同步成功');
        onSyncComplete?.();
      } else {
        setSyncStatus(SyncStatus.ERROR);
        toast.error(data.message || '同步失败');
      }
    } catch {
      setSyncStatus(SyncStatus.ERROR);
      toast.error('同步失败，请检查网络连接');
    }
  }

  const statusLabels: Record<SyncStatus, string> = {
    [SyncStatus.IDLE]: '同步到 GitHub',
    [SyncStatus.LOADING]: '同步中...',
    [SyncStatus.SUCCESS]: '已同步 ✓',
    [SyncStatus.ERROR]: '同步失败 ✗',
  };

  return (
    <Button
      variant={syncStatus === SyncStatus.ERROR ? 'danger' : 'secondary'}
      size="sm"
      onClick={handleSync}
      disabled={syncStatus === SyncStatus.LOADING}
    >
      {statusLabels[syncStatus]}
    </Button>
  );
}
