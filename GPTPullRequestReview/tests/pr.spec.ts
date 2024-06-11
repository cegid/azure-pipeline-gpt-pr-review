import { test, expect, vi, Mock } from 'vitest';
import { addCommentToPR, deleteExistingComments } from '../src/pr';
import * as tl from "azure-pipelines-task-lib/task";
import fetch from 'node-fetch';
import { Agent } from 'https';

vi.mock('node-fetch', () => ({ default: vi.fn() }));
vi.mock("azure-pipelines-task-lib/task", () => ({
  getVariable: vi.fn()
}));

test('addCommentToPR: should send a POST request to create a new comment', async () => {
  const mockAgent = new Agent();
  const mockBody = JSON.stringify({
    comments: [{ parentCommentId: 0, content: 'Test comment', commentType: 1 }],
    status: 1,
    threadContext: { filePath: 'testFile.txt' },
  });

  (tl.getVariable as unknown as Mock).mockImplementation((variable) => {
    if (variable === 'SYSTEM.TEAMFOUNDATIONCOLLECTIONURI') return 'https://dev.azure.com/ExampleOrg/';
    if (variable === 'SYSTEM.TEAMPROJECTID') return 'ExampleProjectId';
    if (variable === 'Build.Repository.Name') return 'ExampleRepo';
    if (variable === 'System.PullRequest.PullRequestId') return '123';
    if (variable === 'SYSTEM.ACCESSTOKEN') return 'exampleToken';
  });

  vi.mock("node-fetch");
  (fetch as unknown as Mock).mockResolvedValueOnce({ ok: true });

  await addCommentToPR('testFile.txt', 'Test comment', mockAgent);

  expect(fetch).toHaveBeenCalledWith(
    'https://dev.azure.com/ExampleOrg/ExampleProjectId/_apis/git/repositories/ExampleRepo/pullRequests/123/threads?api-version=5.1',
    {
      method: 'POST',
      headers: { 'Authorization': 'Bearer exampleToken', 'Content-Type': 'application/json' },
      body: mockBody,
      agent: mockAgent
    }
  );
});



test('addCommentToPR: should log "New comment added."', async () => {
  const consoleSpy = vi.spyOn(console, 'log');
  const mockAgent = new Agent();
  (fetch as unknown as Mock).mockResolvedValueOnce({ ok: true });

  await addCommentToPR('testFile.txt', 'Another test comment', mockAgent);

  expect(consoleSpy).toHaveBeenCalledWith('New comment added.');
});

// Mock fetch and other external dependencies
vi.mock('../src/systemVariables', () => ({
  getSystemVariables: () => ({
    systemCollectionUri: 'https://dev.azure.com/ExampleOrg/',
    systemProjectId: 'ExampleProjectId',
    systemRepositoryName: 'ExampleRepo',
    systemPullRequestId: '123',
    systemAccessToken: 'exampleToken',
    systemProject: 'ExampleProject'
  }),
  getCollectionName: () => 'ExampleOrg'
}));
