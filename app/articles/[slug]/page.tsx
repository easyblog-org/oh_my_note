'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Article } from '@/types';
import ArticleEditLayout from '@/components/editor/ArticleEditLayout';
import Button from '@/components/ui/Button';
import SyncButton from '@/components/editor/SyncButton';
import { toast } from 'sonner';

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchCountRef = useRef(0);

  async function fetchArticle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/local/articles/${slug}`);
      const data = await res.json();
      if (data.success) {
        setArticle(data.data);
      } else {
        toast.error('文章不存在');
        router.push('/');
      }
    } catch {
      toast.error('加载文章失败');
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCountRef.current += 1;
    if (fetchCountRef.current === 1) {
      fetchArticle();
    }
  }, []);

  async function handleDelete() {
    if (!article) return;
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) return;

    try {
      const res = await fetch(`/api/github/articles/${slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: article.sha }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('文章已删除');
        router.push('/');
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch {
      toast.error('删除失败，请重试');
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-border-gray border-t-primary rounded-full animate-spin" />
          <p className="text-secondary-text text-[0.88rem]">加载中...</p>
        </div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 px-8 py-6">
        <ArticleEditLayout
          article={article}
          onArticleChange={setArticle}
          title={article.frontmatter.title}
          showSaveStatus
          actions={
            <>
              <SyncButton article={article} onSyncComplete={fetchArticle} />
              <Button variant="danger" size="sm" onClick={handleDelete}>
                删除
              </Button>
            </>
          }
        />
      </main>
    </div>
  );
}
