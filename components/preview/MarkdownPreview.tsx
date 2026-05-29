'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content) {
    return (
      <p className="text-muted-text text-[0.88rem]">暂无内容</p>
    );
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
      <style jsx global>{`
        .markdown-body {
          font-size: 1rem;
          line-height: 1.75;
          color: #262626;
        }
        .markdown-body h1 {
          font-size: 2rem;
          font-weight: 600;
          line-height: 1.2;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: #171717;
        }
        .markdown-body h2 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin-top: 1.75rem;
          margin-bottom: 0.625rem;
          padding-bottom: 0.375rem;
          border-bottom: 1px solid #e2e5e9;
          color: #171717;
        }
        .markdown-body h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: #262626;
        }
        .markdown-body p {
          margin-bottom: 0.875rem;
          color: #404040;
        }
        .markdown-body a {
          color: #1e80ff;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.15s ease;
        }
        .markdown-body a:hover {
          border-bottom-color: #1e80ff;
        }
        .markdown-body ul, .markdown-body ol {
          padding-left: 1.5rem;
          margin-bottom: 0.875rem;
        }
        .markdown-body li {
          margin-bottom: 0.25rem;
          color: #404040;
        }
        .markdown-body blockquote {
          border-left: 3px solid #1e80ff;
          padding: 0.5rem 1rem;
          background: rgba(30, 128, 255, 0.04);
          border-radius: 0 8px 8px 0;
          color: #525252;
          margin-bottom: 0.875rem;
        }
        .markdown-body code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.875rem;
          background-color: #f7f8fa;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          border: 1px solid #e2e5e9;
          color: #d63384;
        }
        .markdown-body pre {
          background-color: #f7f8fa;
          border: 1px solid #e2e5e9;
          border-radius: 12px;
          padding: 1rem;
          overflow-x: auto;
          margin-bottom: 0.875rem;
        }
        .markdown-body pre code {
          background: none;
          border: none;
          padding: 0;
          font-size: 0.875rem;
          line-height: 1.65;
          color: inherit;
        }
        .markdown-body table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0.875rem;
        }
        .markdown-body th, .markdown-body td {
          border: 1px solid #e2e5e9;
          padding: 0.5rem 0.75rem;
          text-align: left;
          font-size: 0.94rem;
        }
        .markdown-body th {
          background-color: #f7f8fa;
          font-weight: 600;
          color: #262626;
        }
        .markdown-body img {
          max-width: 100%;
          border-radius: 12px;
          border: 1px solid #e2e5e9;
        }
        .markdown-body hr {
          border: none;
          border-top: 1px solid #e2e5e9;
          margin: 1.5rem 0;
        }
        .markdown-body strong {
          color: #171717;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
