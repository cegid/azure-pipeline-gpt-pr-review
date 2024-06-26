import * as tl from "azure-pipelines-task-lib/task";

/**
 * Retrieves the file extension from a given filename.
 *
 * @param {string} fileName - The name of the file.
 * @returns {string} The file extension.
 */
export function getFileExtension(fileName: string) {
  return fileName.slice((fileName.lastIndexOf(".") - 1 >>> 0) + 2);
}

/**
 * Retrieves the target branch name from the system variables.
 * If the target branch name is not defined, it returns undefined.
 * Otherwise, it removes the 'refs/heads/' prefix and prepends 'origin/' to the branch name.
 *
 * @returns {string | undefined} The target branch name or undefined if not set.
 */
export function getTargetBranchName() {
  let targetBranchName = tl.getVariable('System.PullRequest.TargetBranchName');

  if (!targetBranchName) {
    targetBranchName = targetBranchName?.replace('refs/heads/', '');
  }

  if (!targetBranchName) {
    return undefined;
  }

  return `origin/${targetBranchName}`;
}

export async function dynamicImport(packageName: string) {
  return new Function(`return import('${packageName}')`)();
}
