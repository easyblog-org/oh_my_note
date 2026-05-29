import { Octokit } from 'octokit';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

export default octokit;

export const GITHUB_CONFIG = {
  owner: process.env.GITHUB_OWNER || '',
  repo: process.env.GITHUB_REPO || 'oh_my_note',
  branch: process.env.GITHUB_BRANCH || 'main',
};
