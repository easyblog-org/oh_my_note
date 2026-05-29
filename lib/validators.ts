import { UploadValidation } from '@/types';

const ALLOWED_EXTENSIONS = ['.md', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateUploadFile(file: File): UploadValidation {
  if (!file) {
    return { valid: false, message: '请选择文件' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, message: '文件大小不能超过 10MB' };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return { valid: false, message: '仅支持 .md 和 .txt 格式的文件' };
  }

  return { valid: true, fileName: file.name };
}

export async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}
