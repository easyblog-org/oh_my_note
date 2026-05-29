'use client';

import { Article, ArticleStatus } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';

interface ArticleDrawerProps {
  article: Article | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (slug: string, status: ArticleStatus) => void;
  onEdit: (slug: string) => void;
}

export default function ArticleDrawer({ article, open, onClose, onStatusChange, onEdit }: ArticleDrawerProps) {
  if (!article) return null;

  const fm = article.frontmatter;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-50 transition-opacity"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] bg-card-bg border-l border-border-gray z-50 transform transition-transform duration-200 ease-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 h-14 border-b border-border-gray shrink-0">
          <h2 className="text-[1rem] font-semibold text-primary-text truncate pr-4">
            {fm.title}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-muted-text hover:text-primary-text hover:bg-subtle-bg rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <StatusBadge status={fm.status} />
              {fm.featured && (
                <span className="inline-flex items-center px-2 py-0.5 text-[0.75rem] bg-amber-50 text-amber-700 rounded">
                  置顶
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[0.75rem] text-muted-text mb-1">分类</p>
                <p className="text-[0.88rem] text-primary-text">{fm.category || '-'}</p>
              </div>
              <div>
                <p className="text-[0.75rem] text-muted-text mb-1">日期</p>
                <p className="text-[0.88rem] text-primary-text">
                  {fm.date ? new Date(fm.date).toLocaleDateString('zh-CN') : '-'}
                </p>
              </div>
              <div>
                <p className="text-[0.75rem] text-muted-text mb-1">Slug</p>
                <p className="text-[0.88rem] text-primary-text font-mono break-all">{article.slug}</p>
              </div>
              <div>
                <p className="text-[0.75rem] text-muted-text mb-1">文件名</p>
                <p className="text-[0.88rem] text-primary-text font-mono break-all">{article.fileName}</p>
              </div>
            </div>

            {fm.tags && fm.tags.length > 0 && (
              <div>
                <p className="text-[0.75rem] text-muted-text mb-2">标签</p>
                <div className="flex flex-wrap gap-1.5">
                  {fm.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 text-[0.75rem] bg-subtle-bg text-secondary-text rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {fm.summary && (
              <div>
                <p className="text-[0.75rem] text-muted-text mb-2">摘要</p>
                <p className="text-[0.88rem] text-secondary-text leading-relaxed">
                  {fm.summary}
                </p>
              </div>
            )}

            <div>
              <p className="text-[0.75rem] text-muted-text mb-2">状态切换</p>
              <div className="flex gap-2">
                {Object.values(ArticleStatus).map(s => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(article.slug, s)}
                    className={`px-3 py-1.5 text-[0.81rem] rounded-md border transition-colors cursor-pointer ${
                      fm.status === s
                        ? 'bg-primary text-white border-primary'
                        : 'border-border-gray text-secondary-text hover:border-primary hover:text-primary'
                    }`}
                  >
                    {s === ArticleStatus.PUBLISHED ? '已发布' : s === ArticleStatus.DRAFT ? '草稿' : '已归档'}
                  </button>
                ))}
              </div>
            </div>

            {article.content && (
              <div>
                <p className="text-[0.75rem] text-muted-text mb-2">内容预览</p>
                <div className="bg-page-bg border border-border-gray rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <pre className="text-[0.81rem] text-secondary-text whitespace-pre-wrap break-words font-sans leading-relaxed">
                    {article.content.slice(0, 1000)}
                    {article.content.length > 1000 && '...'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border-gray shrink-0">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => onEdit(article.slug)}
          >
            编辑文章
          </Button>
        </div>
      </div>
    </>
  );
}
