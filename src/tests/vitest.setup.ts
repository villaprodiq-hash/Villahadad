import { vi, beforeEach } from 'vitest';

const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  get length() {
    return Object.keys(localStorageMock.store).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageMock.store)[index] || null),
};

const navigatorMock = {
  onLine: true,
  userAgent: 'vitest',
  language: 'en-US',
};

const windowMock = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  electronAPI: {
    fileSystem: {
      checkNasStatus: vi.fn().mockResolvedValue({ connected: false }),
    },
    db: {
      query: vi.fn().mockResolvedValue([]),
    },
  },
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: navigatorMock, writable: true });
Object.defineProperty(globalThis, 'window', { value: windowMock, writable: true });

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    },
  });
}

beforeEach(() => {
  localStorageMock.store = {};
  vi.clearAllMocks();
});
