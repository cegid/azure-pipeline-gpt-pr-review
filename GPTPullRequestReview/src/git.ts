import { SimpleGit, simpleGit } from 'simple-git';
import { getFileExtension } from './utils';
import binaryExtensions from 'binary-extensions';
/**
 * Initialize a SimpleGit instance.
 * @param {string} baseDir - The base directory for the git operations.
 * @returns {SimpleGit} - The initialized SimpleGit instance.
 */
export function initializeGit(baseDir: string): SimpleGit {
  return simpleGit({ baseDir, binary: 'git' });
}

/**
 * Get the list of changed files in the git repository.
 * @param {SimpleGit} git - The SimpleGit instance.
 * @param {string} targetBranch - The target branch to compare with.
 * @returns {Promise<string[]>} - A promise that resolves to a list of changed non-binary files.
 */
export async function getChangedFiles(git: SimpleGit, targetBranch: string) {
  try {

    await git.addConfig('core.pager', 'cat');
    await git.addConfig('core.quotepath', 'false');
    await git.fetch();

    const diffs: string = await git.diff([targetBranch, '--name-only', '--diff-filter=AM']);
    const files = diffs.split('\n').filter(line => line.trim().length > 0);
    const nonBinaryFiles = files.filter(file => !binaryExtensions.includes(getFileExtension(file)));

    console.log(`Changed Files (excluding binary files) : \n ${nonBinaryFiles.join('\n')}`);

    return nonBinaryFiles;
  } catch (_error) {
    console.error("Error in getChangedFiles function", _error);
    throw _error;
  }
}
