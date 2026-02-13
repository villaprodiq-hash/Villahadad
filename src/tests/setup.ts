/**
 * 🧪 Test Setup
 * 
 * Configuration for Vitest test framework
 */

import { vi } from 'vitest';

// Mock window.electronAPI
global.window = {
  ...global.window,
  electronAPI: {
    db: {
      query: vi.fn(),
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
    },
    fileSystem: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      exists: vi.fn(),
      mkdir: vi.fn(),
      readdir: vi.fn(),
      checkNasStatus: vi.fn(),
    },
    autoUpdate: {
      checkForUpdates: vi.fn(),
      installUpdate: vi.fn(),
      onUpdateStatus: vi.fn(),
      onUpdateProgress: vi.fn(),
    },
    app: {
      getVersion: vi.fn(),
      getPlatform: vi.fn(),
      quit: vi.fn(),
      minimize: vi.fn(),
      maximize: vi.fn(),
    },
  },
} as unknown as Window & typeof globalThis;

// Mock import.meta.env
vi.mock('import.meta', () => ({
  env: {
    DEV: true,
    PROD: false,
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: 'test-key',
  },
}));

// Cleanup after each test
export const cleanup = () => {
  vi.clearAllMocks();
};
