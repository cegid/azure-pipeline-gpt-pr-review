import { deleteExistingComments } from './pr';
import { reviewFile } from './review';
import { getTargetBranchName } from './utils';
import { getChangedFiles, initializeGit } from './git';
import { getInput, getBoolInput } from './tl';
import https from 'https';

/**
 * Main function to run the task.
 * It retrieves the necessary inputs, initializes the necessary instances,
 * retrieves the changed files, deletes existing comments, reviews each file,
 * and sets the task result.
 */

async function run() {
  const tl = await require("azure-pipelines-task-lib/task");
  try {
    // Check if the task is triggered by a Pull Request
    if (tl.getVariable('Build.Reason') !== 'PullRequest') {
      tl.setResult(tl.TaskResult.Skipped, "This task should be run only when the build is triggered from a Pull Request.");
      return;
    }
    const { OpenAIClient, AzureKeyCredential,OpenAIKeyCredential } = require('@azure/openai');

    // Initialize variables
    let openai: object | undefined;
    const supportSelfSignedCertificate = getBoolInput('support_self_signed_certificate');
    const apiKey = await getInput('api_key', true);
    const aoiEndpoint = await getInput('aoi_endpoint');
    const workingDir = await getInput('working_dir');
    const azure = await getBoolInput('azure');

    // Set the API key as a secret and set the access token as a secret
    tl.setSecret(apiKey);
    tl.setSecret(tl.getVariable('SYSTEM.ACCESSTOKEN'));

    // Check if an API key is provided
    if (apiKey == undefined) {
      tl.setResult(tl.TaskResult.Failed, 'No Api Key provided!');
      return;
    }

    // Check if an AOI endpoint is provided
    if(azure) {
      if(!aoiEndpoint) {
        tl.setResult(tl.TaskResult.Failed, 'No AOI Endpoint provided!');
        return;
      }
      openai = new OpenAIClient(aoiEndpoint, new AzureKeyCredential(apiKey));
    }
    else if (!aoiEndpoint) {
      openai = new OpenAIClient(new OpenAIKeyCredential(apiKey));
    }

    // Initialize Git with the working directory
    const git = initializeGit(workingDir ?? tl.getVariable('System.DefaultWorkingDirectory') as string);

    // Create a new HTTPS agent
    const httpsAgent = new https.Agent({
      rejectUnauthorized: !supportSelfSignedCertificate
    });

    // Get the target branch name
    let targetBranch = getTargetBranchName();

    // Check if the target branch is defined
    if (!targetBranch) {
      tl.setResult(tl.TaskResult.Failed, 'No target branch found!');
      return;
    }

    const changedFiles = await getChangedFiles(git, targetBranch);

    // Check if there are any changed files
    if (changedFiles.length === 0) {
      tl.setResult(tl.TaskResult.Succeeded, 'No changed files found!');
      return;
    }

    await deleteExistingComments(httpsAgent);

    for (const fileName of changedFiles) {
      await reviewFile(git, targetBranch, fileName, httpsAgent, apiKey, openai, aoiEndpoint);
    }

    tl.setResult(tl.TaskResult.Succeeded, "Pull Request reviewed.");
  }
  catch (err: any) {
    console.error(err);
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

// Run the task
run();
