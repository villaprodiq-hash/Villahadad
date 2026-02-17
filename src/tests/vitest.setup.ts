import { vi, beforeEach } from 'vitest';

type MockEventListener = (event: Event) => void;

const eventListeners = new Map<string, Set<MockEventListener>>();

const addMockEventListener = (type: string, listener: EventListenerOrEventListenerObject) => {
  const wrapped: MockEventListener =
    typeof listener === 'function'
      ? (listener as MockEventListener)
      : (event: Event) => {
          listener.handleEvent(event);
        };
  const current = eventListeners.get(type) ?? new Set<MockEventListener>();
  current.add(wrapped);
  eventListeners.set(type, current);
};

const removeMockEventListener = (type: string, listener: EventListenerOrEventListenerObject) => {
  const current = eventListeners.get(type);
  if (!current) return;
  for (const entry of current) {
    if (entry === listener || (typeof listener !== 'function' && entry === listener.handleEvent)) {
      current.delete(entry);
    }
  }
  if (current.size === 0) {
    eventListeners.delete(type);
  }
};

const dispatchMockEvent = (event: Event) => {
  const listeners = eventListeners.get(event.type);
  if (!listeners || listeners.size === 0) return true;
  for (const listener of listeners) {
    listener(event);
  }
  return true;
};

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
  addEventListener: vi.fn(addMockEventListener),
  removeEventListener: vi.fn(removeMockEventListener),
  dispatchEvent: vi.fn(dispatchMockEvent),
  localStorage: localStorageMock,
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
Object.defineProperty(globalThis, 'CustomEvent', {
  value:
    globalThis.CustomEvent ??
    class<T = unknown> extends Event {
      detail: T;
      constructor(event: string, params?: CustomEventInit<T>) {
        super(event);
        this.detail = params?.detail as T;
      }
    },
  writable: true,
});

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    },
  });
}

beforeEach(() => {
  localStorageMock.store = {};
  eventListeners.clear();
  navigatorMock.onLine = true;
  vi.clearAllMocks();
});
