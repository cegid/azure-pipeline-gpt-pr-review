import * as tl from "azure-pipelines-task-lib/task";

export function getFileExtension(fileName: string) {
  return fileName.slice((fileName.lastIndexOf(".") - 1 >>> 0) + 2);
}

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