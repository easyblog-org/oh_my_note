'use client';

import { useState, useEffect } from 'react';
import { Article, ArticleStatus } from '@/types';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';
import Pill from '@/components/ui/Pill';
import Button from '@/components/ui/Button';

interface ArticleEditorProps {
  article: Article;
  onChange: (updated: Article) => void;
}

interface Config {
  categories: string[];
  tags: string[];
}

const statusOptions: { label: string; value: ArticleStatus }[] = [
  { label: '草稿', value: ArticleStatus.DRAFT },
  { label: '已发布', value: ArticleStatus.PUBLISHED },
  { label: '已归档', value: ArticleStatus.ARCHIVED },
];

function cleanHtmlTags(content: string): string {
  return content
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '');
}

export default function ArticleEditor({ article, onChange }: ArticleEditorProps) {
  const [config, setConfig] = useState<Config>({ categories: [], tags: [] });
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setConfig(data.data);
      });
  }, []);

  function updateFrontmatter(field: string, value: unknown) {
    onChange({
      ...article,
      frontmatter: { ...article.frontmatter, [field]: value },
    });
  }

  async function saveConfig(updated: Config) {
    setConfig(updated);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch { }
  }

  async function handleAddCategory() {
    const cat = newCategoryInput.trim();
    if (!cat || config.categories.includes(cat)) {
      setNewCategoryInput('');
      setShowAddCategory(false);
      return;
    }
    const updated = { ...config, categories: [...config.categories, cat] };
    await saveConfig(updated);
    updateFrontmatter('category', cat);
    setNewCategoryInput('');
    setShowAddCategory(false);
  }

  function handleToggleTag(tag: string) {
    const current = article.frontmatter.tags;
    if (current.includes(tag)) {
      updateFrontmatter('tags', current.filter((t) => t !== tag));
    } else {
      updateFrontmatter('tags', [...current, tag]);
    }
  }

  async function handleAddCustomTag() {
    const tag = newTagInput.trim();
    if (!tag || config.tags.includes(tag)) {
      setNewTagInput('');
      setShowAddTag(false);
      return;
    }
    const updated = { ...config, tags: [...config.tags, tag] };
    await saveConfig(updated);
    handleToggleTag(tag);
    setNewTagInput('');
    setShowAddTag(false);
  }

  function handleCleanHtml() {
    const cleaned = cleanHtmlTags(article.content);
    if (cleaned === article.content) return;
    onChange({ ...article, content: cleaned });
  }

  return (
    <div className="flex gap-6">
      <div className="w-[320px] shrink-0 flex flex-col gap-5">
        <Input
          label="标题"
          value={article.frontmatter.title}
          onChange={(e) => updateFrontmatter('title', e.target.value)}
          placeholder="文章标题"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.88rem] font-medium text-secondary-text">分类</label>
          <select
            value={article.frontmatter.category}
            onChange={(e) => updateFrontmatter('category', e.target.value)}
            className="w-full px-4 py-[10px] text-[1rem] text-primary-text bg-card-bg rounded-pill border border-border-gray outline-none transition-all duration-200 focus:border-primary focus:bg-primary-light/50 focus:shadow-sm cursor-pointer appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235a5a5a' d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            <option value="">选择分类</option>
            {config.categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {!showAddCategory ? (
            <button
              onClick={() => setShowAddCategory(true)}
              className="text-[0.75rem] text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              ＋ 新增分类
            </button>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                placeholder="输入新分类名"
                className="flex-1 px-3 py-1 text-[0.81rem] text-primary-text bg-card-bg rounded-lg border border-border-gray outline-none transition-all duration-200 focus:border-primary placeholder:text-muted-text"
                autoFocus
              />
              <button
                onClick={handleAddCategory}
                className="px-2.5 py-1 text-[0.75rem] bg-primary text-white rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
              >
                确定
              </button>
              <button
                onClick={() => { setShowAddCategory(false); setNewCategoryInput(''); }}
                className="px-2.5 py-1 text-[0.75rem] text-muted-text hover:text-secondary-text transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          )}
        </div>

        <TextArea
          label="摘要"
          value={article.frontmatter.summary}
          onChange={(e) => updateFrontmatter('summary', e.target.value)}
          placeholder="请输入文章摘要（80~100字）..."
          className="min-h-[100px]"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.88rem] font-medium text-secondary-text">状态</label>
          <div className="flex items-center gap-2">
            {statusOptions.map((opt) => (
              <Pill
                key={opt.value}
                label={opt.label}
                active={article.frontmatter.status === opt.value}
                onClick={() => updateFrontmatter('status', opt.value)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.88rem] font-medium text-secondary-text">标签</label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {config.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`px-2.5 py-1 text-[0.75rem] rounded-full border transition-all duration-150 cursor-pointer ${article.frontmatter.tags.includes(tag)
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-subtle-bg text-secondary-text border-border-gray/60 hover:border-border-light'
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {article.frontmatter.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {article.frontmatter.tags
                .filter((t) => !config.tags.includes(t))
                .map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.75rem] bg-subtle-bg text-secondary-text rounded-full border border-border-gray/60"
                  >
                    {tag}
                    <button
                      onClick={() =>
                        updateFrontmatter(
                          'tags',
                          article.frontmatter.tags.filter((t) => t !== tag)
                        )
                      }
                      className="text-muted-text hover:text-primary cursor-pointer transition-colors duration-150"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          )}
          {!showAddTag ? (
            <button
              onClick={() => setShowAddTag(true)}
              className="text-[0.75rem] text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              ＋ 新增标签
            </button>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTag(); } }}
                placeholder="输入新标签名"
                className="flex-1 px-3 py-1 text-[0.81rem] text-primary-text bg-card-bg rounded-lg border border-border-gray outline-none transition-all duration-200 focus:border-primary placeholder:text-muted-text"
                autoFocus
              />
              <button
                onClick={handleAddCustomTag}
                className="px-2.5 py-1 text-[0.75rem] bg-primary text-white rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
              >
                确定
              </button>
              <button
                onClick={() => { setShowAddTag(false); setNewTagInput(''); }}
                className="px-2.5 py-1 text-[0.75rem] text-muted-text hover:text-secondary-text transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <label className="text-[0.88rem] font-medium text-secondary-text">精选</label>
          <button
            onClick={() => updateFrontmatter('featured', !article.frontmatter.featured)}
            className={`w-10 h-6 rounded-pill transition-colors relative cursor-pointer ${article.frontmatter.featured ? 'bg-primary' : 'bg-border-gray'
              }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-card-bg rounded-full shadow-sm transition-transform ${article.frontmatter.featured ? 'left-[18px]' : 'left-0.5'
                }`}
            />
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-[0.88rem] font-medium text-secondary-text">内容 (Markdown)</label>
          <Button variant="ghost" size="sm" onClick={handleCleanHtml}>
            🧹 清除 HTML 标签
          </Button>
        </div>
        <textarea
          value={article.content}
          onChange={(e) => onChange({ ...article, content: e.target.value })}
          placeholder="在此编写 Markdown 格式的文章内容..."
          className="flex-1 min-h-[600px] w-full px-4 py-3 text-[1rem] text-primary-text bg-card-bg rounded-container border border-border-gray outline-none resize-y transition-all duration-200 focus:border-primary focus:shadow-sm placeholder:text-muted-text leading-relaxed font-mono text-[0.875rem]"
        />
      </div>
    </div >
  );
}
