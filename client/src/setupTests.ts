import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import fetch from 'cross-fetch';

global.fetch = fetch;

// Define handlers for mock API calls
export const handlers = [
  http.get('/api/songs/my-uploads', () => {
    return HttpResponse.json([
      {
        id: '1',
        title: 'Test Song',
        artist: 'Test Artist',
        ipfsHash: 'Qm...',
        uploadedBy: '0x...',
        createdAt: new Date().toISOString()
      }
    ]);
  }),

  http.post('/api/ipfs/upload', () => {
    return HttpResponse.json({
      Hash: 'QmTest...'
    });
  })
];

const server = setupServer(...handlers);

// Establish API mocking before all tests
beforeAll(() => {
  server.listen();
});

// Reset any request handlers that we may add during the tests
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});