import { test } from 'vitest'
import { SimpleGit, simpleGit } from 'simple-git';
import * as tl from "azure-pipelines-task-lib/task";
import binaryExtensions from 'binary-extensions';
import { initializeGit, getChangedFiles } from '../src/git';

test('initializeGit', ({ expect }) => {
  const baseDir = '/path/to/dir';
  initializeGit(baseDir);
  expect(simpleGit).toHaveBeenCalledWith({ baseDir, binary: 'git' });
})

test('getChangedFiles', async ({ expect }) => {
  const git: SimpleGit = simpleGit();
  const targetBranch = 'main';
  const diffs = 'file1.txt\nfile2.jpg\nfile3.txt';
  git.diff.mockResolvedValue(diffs);

  const result = await getChangedFiles(git, targetBranch);

  expect(git.addConfig).toHaveBeenCalledWith('core.pager', 'cat');
  expect(git.addConfig).toHaveBeenCalledWith('core.quotepath', 'false');
  expect(git.fetch).toHaveBeenCalled();
  expect(git.diff).toHaveBeenCalledWith([targetBranch, '--name-only', '--diff-filter=AM']);
  expect(result).toEqual(['file1.txt', 'file3.txt']);
})