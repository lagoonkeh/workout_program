// tests/setup.ts
import '@testing-library/jest-dom';
import { vi, afterEach, beforeAll } from 'vitest';

// 0. Resolve the code-split app views up front so tests can switch tabs and assert synchronously.
// Imported dynamically inside beforeAll so each test file's vi.mock() registrations apply.
beforeAll(async () => {
  const { preloadLazyViews } = await import('../src/lazyView');
  await preloadLazyViews();
});

// 1. Mock LocalStorage
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MockLocalStorage(),
  writable: true,
});

// 2. Synthetic Web Audio API mock
class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'running';
  currentTime: number = 0;
  destination: Record<string, unknown> = {};

  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }

  resume() {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).webkitAudioContext = MockAudioContext;

// 3. Mock window.matchMedia for responsive testing
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
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
}

// 4. Mock Web Speech API (SpeechSynthesis & SpeechSynthesisUtterance)
class MockSpeechSynthesisUtterance {
  text: string = '';
  lang: string = 'en-US';
  pitch: number = 1;
  rate: number = 1;
  volume: number = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text?: string) {
    this.text = text || '';
  }
}

class MockSpeechSynthesis {
  speaking: boolean = false;
  paused: boolean = false;
  pending: boolean = false;
  public spokenUtterances: MockSpeechSynthesisUtterance[] = [];

  speak = vi.fn((utterance: MockSpeechSynthesisUtterance) => {
    this.speaking = true;
    this.spokenUtterances.push(utterance);
    if (utterance.onend) {
      setTimeout(() => {
        this.speaking = false;
        utterance.onend?.();
      }, 0);
    }
  });

  cancel = vi.fn(() => {
    this.speaking = false;
    this.spokenUtterances = [];
  });

  pause = vi.fn(() => {
    this.paused = true;
  });

  resume = vi.fn(() => {
    this.paused = false;
  });

  getVoices = vi.fn(() => []);
}

const mockSpeechInstance = new MockSpeechSynthesis();
(globalThis as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
(globalThis as any).speechSynthesis = mockSpeechInstance;
if (typeof window !== 'undefined') {
  (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  (window as any).speechSynthesis = mockSpeechInstance;
}

// 5. Mock Web Notification API
class MockNotification {
  static permission: NotificationPermission = 'granted';
  static requestPermission = vi.fn().mockResolvedValue('granted');
  title: string;
  options: any;
  onclick: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(title: string, options?: any) {
    this.title = title;
    this.options = options;
  }

  close = vi.fn();
}

(globalThis as any).Notification = MockNotification;
if (typeof window !== 'undefined') {
  (window as any).Notification = MockNotification;
}

// 6. Mock navigator.vibrate & navigator.wakeLock
if (typeof navigator !== 'undefined') {
  if (!('vibrate' in navigator)) {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
    });
  } else {
    navigator.vibrate = vi.fn().mockReturnValue(true);
  }

  Object.defineProperty(navigator, 'wakeLock', {
    value: {
      request: vi.fn().mockResolvedValue({
        release: vi.fn().mockResolvedValue(undefined),
        addEventListener: vi.fn(),
      }),
    },
    writable: true,
  });
}

// 7. Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockSpeechInstance.spokenUtterances = [];
});

