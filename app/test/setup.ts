/**
 * Vitest Setup File
 * Configures testing environment for React components
 */

import { expect, afterEach, vi, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Service Worker setup for API endpoints
const mockFetch = vi.fn();
const jobStates: Map<string, number> = new Map(); // Track stage per job
let pollCount = 0;

beforeAll(() => {
  // Mock fetch globally for API calls
  global.fetch = mockFetch;
});

// Setup default mock responses for API endpoints
mockFetch.mockImplementation((url: string, options?: any) => {
  console.log('Mock fetch called:', url, options?.method);

  // POST /api/extract-text
  if (url.includes('/api/extract-text') && options?.method === 'POST') {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        jobId: 'mock-job-123',
        status: 'completed',
        extractedTexts: [
          { pageNumber: 1, text: 'Mock text from page 1' },
          { pageNumber: 2, text: 'Mock text from page 2' },
        ],
      }),
    } as any);
  }

  // POST /api/refine-text
  if (url.includes('/api/refine-text') && options?.method === 'POST') {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        jobId: 'mock-job-123',
        status: 'completed',
        refinedText: 'Mock refined text from all pages',
      }),
    } as any);
  }

  // POST /api/generate-audio
  if (url.includes('/api/generate-audio') && options?.method === 'POST') {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        jobId: 'mock-job-123',
        status: 'completed',
        audioUrl: '/api/audio/mock-job-123',
      }),
    } as any);
  }

  // GET /api/jobs/:jobId
  if (url.includes('/api/jobs/') && options?.method !== 'POST') {
    pollCount++;
    // Advance stage after a few polls
    let stage = 0;
    if (pollCount > 2) stage = 1;
    if (pollCount > 4) stage = 2;
    if (pollCount > 6) stage = 3; // Beyond completion to stop polling

    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        jobId: 'mock-job-123',
        stage: stage,
        currentItem: pollCount,
        totalItems: 5,
        status: stage === 3 ? 'completed' : 'processing',
      }),
    } as any);
  }

  // GET /api/audio/:jobId
  if (url.includes('/api/audio/')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      blob: async () => new Blob(['mock audio data'], { type: 'audio/mpeg' }),
    } as any);
  }

  // Default response
  return Promise.reject(new Error(`Unhandled fetch: ${url}`));
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  mockFetch.mockClear();
  pollCount = 0;
  jobStates.clear();
});

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock HTMLMediaElement
window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn();

// Mock for audio metadata
Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
  get: () => 0,
  configurable: true,
});

Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
  get: () => 0,
  set: vi.fn(),
  configurable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});
