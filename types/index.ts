export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum SyncStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface Frontmatter {
  title: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  featured: boolean;
  status: ArticleStatus;
  slug: string;
}

export interface Article {
  slug: string;
  fileName: string;
  path: string;
  sha: string;
  frontmatter: Frontmatter;
  content: string;
  rawContent: string;
  updatedAt: string;
}

export interface ArticleListFilter {
  status?: ArticleStatus;
}

export interface GitHubFileInfo {
  name: string;
  path: string;
  sha: string;
  size: number;
  content?: string;
  encoding?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  commitSha?: string;
}

export interface UploadValidation {
  valid: boolean;
  message?: string;
  fileName?: string;
  fileContent?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
}
