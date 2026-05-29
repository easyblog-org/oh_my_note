'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Article } from '@/types';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LogoutButton from '@/components/auth/LogoutButton';
import ArticleEditor from '@/components/editor/ArticleEditor';
import MarkdownPreview from '@/components/preview/MarkdownPreview';
import Button from '@/components/ui/Button';
import SyncButton from '@/components/editor/SyncButton';
import { toast } from 'sonner';

type TabType = 'edit' | 'preview';

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('edit');
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

  function handleArticleChange(updated: Article) {
    setArticle(updated);
  }

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
      <div className="min-h-screen flex flex-col">
        <Header>
          <LogoutButton />
        </Header>
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-border-gray border-t-primary rounded-full animate-spin" />
            <p className="text-secondary-text text-[1rem]">加载中...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header>
        <Link href="/">
          <Button variant="ghost" size="sm">← 返回</Button>
        </Link>
        <LogoutButton />
      </Header>

      <main className="flex-1 max-w-[960px] mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-primary-text">
            {article.frontmatter.title}
          </h1>
          <div className="flex items-center gap-3">
            <SyncButton article={article} onSyncComplete={fetchArticle} />
            <Button variant="danger" size="sm" onClick={handleDelete}>
              删除
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-1.5 text-[0.88rem] rounded-pill border transition-all duration-200 cursor-pointer ${activeTab === 'edit'
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-card-bg text-secondary-text border-border-gray hover:border-border-light hover:text-primary-text'
              }`}
          >
            编辑
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-1.5 text-[0.88rem] rounded-pill border transition-all duration-200 cursor-pointer ${activeTab === 'preview'
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-card-bg text-secondary-text border-border-gray hover:border-border-light hover:text-primary-text'
              }`}
          >
            预览
          </button>
        </div>

        <div className="bg-card-bg border border-border-gray rounded-container p-6 shadow-sm">
          {activeTab === 'edit' ? (
            <ArticleEditor article={article} onChange={handleArticleChange} />
          ) : (
            <MarkdownPreview content={article.content} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
