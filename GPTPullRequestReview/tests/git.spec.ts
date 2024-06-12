import { test, expect, vi } from 'vitest'
import { simpleGit, SimpleGit } from 'simple-git';
import { getChangedFiles } from '../src/git';


test('getChangedFiles: should return non-binary changed files', async () => {
  const targetBranch = 'main';

  const git: SimpleGit = simpleGit();
  const addConfigSpy = vi.spyOn(git, 'addConfig');
  const diffSpy = vi.spyOn(git, 'diff').mockResolvedValueOnce('file1.txt\nfile2.jpg\nfile3.txt');

  const result = await getChangedFiles(git, targetBranch);

  expect(addConfigSpy).toHaveBeenCalledTimes(2);
  expect(diffSpy).toHaveBeenCalledWith([targetBranch, '--name-only', '--diff-filter=AM']);
  expect(result).toEqual(['file1.txt', 'file3.txt']);
});

test('getChangedFiles: should return empty array when no files changed', async () => {
  const targetBranch = 'main';

  const git: SimpleGit = simpleGit();
  const diffSpy = vi.spyOn(git, 'diff').mockResolvedValueOnce('');

  const result = await getChangedFiles(git, targetBranch);

  expect(diffSpy).toHaveBeenCalledWith([targetBranch, '--name-only', '--diff-filter=AM']);
  expect(result).toEqual([]);
});

test('getChangedFiles: should return non-binary changed files when binary files are present', async () => {
  const targetBranch = 'main';

  const git: SimpleGit = simpleGit();
  const diffSpy = vi.spyOn(git, 'diff').mockResolvedValueOnce('file1.txt\nfile2.jpg\nfile3.txt\nfile4.exe');

  const result = await getChangedFiles(git, targetBranch);

  expect(diffSpy).toHaveBeenCalledWith([targetBranch, '--name-only', '--diff-filter=AM']);
  expect(result).toEqual(['file1.txt', 'file3.txt']);
});

test('getChangedFiles: should return all changed files when non-text and non-binary files are present', async () => {
  const targetBranch = 'main';

  const git: SimpleGit = simpleGit();
  const diffSpy = vi.spyOn(git, 'diff').mockResolvedValueOnce('file1.txt\nfile2.jpg\nfile3.txt\nfile4.xyz');

  const result = await getChangedFiles(git, targetBranch);

  expect(diffSpy).toHaveBeenCalledWith([targetBranch, '--name-only', '--diff-filter=AM']);
  expect(result).toEqual(['file1.txt', 'file3.txt', 'file4.xyz']);
});
