import { NextRequest, NextResponse } from 'next/server';
import { getArticlesList } from '@/lib/github-api';
import { ArticleStatus } from '@/types';

function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === 403 || (error as { status: number }).status === 429;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ArticleStatus | null;

    const filter = status ? { status } : undefined;
    const articles = await getArticlesList(filter);

    return NextResponse.json({ success: true, data: articles });
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, message: 'GitHub API 请求频率超限，请稍后再试' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { success: false, message: '获取文章列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, content, commitMessage } = body;

    if (!fileName || !content) {
      return NextResponse.json(
        { success: false, message: '文件名和内容不能为空' },
        { status: 400 }
      );
    }

    const { createArticle } = await import('@/lib/github-api');
    const result = await createArticle(
      fileName,
      content,
      commitMessage || `Add ${fileName}`
    );

    if (!result) {
      return NextResponse.json(
        { success: false, message: '创建文章失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { sha: result.sha } });
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, message: 'GitHub API 请求频率超限，请稍后再试' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { success: false, message: '创建文章失败' },
      { status: 500 }
    );
  }
}
