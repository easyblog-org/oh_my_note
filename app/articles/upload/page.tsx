'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Article } from '@/types';
import { parseFrontmatter } from '@/lib/frontmatter';
import { sanitizeFileName } from '@/lib/validators';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LogoutButton from '@/components/auth/LogoutButton';
import FileDropZone from '@/components/upload/FileDropZone';
import ArticleEditor from '@/components/editor/ArticleEditor';
import MarkdownPreview from '@/components/preview/MarkdownPreview';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

type TabType = 'edit' | 'preview';
type StepType = 'upload' | 'edit';

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepType>('upload');
  const [article, setArticle] = useState<Article | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('edit');
  const [uploading, setUploading] = useState(false);

  function handleFileSelected(fileName: string, content: string) {
    const parsed = parseFrontmatter(content, fileName);
    const safeName = sanitizeFileName(fileName);

    setArticle({
      slug: parsed.frontmatter.slug,
      fileName: safeName,
      path: `content/articles/${safeName}`,
      sha: '',
      frontmatter: parsed.frontmatter,
      content: parsed.content,
      rawContent: parsed.rawContent,
      updatedAt: new Date().toISOString(),
    });
    setStep('edit');
  }

  function handleArticleChange(updated: Article) {
    setArticle(updated);
  }

  async function handleUpload() {
    if (!article) return;
    setUploading(true);

    try {
      const { serializeArticle } = await import('@/lib/frontmatter');
      const serializedContent = serializeArticle(article);

      const [localRes, githubRes] = await Promise.allSettled([
        fetch('/api/local/articles/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: article.fileName,
            content: serializedContent,
          }),
        }),
        fetch(`/api/github/articles/${article.slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: serializedContent,
            sha: article.sha || undefined,
            title: article.frontmatter.title,
            commitMessage: article.sha ? `Update ${article.fileName}` : `Add ${article.frontmatter.title}`,
          }),
        }),
      ]);

      const localOk = localRes.status === 'fulfilled' && (await localRes.value.json()).success;
      const githubOk = githubRes.status === 'fulfilled' && (await githubRes.value.json()).success;

      if (localOk && githubOk) {
        toast.success('文章保存成功（本地 + GitHub 已同步）');
        router.push('/');
      } else if (localOk && !githubOk) {
        const githubData = githubRes.status === 'fulfilled' ? await githubRes.value.json() : null;
        toast.success('文章已保存到本地');
        toast.warning(githubData?.message || 'GitHub 同步失败，请稍后在文章详情页手动同步');
        router.push('/');
      } else if (!localOk && githubOk) {
        toast.success('文章已同步到 GitHub');
        const localData = localRes.status === 'fulfilled' ? await localRes.value.json() : null;
        toast.error(localData?.message || '本地保存失败');
      } else {
        const localData = localRes.status === 'fulfilled' ? await localRes.value.json() : null;
        const githubData = githubRes.status === 'fulfilled' ? await githubRes.value.json() : null;
        toast.error('保存失败');
        if (localData?.message) toast.error(`本地: ${localData.message}`);
        if (githubData?.message) toast.error(`GitHub: ${githubData.message}`);
      }
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header>
        <Link href="/">
          <Button variant="ghost" size="sm">← 返回</Button>
        </Link>
        <LogoutButton />
      </Header>

      <main className="flex-1 max-w-[1280px] mx-auto w-full px-6 py-10">
        <h1 className="text-[2.25rem] font-semibold tracking-tight text-primary-text mb-8">
          上传文章
        </h1>

        {step === 'upload' ? (
          <div className="max-w-[640px] mx-auto">
            <FileDropZone onFileSelected={handleFileSelected} />
            <p className="text-[0.88rem] text-muted-text text-center mt-4">
              支持格式: .md, .txt (最大 10MB)
            </p>
          </div>
        ) : article ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep('upload');
                    setArticle(null);
                  }}
                >
                  重新选择文件
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? '上传中...' : '保存文章'}
                </Button>
              </div>
            </div>

            <div className="bg-card-bg border border-border-gray rounded-container p-6 shadow-sm">
              {activeTab === 'edit' ? (
                <ArticleEditor article={article} onChange={handleArticleChange} />
              ) : (
                <MarkdownPreview content={article.content} />
              )}
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
