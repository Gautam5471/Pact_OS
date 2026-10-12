/**
 * Unit tests for the Screen Wake Lock API Manager (src/lib/focus/wake-lock.ts).
 * Validates browser feature detection, SSR safety, acquisition lifecycles, and error boundaries.
 */

import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  isWakeLockSupported,
  requestScreenWakeLock,
  releaseScreenWakeLock,
} from '../src/lib/focus/wake-lock';

class FakeWakeLockSentinel extends EventTarget implements WakeLockSentinel {
  released = false;
  readonly type = 'screen' as const;
  onrelease: ((this: WakeLockSentinel, ev: Event) => unknown) | null = null;
  releaseCalls = 0;
  shouldReject = false;

  async release(): Promise<void> {
    this.releaseCalls++;
    if (this.shouldReject) {
      throw new Error('Device lock release failed');
    }
    this.released = true;
  }
}

describe('Screen Wake Lock API Manager', () => {
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

  afterEach(() => {
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
  });

  describe('isWakeLockSupported', () => {
    it('returns true when navigator.wakeLock.request is a supported function', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          wakeLock: {
            request: mock.fn(async () => new FakeWakeLockSentinel()),
          },
        },
        configurable: true,
        writable: true,
      });

      assert.equal(isWakeLockSupported(), true);
    });

    it('returns false when navigator lacks wakeLock property', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        configurable: true,
        writable: true,
      });

      assert.equal(isWakeLockSupported(), false);
    });

    it('returns false when navigator.wakeLock exists but request is not a function', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { wakeLock: {} },
        configurable: true,
        writable: true,
      });

      assert.equal(isWakeLockSupported(), false);
    });

    it('returns false in SSR environments where navigator is undefined', () => {
      delete (globalThis as { navigator?: unknown }).navigator;

      assert.equal(isWakeLockSupported(), false);
    });
  });

  describe('requestScreenWakeLock', () => {
    it('successfully requests screen wake lock with "screen" type and returns sentinel', async () => {
      const sentinel = new FakeWakeLockSentinel();
      const requestMock = mock.fn(async (type: string) => {
        assert.equal(type, 'screen');
        return sentinel;
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          wakeLock: {
            request: requestMock,
          },
        },
        configurable: true,
        writable: true,
      });

      const result = await requestScreenWakeLock();

      assert.equal(result, sentinel);
      assert.equal(requestMock.mock.callCount(), 1);
      assert.deepEqual(requestMock.mock.calls[0].arguments, ['screen']);
    });

    it('returns null when Screen Wake Lock API is unsupported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        configurable: true,
        writable: true,
      });

      const result = await requestScreenWakeLock();
      assert.equal(result, null);
    });

    it('returns null safely in SSR environments when navigator is undefined', async () => {
      delete (globalThis as { navigator?: unknown }).navigator;

      const result = await requestScreenWakeLock();
      assert.equal(result, null);
    });

    it('returns null without throwing when request rejects (e.g. NotAllowedError)', async () => {
      const requestMock = mock.fn(async () => {
        throw new Error('NotAllowedError: Wake lock permission denied');
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          wakeLock: {
            request: requestMock,
          },
        },
        configurable: true,
        writable: true,
      });

      const result = await requestScreenWakeLock();
      assert.equal(result, null);
      assert.equal(requestMock.mock.callCount(), 1);
    });
  });

  describe('releaseScreenWakeLock', () => {
    it('safely handles null sentinel as a no-op without error', async () => {
      await assert.doesNotReject(async () => {
        await releaseScreenWakeLock(null);
      });
    });

    it('releases a valid, unreleased sentinel and awaits completion', async () => {
      const sentinel = new FakeWakeLockSentinel();
      assert.equal(sentinel.released, false);
      assert.equal(sentinel.releaseCalls, 0);

      await releaseScreenWakeLock(sentinel);

      assert.equal(sentinel.released, true);
      assert.equal(sentinel.releaseCalls, 1);
    });

    it('does not attempt release if sentinel is already marked as released', async () => {
      const sentinel = new FakeWakeLockSentinel();
      sentinel.released = true;

      await releaseScreenWakeLock(sentinel);

      assert.equal(sentinel.releaseCalls, 0);
    });

    it('safely swallows errors when sentinel.release() promise rejects', async () => {
      const sentinel = new FakeWakeLockSentinel();
      sentinel.shouldReject = true;

      await assert.doesNotReject(async () => {
        await releaseScreenWakeLock(sentinel);
      });

      assert.equal(sentinel.releaseCalls, 1);
    });
  });
});
