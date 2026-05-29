import octokit, { GITHUB_CONFIG } from './octokit';
import { Article, GitHubFileInfo, ArticleListFilter } from '@/types';
import { parseFrontmatter } from './frontmatter';

const ARTICLES_PATH = 'content/articles';

function isConfigured(): boolean {
  return !!(GITHUB_CONFIG.owner && process.env.GITHUB_TOKEN);
}

export async function getArticlesList(filter?: ArticleListFilter): Promise<Article[]> {
  if (!isConfigured()) return [];

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      path: ARTICLES_PATH,
      ref: GITHUB_CONFIG.branch,
    });

    const files = Array.isArray(data) ? data : [];
    const mdFiles = files.filter(
      (f: GitHubFileInfo) => f.name.endsWith('.md') || f.name.endsWith('.txt')
    );

    const articles: Article[] = [];

    for (const file of mdFiles) {
      try {
        const article = await getArticleByPath(file.path, file.name, file.sha);
        if (article) {
          if (!filter?.status || article.frontmatter.status === filter.status) {
            articles.push(article);
          }
        }
      } catch {
        continue;
      }
    }

    articles.sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime()
    );

    return articles;
  } catch {
    return [];
  }
}

export async function getArticleByPath(
  path: string,
  fileName: string,
  sha: string
): Promise<Article | null> {
  if (!isConfigured()) return null;

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      path,
      ref: GITHUB_CONFIG.branch,
    });

    if (!('content' in data) || !data.content) return null;

    const rawContent = Buffer.from(data.content, 'base64').toString('utf-8');
    const parsed = parseFrontmatter(rawContent, fileName);

    return {
      slug: parsed.frontmatter.slug,
      fileName,
      path,
      sha: (data as GitHubFileInfo).sha || sha,
      frontmatter: parsed.frontmatter,
      content: parsed.content,
      rawContent: parsed.rawContent,
      updatedAt: (data as GitHubFileInfo).sha
        ? new Date().toISOString()
        : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (!isConfigured()) return null;

  try {
    const articles = await getArticlesList();
    return articles.find((a) => a.slug === slug || a.fileName === slug) || null;
  } catch {
    return null;
  }
}

export async function createArticle(
  fileName: string,
  content: string,
  commitMessage: string
): Promise<{ sha: string } | null> {
  if (!isConfigured()) return null;

  try {
    const path = `${ARTICLES_PATH}/${fileName}`;
    const encodedContent = Buffer.from(content).toString('base64');

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      path,
      message: commitMessage,
      content: encodedContent,
      branch: GITHUB_CONFIG.branch,
    });

    return { sha: data.commit.sha! };
  } catch {
    return null;
  }
}

export async function updateArticle(
  path: string,
  content: string,
  sha: string,
  commitMessage: string
): Promise<{ sha: string } | null> {
  if (!isConfigured()) return null;

  try {
    const encodedContent = Buffer.from(content).toString('base64');

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      path,
      message: commitMessage,
      content: encodedContent,
      sha,
      branch: GITHUB_CONFIG.branch,
    });

    return { sha: data.commit.sha! };
  } catch {
    return null;
  }
}

export async function deleteArticle(
  path: string,
  sha: string,
  commitMessage: string
): Promise<boolean> {
  if (!isConfigured()) return false;

  try {
    await octokit.rest.repos.deleteFile({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      path,
      message: commitMessage,
      sha,
      branch: GITHUB_CONFIG.branch,
    });
    return true;
  } catch {
    return false;
  }
}
