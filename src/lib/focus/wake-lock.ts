/**
 * Screen Wake Lock API Manager for Active Focus Sessions
 * Prevents device screens from auto-dimming or sleeping during active deep work sessions.
 */

/**
 * Checks whether the Screen Wake Lock API is supported in the current environment.
 * Safely handles SSR and environments where navigator is undefined.
 */
export function isWakeLockSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'wakeLock' in navigator &&
    typeof navigator.wakeLock?.request === 'function'
  );
}

/**
 * Requests a screen wake lock from the browser.
 * Returns the acquired WakeLockSentinel on success, or null if unsupported or rejected.
 */
export async function requestScreenWakeLock(): Promise<WakeLockSentinel | null> {
  if (!isWakeLockSupported()) {
    return null;
  }

  try {
    return await navigator.wakeLock.request('screen');
  } catch {
    return null;
  }
}

/**
 * Releases an active screen wake lock sentinel safely.
 * Handles null sentinels, avoids releasing already-released sentinels, and swallows any errors.
 */
export async function releaseScreenWakeLock(
  sentinel: WakeLockSentinel | null
): Promise<void> {
  if (!sentinel || sentinel.released) {
    return;
  }

  try {
    await sentinel.release();
  } catch {
    // Prevent release errors from escaping or crashing caller
  }
}
