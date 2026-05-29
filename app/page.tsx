'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Article, ArticleStatus } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import ArticleDrawer from '@/components/article/ArticleDrawer';
import { toast } from 'sonner';

type SortField = 'title' | 'category' | 'status' | 'date';
type SortOrder = 'asc' | 'desc';

const statusTabs: { label: string; value: ArticleStatus | undefined }[] = [
  { label: '全部', value: undefined },
  { label: '已发布', value: ArticleStatus.PUBLISHED },
  { label: '草稿', value: ArticleStatus.DRAFT },
  { label: '已归档', value: ArticleStatus.ARCHIVED },
];

const statusLabel: Record<ArticleStatus, string> = {
  [ArticleStatus.PUBLISHED]: '已发布',
  [ArticleStatus.DRAFT]: '草稿',
  [ArticleStatus.ARCHIVED]: '已归档',
};

export default function HomePage() {
  const router = useRouter();
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const initialFetchDone = useRef(false);

  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [drawerArticle, setDrawerArticle] = useState<Article | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === 'Escape') {
        if (drawerOpen) {
          closeDrawer();
        } else if (selectedSlugs.size > 0) {
          setSelectedSlugs(new Set());
        } else if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
          setSearchQuery('');
        }
      }

      if (e.key === 'n' && !isInput && !drawerOpen) {
        e.preventDefault();
        router.push('/articles/upload');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen, selectedSlugs, router]);

  async function fetchArticles() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/local/articles?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAllArticles(data.data);
      }
    } catch {
      setAllArticles([]);
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

  const stats = useMemo(() => ({
    total: allArticles.length,
    published: allArticles.filter(a => a.frontmatter.status === ArticleStatus.PUBLISHED).length,
    draft: allArticles.filter(a => a.frontmatter.status === ArticleStatus.DRAFT).length,
    archived: allArticles.filter(a => a.frontmatter.status === ArticleStatus.ARCHIVED).length,
  }), [allArticles]);

  const filteredArticles = useMemo(() => {
    let result = allArticles;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(article =>
        article.slug.toLowerCase().includes(query) ||
        article.fileName.toLowerCase().includes(query) ||
        article.frontmatter.title.toLowerCase().includes(query)
      );
    }
    return result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.frontmatter.title.localeCompare(b.frontmatter.title, 'zh-CN');
          break;
        case 'category':
          cmp = a.frontmatter.category.localeCompare(b.frontmatter.category, 'zh-CN');
          break;
        case 'status':
          cmp = a.frontmatter.status.localeCompare(b.frontmatter.status);
          break;
        case 'date':
          cmp = new Date(a.frontmatter.date).getTime() - new Date(b.frontmatter.date).getTime();
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [searchQuery, allArticles, sortField, sortOrder]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }, [sortField]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  };

  const toggleSelect = (slug: string) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSlugs.size === filteredArticles.length) {
      setSelectedSlugs(new Set());
    } else {
      setSelectedSlugs(new Set(filteredArticles.map(a => a.slug)));
    }
  };

  const isAllSelected = filteredArticles.length > 0 && selectedSlugs.size === filteredArticles.length;

  async function handleBatchStatusChange(status: ArticleStatus) {
    if (selectedSlugs.size === 0) return;
    setBatchLoading(true);
    try {
      const res = await fetch('/api/local/articles/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs: Array.from(selectedSlugs), status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setSelectedSlugs(new Set());
        await fetchArticles();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('操作失败');
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleBatchDelete() {
    if (selectedSlugs.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedSlugs.size} 篇文章吗？此操作不可撤销。`)) return;
    setBatchLoading(true);
    try {
      const res = await fetch('/api/local/articles/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs: Array.from(selectedSlugs) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setSelectedSlugs(new Set());
        await fetchArticles();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleInlineStatusChange(slug: string, status: ArticleStatus) {
    try {
      const res = await fetch('/api/local/articles/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs: [slug], status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('状态已更新');
        await fetchArticles();
        if (drawerArticle?.slug === slug) {
          const updated = allArticles.find(a => a.slug === slug);
          if (updated) {
            setDrawerArticle({ ...updated, frontmatter: { ...updated.frontmatter, status } });
          }
        }
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('更新失败');
    }
  }

  function openDrawer(article: Article) {
    setDrawerArticle(article);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setDrawerArticle(null), 200);
  }

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[1.25rem] font-semibold text-primary-text">文章管理</h1>
          <Link href="/articles/upload">
            <Button variant="dark" size="sm">＋ 上传文章</Button>
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: '总文章', value: stats.total, dot: 'bg-primary-text' },
            { label: '已发布', value: stats.published, dot: 'bg-green-500' },
            { label: '草稿', value: stats.draft, dot: 'bg-amber-500' },
            { label: '已归档', value: stats.archived, dot: 'bg-gray-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-card-bg border border-border-gray rounded-lg px-4 py-3 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${stat.dot} shrink-0`} />
              <div>
                <p className="text-[0.75rem] text-muted-text">{stat.label}</p>
                <p className="text-[1.25rem] font-semibold text-primary-text leading-tight">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card-bg border border-border-gray rounded-lg">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-gray">
            <div className="flex items-center gap-1">
              {statusTabs.map(tab => (
                <button
                  key={tab.label}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 text-[0.81rem] rounded-md transition-colors cursor-pointer ${statusFilter === tab.value
                    ? 'bg-primary text-white'
                    : 'text-secondary-text hover:bg-subtle-bg'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索标题、文件名..."
                className="pl-9 pr-4 py-1.5 text-[0.81rem] border border-border-gray rounded-md bg-page-bg text-primary-text placeholder-muted-text focus:outline-none focus:border-primary transition-colors w-[220px]"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.69rem] text-muted-text bg-subtle-bg border border-border-gray rounded px-1.5 py-0.5 pointer-events-none">/</kbd>
            </div>
          </div>

          {selectedSlugs.size > 0 && (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-primary/5 border-b border-border-gray">
              <span className="text-[0.81rem] text-primary font-medium">
                已选 {selectedSlugs.size} 篇
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                {Object.values(ArticleStatus).map(s => (
                  <button
                    key={s}
                    onClick={() => handleBatchStatusChange(s)}
                    disabled={batchLoading}
                    className="px-2.5 py-1 text-[0.75rem] border border-border-gray rounded text-secondary-text hover:border-primary hover:text-primary transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {statusLabel[s]}
                  </button>
                ))}
                <button
                  onClick={handleBatchDelete}
                  disabled={batchLoading}
                  className="px-2.5 py-1 text-[0.75rem] border border-red-200 rounded text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  删除
                </button>
              </div>
              <button
                onClick={() => setSelectedSlugs(new Set())}
                className="ml-auto text-[0.75rem] text-muted-text hover:text-primary-text transition-colors cursor-pointer"
              >
                取消选择
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-border-gray border-t-primary rounded-full animate-spin" />
                <p className="text-secondary-text text-[0.88rem]">加载中...</p>
              </div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-secondary-text text-[0.94rem] mb-4">
                {searchQuery ? `未找到包含「${searchQuery}」的文章` : '暂无文章'}
              </p>
              {!searchQuery && (
                <Link href="/articles/upload">
                  <Button variant="primary" size="sm">上传第一篇文章</Button>
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-gray text-left">
                  <th className="px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-border-gray text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-3 text-[0.75rem] font-medium text-muted-text uppercase tracking-wider">
                    <button onClick={() => handleSort('title')} className="flex items-center cursor-pointer hover:text-primary-text transition-colors">
                      标题 <SortIcon field="title" currentField={sortField} order={sortOrder} />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-[0.75rem] font-medium text-muted-text uppercase tracking-wider">
                    <button onClick={() => handleSort('category')} className="flex items-center cursor-pointer hover:text-primary-text transition-colors">
                      分类 <SortIcon field="category" currentField={sortField} order={sortOrder} />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-[0.75rem] font-medium text-muted-text uppercase tracking-wider">
                    <button onClick={() => handleSort('status')} className="flex items-center cursor-pointer hover:text-primary-text transition-colors">
                      状态 <SortIcon field="status" currentField={sortField} order={sortOrder} />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-[0.75rem] font-medium text-muted-text uppercase tracking-wider">
                    <button onClick={() => handleSort('date')} className="flex items-center cursor-pointer hover:text-primary-text transition-colors">
                      日期 <SortIcon field="date" currentField={sortField} order={sortOrder} />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-[0.75rem] font-medium text-muted-text uppercase tracking-wider text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map(article => (
                  <tr
                    key={`${article.slug}--${article.fileName}`}
                    className={`border-b border-border-gray/60 last:border-b-0 hover:bg-subtle-bg/50 transition-colors ${selectedSlugs.has(article.slug) ? 'bg-primary/5' : ''
                      }`}
                  >
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSlugs.has(article.slug)}
                        onChange={() => toggleSelect(article.slug)}
                        className="w-4 h-4 rounded border-border-gray text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => openDrawer(article)}
                        className="text-[0.88rem] font-medium text-primary-text hover:text-primary transition-colors line-clamp-1 text-left cursor-pointer"
                      >
                        {article.frontmatter.title}
                      </button>
                      <p className="text-[0.75rem] text-muted-text mt-0.5 line-clamp-1">{article.fileName}</p>
                    </td>
                    <td className="px-5 py-3">
                      {article.frontmatter.category ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[0.75rem] bg-subtle-bg text-secondary-text rounded">
                          {article.frontmatter.category}
                        </span>
                      ) : (
                        <span className="text-muted-text text-[0.75rem]">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <InlineStatusSelect
                        status={article.frontmatter.status}
                        onChange={(status) => handleInlineStatusChange(article.slug, status)}
                      />
                    </td>
                    <td className="px-5 py-3 text-[0.81rem] text-secondary-text whitespace-nowrap">
                      {formatDate(article.frontmatter.date)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDrawer(article)}
                          className="inline-flex items-center justify-center w-7 h-7 text-secondary-text hover:text-primary hover:bg-primary-light rounded transition-colors cursor-pointer"
                          title="详情"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <Link
                          href={`/articles/${article.slug}`}
                          className="inline-flex items-center justify-center w-7 h-7 text-secondary-text hover:text-primary hover:bg-primary-light rounded transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filteredArticles.length > 0 && (
            <div className="px-5 py-3 border-t border-border-gray text-[0.81rem] text-muted-text">
              共 {filteredArticles.length} 篇文章
              {searchQuery && ` · 搜索「${searchQuery}」`}
            </div>
          )}
        </div>
      </main>

      <ArticleDrawer
        article={drawerArticle}
        open={drawerOpen}
        onClose={closeDrawer}
        onStatusChange={handleInlineStatusChange}
        onEdit={(slug) => router.push(`/articles/${slug}`)}
      />
    </div>
  );
}

function InlineStatusSelect({ status, onChange }: { status: ArticleStatus; onChange: (s: ArticleStatus) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        className="cursor-pointer"
      >
        <StatusBadge status={status} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 bg-card-bg border border-border-gray rounded-lg shadow-lg z-30 py-1 min-w-[100px]">
            {Object.values(ArticleStatus).map(s => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(s);
                  setOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-[0.81rem] text-left hover:bg-subtle-bg transition-colors cursor-pointer ${status === s ? 'text-primary font-medium' : 'text-secondary-text'
                  }`}
              >
                {statusLabel[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SortIcon({ field, currentField, order }: { field: SortField; currentField: SortField; order: SortOrder }) {
  if (currentField !== field) {
    return <span className="text-border-light ml-1">⇅</span>;
  }
  return <span className="text-primary ml-1">{order === 'asc' ? '↑' : '↓'}</span>;
}
