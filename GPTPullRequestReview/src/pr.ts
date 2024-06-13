import * as tl from "azure-pipelines-task-lib/task";
import { Agent } from 'https';
// import fetch from 'node-fetch';

/**
 * Retrieves system variables from the runtime environment.
 * These variables are typically set by the CI/CD system.
 *
 * @returns {Object} An object containing the following system variables:
 * - systemCollectionUri: The URI of the system team collection.
 * - systemProjectId: The ID of the system project.
 * - systemRepositoryName: The name of the build repository.
 * - systemPullRequestId: The ID of the system pull request.
 * - systemAccessToken: The system access token.
 * - systemProject: The system project.
 */
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
/**
 * Adds a new comment to a pull request.
 *
 * @param {Agent} httpsAgent - The https agent to use for requests.
 * @param {string} fileName - The name of the file to add the comment to.
 * @param {string} comment - The comment to add.
 * @returns {Promise<void>} A promise that resolves when the comment has been added.
 *
 * This function retrieves system variables from the Azure DevOps environment, then uses these variables to make a request to the Azure DevOps API to add a comment.
 */
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

  const nodeFetch = (await import('node-fetch')).default;
  await nodeFetch(prUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${systemAccessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    agent: httpsAgent
  });

  console.log(`New comment added.`);
}

/**
 * Deletes existing comments from a pull request.
 *
 * @param {Agent} httpsAgent - The https agent to use for requests.
 * @returns {Promise<void>} A promise that resolves when all comments have been deleted.
 *
 * This function retrieves system variables from the Azure DevOps environment, then uses these variables to make requests to the Azure DevOps API to delete comments.
 */
export async function deleteExistingComments(httpsAgent: Agent) {
  // Retrieve system variables from Azure DevOps environment
  const {
    systemCollectionUri,
    systemProjectId,
    systemRepositoryName,
    systemPullRequestId,
    systemAccessToken,
    systemProject
  } = getSystemVariables();

  // Logging the start of the process
  console.log("Start deleting existing comments added by the previous Job ...");

  // Construct the URL to fetch threads associated with the current pull request
  const threadsUrl = `${systemCollectionUri}${systemProjectId}/_apis/git/repositories/${systemRepositoryName}/pullRequests/${systemPullRequestId}/threads?api-version=5.1`;
  
  // Fetch threads from Azure DevOps API
  const nodeFetch = (await import('node-fetch')).default;
  const threadsResponse = await nodeFetch(threadsUrl, {
    headers: { Authorization: `Bearer ${systemAccessToken}` },
    agent: httpsAgent  // Using HTTPS agent for request configuration
  });

  // Parse the JSON response to get threads data
  const threads = await threadsResponse.json() as { value: [] };
  
  // Filter threads to only those that have a context (i.e., linked to a specific file or change)
  const threadsWithContext = threads.value.filter((thread: any) => thread.threadContext !== null);

  // Retrieve the collection name from the system collection URI
  const collectionName = getCollectionName(systemCollectionUri);
  
  // Build the display name used to identify comments made by the Azure build service
  const buildServiceName = `${systemProject} Build Service (${collectionName})`;

  // Iterate over each thread that has context
  for (const thread of threadsWithContext as any[]) {
    // Construct URL to fetch comments for each thread
    const commentsUrl = `${systemCollectionUri}${systemProjectId}/_apis/git/repositories/${systemRepositoryName}/pullRequests/${systemPullRequestId}/threads/${thread.id}/comments?api-version=5.1`;
    
    // Fetch comments from the Azure DevOps API
    const commentsResponse = await nodeFetch(commentsUrl, {
      headers: { Authorization: `Bearer ${systemAccessToken}` },
      agent: httpsAgent
    });

    // Parse the JSON response to get comments data
    const comments = await commentsResponse.json() as { value: [] };

    // Filter and delete comments made by the build service
    for (const comment of comments.value.filter((comment: any) => comment.author.displayName === buildServiceName) as any[]) {
      // Construct URL for deleting a specific comment
      const removeCommentUrl = `${systemCollectionUri}${systemProjectId}/_apis/git/repositories/${systemRepositoryName}/pullRequests/${systemPullRequestId}/threads/${thread.id}/comments/${comment.id}?api-version=5.1`;

      // Perform the delete operation
      await nodeFetch(removeCommentUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${systemAccessToken}` },
        agent: httpsAgent
      });
    }
  }

  // Log completion of the deletion process
  console.log("Existing comments deleted.");
}

/**
 * Retrieves the collection name from the collection URI.
 *
 * @param {string | undefined} collectionUri - The URI of the collection from which to retrieve the name.
 * @returns {string} The name of the collection.
 *
 * If the URI contains '.visualstudio.', the collection name is the part of the URI before '.visualstudio.'.
 * Otherwise, the collection name is the second part of the URI (after the first '/').
 */
function getCollectionName(collectionUri: string | undefined) {
  const collectionUriWithoutProtocol = collectionUri!.replace('https://', '').replace('http://', '');

  if (collectionUriWithoutProtocol.includes('.visualstudio.')) {
    return collectionUriWithoutProtocol.split('.visualstudio.')[0];
  }
  else {
    return collectionUriWithoutProtocol.split('/')[1];
  }
}