import { addCommentToPR } from './pr';
import { Agent } from 'https';
import { getInput } from './tl';
import { SimpleGit } from 'simple-git';
import { dynamicImport } from './utils';

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
  const instructions = `Act as a code reviewer of a Pull Request, providing feedback on possible bugs and clean code issues.
        You are provided with the Pull Request changes in a patch format.
        Each patch entry has the commit message in the Subject line followed by the code changes (diffs) in a unidiff format.

        As a code reviewer, your task is:
                - Review only added, edited or deleted lines.
                - If there's no bugs and the changes are correct, write only 'No feedback.'
                - If there's bug or uncorrect code changes, don't write 'No feedback.'`;

  try {
    let choices: Array<any> = [];

    // If an OpenAI instance is provided, use it to create a chat completion
    if (openai) {
      const { OpenAIClient } = await require('@azure/openai');

      const response = (await openai as typeof OpenAIClient).streamChatCompletions(getInput('model') || defaultOpenAIModel,
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

      for await (const event of response) {
        for (const choice of event.choices) {
          choices.push(choice);
        }
      }
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
      console.log("response", response)

      choices = response?.choices;
    }else {
      throw new Error("OpenAI instance or AI endpoint is required.");
    }

    // If there are choices, get the review from the first choice
    if (choices && choices.length > 0) {
      const review = choices[0].message?.content as string;

      // If the review is not "No feedback.", add a comment to the PR
      if (review.trim() !== "No feedback.") {
        await addCommentToPR(fileName, review, httpsAgent);
      }
    }

    // Log the completion of the review
    console.log(`Review of ${fileName} completed.`);
  }
  catch (error: any) {
    // If there is an error, log it
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }
  }
}