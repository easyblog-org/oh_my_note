import { NextRequest, NextResponse } from 'next/server';
import { getArticleBySlug, createArticle, updateArticle, deleteArticle } from '@/lib/github-api';
import { sanitizeFileName } from '@/lib/validators';

function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === 403 || (error as { status: number }).status === 429;
  }
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);

    if (!article) {
      return NextResponse.json(
        { success: false, message: '文章不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, message: 'GitHub API 请求频率超限，请稍后再试' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { success: false, message: '获取文章失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { content, sha: inputSha, commitMessage, title } = body;
    let sha = inputSha;

    if (!content) {
      return NextResponse.json(
        { success: false, message: '内容不能为空' },
        { status: 400 }
      );
    }

    const article = await getArticleBySlug(slug);

    if (article) {
      if (!sha) {
        sha = article.sha;
      }

      if (!sha) {
        return NextResponse.json(
          { success: false, message: '无法获取文件 SHA' },
          { status: 400 }
        );
      }

      const result = await updateArticle(
        article.path,
        content,
        sha,
        commitMessage || `Update ${article.fileName}`
      );

      if (!result) {
        return NextResponse.json(
          { success: false, message: '更新文章失败，文件可能已被修改，请刷新后重试' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: { sha: result.sha } });
    }

    const safeTitle = title ? sanitizeFileName(title) : slug;
    const fileName = `${safeTitle}.md`;

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

    return NextResponse.json({ success: true, data: { sha: result.sha }, message: '文章已创建' });
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, message: 'GitHub API 请求频率超限，请稍后再试' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { success: false, message: '更新文章失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { sha } = body;

    if (!sha) {
      return NextResponse.json(
        { success: false, message: '文件 SHA 不能为空' },
        { status: 400 }
      );
    }

    const article = await getArticleBySlug(slug);
    if (!article) {
      return NextResponse.json(
        { success: false, message: '文章不存在' },
        { status: 404 }
      );
    }

    const success = await deleteArticle(
      article.path,
      sha,
      `Delete ${article.fileName}`
    );

    if (!success) {
      return NextResponse.json(
        { success: false, message: '删除文章失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, message: 'GitHub API 请求频率超限，请稍后再试' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { success: false, message: '删除文章失败' },
      { status: 500 }
    );
  }
}
