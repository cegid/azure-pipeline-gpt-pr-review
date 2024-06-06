import { test, expect } from 'vitest'
import { addNewComment, deleteExistingComments } from '../src/pr';
import fetch from 'node-fetch';
import { Agent } from 'https';

const httpsAgent = new Agent();

test('addNewComment: should post a new comment', async () => {
  const fileName = 'file1.txt';
  const comment = 'This is a comment';

  // Mock de la réponse de fetch
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({})
  });

  await addNewComment(httpsAgent, fileName, comment);

  // Vérifie que fetch a été appelé avec les bons arguments
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/pullRequests/'), expect.objectContaining({
    method: 'POST',
    headers: { 'Authorization': expect.any(String), 'Content-Type': 'application/json' },
    body: expect.any(String),
    agent: httpsAgent
  }));
});

test('deleteExistingComments: should delete existing comments', async () => {
  // Mock de la réponse de fetch
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ value: [{ threadContext: null, id: 1 }] }),
  });

  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ value: [{ author: { displayName: 'Build Service' }, id: 1 }] }),
  });

  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({}),
  });

  await deleteExistingComments(httpsAgent);

  // Vérifie que fetch a été appelé avec les bons arguments
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/threads/'), expect.objectContaining({
    headers: { Authorization: expect.any(String) },
    agent: httpsAgent
  }));
});