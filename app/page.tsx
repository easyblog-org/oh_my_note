'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Article, ArticleStatus } from '@/types';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LogoutButton from '@/components/auth/LogoutButton';
import ArticleCard from '@/components/article/ArticleCard';
import StatusFilter from '@/components/article/StatusFilter';
import Button from '@/components/ui/Button';

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | undefined>(undefined);
  const initialFetchDone = useRef(false);

  async function fetchArticles() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/local/articles?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setArticles(data.data);
      }
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchArticles();
    }
  }, []);

  useEffect(() => {
    if (initialFetchDone.current) {
      fetchArticles();
    }
  }, [statusFilter]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header>
        <LogoutButton />
      </Header>

      <main className="flex-1 max-w-[1280px] mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <h1 className="text-[2.25rem] font-semibold tracking-tight text-primary-text">
              文章列表
            </h1>
            <Link href="/articles/upload">
              <Button variant="dark" size="sm">＋ 上传</Button>
            </Link>
          </div>
          <StatusFilter current={statusFilter} onChange={setStatusFilter} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-border-gray border-t-primary rounded-full animate-spin" />
              <p className="text-secondary-text text-[1rem]">加载中...</p>
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-full bg-subtle-bg flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-secondary-text text-[1.06rem] mb-5">暂无文章</p>
            <Link href="/articles/upload">
              <Button variant="primary" size="md">上传文章</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
