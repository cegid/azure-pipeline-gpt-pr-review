import * as tl from "azure-pipelines-task-lib/task";
import { deleteExistingComments } from './pr';
import { reviewFile } from './review';
import { getTargetBranchName } from './utils';
import { getChangedFiles, initializeGit } from './git';
import { getInput } from './tl';
import https from 'https';
import { OpenAIClient, AzureKeyCredential, OpenAIKeyCredential } from '@azure/openai';

/**
 * Main function to run the task.
 * It retrieves the necessary inputs, initializes the necessary instances,
 * retrieves the changed files, deletes existing comments, reviews each file,
 * and sets the task result.
 */

async function run() {
  try {
    // Check if the task is triggered by a Pull Request
    if (tl.getVariable('Build.Reason') !== 'PullRequest') {
      tl.setResult(tl.TaskResult.Skipped, "This task should be run only when the build is triggered from a Pull Request.");
      return;
    }

    // Initialize variables
    let openai: OpenAIClient | undefined;
    const supportSelfSignedCertificate = tl.getBoolInput('support_self_signed_certificate');
    const apiKey = getInput('api_key', true);
    const aoiEndpoint = getInput('aoi_endpoint');
    const workingDir = getInput('working_dir');
    const azure = tl.getBoolInput('azure');

    // Check if an API key is provided
    if (apiKey == undefined) {
      tl.setResult(tl.TaskResult.Failed, 'No Api Key provided!');
      return;
    }

    // Check if an AOI endpoint is provided
    if( azure) {
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
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

// Run the task
run();
