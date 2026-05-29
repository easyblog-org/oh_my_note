'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { Article } from '@/types';
import ArticleEditor from '@/components/editor/ArticleEditor';
import MarkdownPreview from '@/components/preview/MarkdownPreview';

type TabType = 'edit' | 'preview';

interface ArticleEditLayoutProps {
  article: Article;
  onArticleChange: (article: Article) => void;
  title: ReactNode;
  actions?: ReactNode;
  defaultTab?: TabType;
  maxWidth?: string;
  showSaveStatus?: boolean;
}

export default function ArticleEditLayout({
  article,
  onArticleChange,
  title,
  actions,
  defaultTab = 'edit',
  maxWidth = '1280px',
  showSaveStatus = false,
}: ArticleEditLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [saved, setSaved] = useState(true);
  const initialRef = useRef(article);

  useEffect(() => {
    if (
      JSON.stringify(initialRef.current.frontmatter) !==
      JSON.stringify(article.frontmatter) ||
      initialRef.current.content !== article.content
    ) {
      setSaved(false);
    } else {
      setSaved(true);
    }
  }, [article]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <nav className="flex items-center gap-1.5 text-[0.81rem]">
            <a href="/" className="text-muted-text hover:text-primary-text transition-colors">
              首页
            </a>
            <span className="text-border-gray">/</span>
            {typeof title === 'string' ? (
              <span className="text-primary-text font-medium truncate">{title}</span>
            ) : (
              title
            )}
          </nav>
          {article.fileName && (
            <span className="inline-flex items-center px-2 py-0.5 text-[0.75rem] bg-subtle-bg text-secondary-text rounded border border-border-gray/60 font-mono truncate max-w-[200px]">
              {article.fileName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {showSaveStatus && (
            <span className={`inline-flex items-center gap-1.5 text-[0.75rem] px-2 py-1 rounded ${saved ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${saved ? 'bg-green-500' : 'bg-amber-400'}`} />
              {saved ? '已保存' : '未保存'}
            </span>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-border-gray">
        <button
          onClick={() => setActiveTab('edit')}
          className={`relative px-4 py-2 text-[0.81rem] font-medium transition-colors cursor-pointer ${
            activeTab === 'edit'
              ? 'text-primary'
              : 'text-secondary-text hover:text-primary-text'
          }`}
        >
          编辑
          {activeTab === 'edit' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`relative px-4 py-2 text-[0.81rem] font-medium transition-colors cursor-pointer ${
            activeTab === 'preview'
              ? 'text-primary'
              : 'text-secondary-text hover:text-primary-text'
          }`}
        >
          预览
          {activeTab === 'preview' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-card-bg border border-border-gray rounded-lg overflow-hidden flex flex-col">
        {activeTab === 'edit' ? (
          <ArticleEditor article={article} onChange={onArticleChange} />
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <MarkdownPreview content={article.content} />
          </div>
        )}
      </div>
    </div>
  );
}
