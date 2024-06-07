import * as tl from "azure-pipelines-task-lib/task";
import { Agent } from 'https';
import fetch from 'node-fetch';

function getSystemVariables() {
  return {
    systemCollectionUri: tl.getVariable('SYSTEM.TEAMFOUNDATIONCOLLECTIONURI'),
    systemProjectId: tl.getVariable('SYSTEM.TEAMPROJECTID'),
    systemRepositoryName: tl.getVariable('Build.Repository.Name'),
    systemPullRequestId: tl.getVariable('System.PullRequest.PullRequestId'),
    systemAccessToken: tl.getVariable('SYSTEM.ACCESSTOKEN'),
    systemProject: tl.getVariable('SYSTEM.TEAMPROJECT')
  };
}

export async function addCommentToPR(fileName: string, comment: string, httpsAgent: Agent) {
  const { systemCollectionUri, systemProjectId, systemRepositoryName, systemPullRequestId, systemAccessToken } = getSystemVariables();
  const body = {
    comments: [
      {
        parentCommentId: 0,
        content: comment,
        commentType: 1
      }
    ],
    status: 1,
    threadContext: {
      filePath: fileName,
    }
  }

  const prUrl = `${systemCollectionUri}${systemProjectId}/_apis/git/repositories/${systemRepositoryName}/pullRequests/${systemPullRequestId}/threads?api-version=5.1`

  await fetch(prUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${systemAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    agent: httpsAgent
  });

  console.log(`New comment added.`);
}

export async function deleteExistingComments(httpsAgent: Agent) {
  const { systemCollectionUri, systemProjectId, systemRepositoryName, systemPullRequestId, systemAccessToken, systemProject } = getSystemVariables();

  console.log("Start deleting existing comments added by the previous Job ...");

  const threadsUrl = `${systemCollectionUri}${systemProjectId}/_apis/git/repositories/${systemRepositoryName}/pullRequests/${systemPullRequestId}/threads?api-version=5.1`;
  const threadsResponse = await fetch(threadsUrl, {
    headers: { Authorization: `Bearer ${systemAccessToken}` },
    agent: httpsAgent
  });

  const threads = await threadsResponse.json() as { value: [] };
  const threadsWithContext = threads.value.filter((thread: any) => thread.threadContext !== null);

  const collectionName = getCollectionName(systemCollectionUri);
  const buildServiceName = `${systemProject} Build Service (${collectionName})`;

  for (const thread of threadsWithContext as any[]) {
    const commentsUrl = `${systemCollectionUri}${systemProjectId}/_apis/git/repositories/${systemRepositoryName}/pullRequests/${systemPullRequestId}/threads/${thread.id}/comments?api-version=5.1`;
    const commentsResponse = await fetch(commentsUrl, {
      headers: { Authorization: `Bearer ${systemAccessToken}` },
      agent: httpsAgent
    });

    const comments = await commentsResponse.json() as { value: [] };

    for (const comment of comments.value.filter((comment: any) => comment.author.displayName === buildServiceName) as any[]) {
      const removeCommentUrl = `${systemCollectionUri}${systemProjectId}/_apis/git/repositories/${systemRepositoryName}/pullRequests/${systemPullRequestId}/threads/${thread.id}/comments/${comment.id}?api-version=5.1`;

      await fetch(removeCommentUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${systemAccessToken}` },
        agent: httpsAgent
      });
    }
  }

  console.log("Existing comments deleted.");
}

function getCollectionName(collectionUri: string | undefined) {
  const collectionUriWithoutProtocol = collectionUri!.replace('https://', '').replace('http://', '');

  if (collectionUriWithoutProtocol.includes('.visualstudio.')) {
    return collectionUriWithoutProtocol.split('.visualstudio.')[0];
  }
  else {
    return collectionUriWithoutProtocol.split('/')[1];
  }
}