/**
 * Keep the screen awake while `enabled` (i.e. during a workout), using the
 * Screen Wake Lock API. The browser drops the lock whenever the app is hidden,
 * so it is re-acquired each time the app becomes visible again.
 */
import { useEffect } from 'react';

export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) await l.release();
        else lock = l;
      } catch {
        // Denied (e.g. Low Power Mode) — nothing else we can do.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}
