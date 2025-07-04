import { RepomixError } from '../../shared/errorHandle.js';
import type { GitHubRepoInfo } from './gitRemoteParse.js';

/**
 * Constructs GitHub archive download URL
 * Format: https://github.com/owner/repo/archive/refs/heads/branch.zip
 * For tags: https://github.com/owner/repo/archive/refs/tags/tag.zip
 * For commits: https://github.com/owner/repo/archive/commit.zip
 */
export const buildGitHubArchiveUrl = (repoInfo: GitHubRepoInfo): string => {
  const { owner, repo, ref } = repoInfo;
  const baseUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/archive`;

  if (!ref) {
    // Default to main branch - fallback to master will be handled by the caller
    return `${baseUrl}/refs/heads/main.zip`;
  }

  // Check if ref looks like a commit SHA (40 hex chars or shorter)
  const isCommitSha = /^[0-9a-f]{4,40}$/i.test(ref);
  if (isCommitSha) {
    return `${baseUrl}/${encodeURIComponent(ref)}.zip`;
  }

  // For branches and tags, we need to determine the type
  // Default to branch format, will fallback to tag if needed
  return `${baseUrl}/refs/heads/${encodeURIComponent(ref)}.zip`;
};

/**
 * Builds alternative archive URL for master branch as fallback
 */
export const buildGitHubMasterArchiveUrl = (repoInfo: GitHubRepoInfo): string | null => {
  const { owner, repo, ref } = repoInfo;
  if (ref) {
    return null; // Only applicable when no ref is specified
  }

  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/archive/refs/heads/master.zip`;
};

/**
 * Builds alternative archive URL for tags
 */
export const buildGitHubTagArchiveUrl = (repoInfo: GitHubRepoInfo): string | null => {
  const { owner, repo, ref } = repoInfo;
  if (!ref || /^[0-9a-f]{4,40}$/i.test(ref)) {
    return null; // Not applicable for commits or no ref
  }

  return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/archive/refs/tags/${encodeURIComponent(ref)}.zip`;
};

/**
 * Gets the expected archive filename from GitHub
 * Format: repo-branch.zip or repo-sha.zip
 */
export const getArchiveFilename = (repoInfo: GitHubRepoInfo): string => {
  const { repo, ref } = repoInfo;
  const refPart = ref || 'main';

  // GitHub uses the last part of the ref for the filename
  const refName = refPart.includes('/') ? refPart.split('/').pop() : refPart;

  return `${repo}-${refName}.zip`;
};

/**
 * Checks if a response indicates a GitHub API rate limit or error
 */
export const checkGitHubResponse = (response: Response): void => {
  if (response.status === 404) {
    throw new RepomixError(
      'Repository not found or is private. Please check the repository URL and your access permissions.',
    );
  }

  if (response.status === 403) {
    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    if (rateLimitRemaining === '0') {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const resetDate = resetTime ? new Date(Number.parseInt(resetTime) * 1000) : null;
      throw new RepomixError(
        `GitHub API rate limit exceeded. ${resetDate ? `Rate limit resets at ${resetDate.toISOString()}` : 'Please try again later.'}`,
      );
    }
    throw new RepomixError(
      'Access denied. The repository might be private or you might not have permission to access it.',
    );
  }

  if (response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) {
    throw new RepomixError('GitHub server error. Please try again later.');
  }

  if (!response.ok) {
    throw new RepomixError(`GitHub API error: ${response.status} ${response.statusText}`);
  }
};
