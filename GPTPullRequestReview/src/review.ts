import { addCommentToPR } from './pr';
import { Agent } from 'https';
import { getInput } from './tl';
import { SimpleGit } from 'simple-git';
import { dynamicImport } from './utils';
import * as tl from "azure-pipelines-task-lib/task";

/**
 * Reviews a file using OpenAI's GPT-3 model.
 * The review is based on the diff between the target branch and the file.
 * If the review finds any issues, it adds a comment to the pull request.
 *
 * @param {SimpleGit} git - The git instance.
 * @param {string} targetBranch - The target branch name.
 * @param {string} fileName - The name of the file to review.
 * @param {Agent} httpsAgent - The HTTPS agent.
 * @param {string} apiKey - The API key for OpenAI.
 * @param {OpenAIClient | undefined} openai - The OpenAI instance.
 * @param {string | undefined} aoiEndpoint - The endpoint for the AI.
 */
export async function reviewFile(git: SimpleGit, targetBranch: string, fileName: string, httpsAgent: Agent, apiKey: string, openai: object | undefined, aoiEndpoint: string | undefined) {
  console.log(`Start reviewing ${fileName} ...`);

  // Define the default OpenAI model
  const defaultOpenAIModel = 'gpt-3.5-turbo';
  const nodeFetch = (await dynamicImport('node-fetch')).default;

  // Get the diff between the target branch and the file
  const patch = await git.diff([targetBranch, '--', fileName]);

  // Define the instructions for the AI
  const instructions = `As a PR reviewer, your role is key for code quality. \
  Each patch entry includes the commit message in the Subject line followed by the code changes (diffs) in a unidiff format. \
  Focus solely on changed lines. Classify your feedback into the following categories and format your feedback as indicated:

  Critical:
    - [] Line X: Description of the critical issue (e.g., syntax error, logic flaw).

  Major:
    - [] Line X: Description of major issue (e.g., performance inefficiency, violation of standards).

  Minor:
    - [] Line X: Description of minor issue (e.g., stylistic inconsistency, naming conventions).

  Recommendations:
    - Provide any general or specific actions you recommend based on the issues identified in the review. This could include suggestions for code enhancements, architectural changes, or process improvements.

  If no issues are found, state 'No feedback.`;

  try {
    let choices: Array<any> = [];

    // If an OpenAI instance is provided, use it to create a chat completion
    if (openai) {
      const { OpenAIClient } = await require('@azure/openai');

      const model = await getInput("model");
      const events = await (openai as typeof OpenAIClient).streamChatCompletions(model || defaultOpenAIModel,
        [
          {
            role: "system",
            content: instructions
          },
          {
            role: "user",
            content: patch
          }
        ], { maxTokens: 500 }
      );

      let testResult = "";

      for await (const event of events) {
        for (const choice of event.choices) {
          const delta = choice.delta?.content;
          if (delta !== undefined) {
            testResult += delta;
          }
        }
      }
      // If there are choices, get the review from the first choice
      if (testResult && testResult.length > 0) {

        // If the review is not "No feedback.", add a comment to the PR
        if (testResult?.trim() !== "No feedback.") {
          await addCommentToPR(fileName, testResult, httpsAgent);
        }
      }

      // Log the completion of the review
      console.log(`Review of ${fileName} completed.`);
    }
    // If an AI endpoint is provided, use it to create a chat completion
    else if (aoiEndpoint) {
      const request = await nodeFetch(aoiEndpoint, {
        method: 'POST',
        headers: { 'api-key': `${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_tokens: 500,
          messages: [{
            role: "user",
            content: `${instructions}\n, patch : ${patch}}`
          }]
        })
      });

      // Get the choices from the response
      const response:any = await request.json();

      choices = response?.choices;
      // If there are choices, get the review from the first choice
      if (choices && choices.length > 0) {
        const review = choices[0].message?.content as string;

        // If the review is not "No feedback.", add a comment to the PR
        if (review?.trim() !== "No feedback.") {
          await addCommentToPR(fileName, review, httpsAgent);
        }
      }

      // Log the completion of the review
      console.log(`Review of ${fileName} completed.`);
    }else {
      throw new Error("OpenAI instance or AI endpoint is required.");
    }
  }
  catch (error: any) {
    console.error(`Error reviewing ${fileName}`, error);
    // If there is an error, log it
    if (error?.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error?.message);
    }
    tl.setResult(tl.TaskResult.Failed, error?.message);
    throw error;
  }
}