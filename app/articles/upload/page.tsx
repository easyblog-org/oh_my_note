'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Article } from '@/types';
import { parseFrontmatter } from '@/lib/frontmatter';
import FileDropZone from '@/components/upload/FileDropZone';
import ArticleEditLayout from '@/components/editor/ArticleEditLayout';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';

type StepType = 'upload' | 'edit';

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepType>('upload');
  const [article, setArticle] = useState<Article | null>(null);
  const [uploading, setUploading] = useState(false);
  const initialRef = useRef<Article | null>(null);

  function handleFileSelected(fileName: string, content: string) {
    const parsed = parseFrontmatter(content, fileName);
    const titleName = `${parsed.frontmatter.title}.md`;

    const newArticle: Article = {
      slug: parsed.frontmatter.slug,
      fileName: titleName,
      path: `content/articles/${titleName}`,
      sha: '',
      frontmatter: parsed.frontmatter,
      content: parsed.content,
      rawContent: parsed.rawContent,
      updatedAt: new Date().toISOString(),
    };

    setArticle(newArticle);
    initialRef.current = JSON.parse(JSON.stringify(newArticle));
    setStep('edit');
  }

  useEffect(() => {
    if (step !== 'edit' || !article) return;

    function beforeUnload(e: BeforeUnloadEvent) {
      if (!article || !initialRef.current) return;
      if (
        JSON.stringify(initialRef.current.frontmatter) !== JSON.stringify(article.frontmatter) ||
        initialRef.current.content !== article.content
      ) {
        e.preventDefault();
        e.returnValue = '';
      }
    }

    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [step, article]);

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

  function handleReset() {
    if (initialRef.current && (
      JSON.stringify(initialRef.current.frontmatter) !== JSON.stringify(article?.frontmatter) ||
      initialRef.current.content !== article?.content
    )) {
      if (!confirm('当前有未保存的更改，确定要重新选择文件吗？')) return;
    }
    setStep('upload');
    setArticle(null);
    initialRef.current = null;
  }

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 px-8 py-6">
        {step === 'upload' ? (
          <div className="max-w-[560px] mx-auto pt-8">
            <div className="mb-6">
              <h1 className="text-[1.25rem] font-semibold text-primary-text mb-1">上传文章</h1>
              <p className="text-[0.81rem] text-muted-text">从本地文件导入 Markdown 文章，支持自动解析 frontmatter</p>
            </div>
            <FileDropZone onFileSelected={handleFileSelected} />
            <p className="text-[0.75rem] text-muted-text text-center mt-3">
              支持 .md / .txt 格式，最大 10MB
            </p>
          </div>
        ) : article ? (
          <ArticleEditLayout
            article={article}
            onArticleChange={(a) => setArticle(a)}
            title="上传文章"
            showSaveStatus
            actions={
              <>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  重新选择
                </Button>
                <Button variant="primary" size="sm" onClick={handleUpload} disabled={uploading}>
                  {uploading ? '保存中...' : '保存文章'}
                </Button>
              </>
            }
          />
        ) : null}
      </main>
    </div>
  );
}
