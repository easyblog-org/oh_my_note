'use client';

import { useCallback, useState } from 'react';
import { validateUploadFile, readFileContent } from '@/lib/validators';

interface FileDropZoneProps {
  onFileSelected: (fileName: string, content: string) => void;
}

export default function FileDropZone({ onFileSelected }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback(
    async (file: File) => {
      setError('');
      const validation = validateUploadFile(file);
      if (!validation.valid) {
        setError(validation.message || '无效文件');
        return;
      }

      try {
        const content = await readFileContent(file);
        onFileSelected(file.name, content);
      } catch {
        setError('读取文件失败');
      }
    },
    [onFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center
          py-16 px-8
          border-2 border-dashed rounded-container
          transition-all duration-200 cursor-pointer bg-card-bg
          ${isDragging
            ? 'border-primary bg-primary-light/30 shadow-sm'
            : 'border-border-gray hover:border-primary/50 hover:shadow-sm'
          }
        `}
        onClick={() => {
          const input = document.getElementById('file-upload-input');
          input?.click();
        }}
      >
        <div className="w-12 h-12 rounded-full bg-subtle-bg flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-muted-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-[1rem] text-secondary-text font-medium mb-1">
            拖放文件到此处，或点击选择
          </p>
          <p className="text-[0.81rem] text-muted-text">
            支持 .md / .txt 格式，最大 10MB
          </p>
        </div>
        <input
          id="file-upload-input"
          type="file"
          accept=".md,.txt"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
      {error && (
        <p className="text-[0.81rem] text-secondary-text text-center">{error}</p>
      )}
    </div>
  );
}
