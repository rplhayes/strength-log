/**
 * Rest timer.
 *
 * The timer stores the moment rest ENDS (a timestamp), not a counter. The
 * remaining time is always `endsAt - now`, so it stays correct after the phone
 * is locked or the app is backgrounded (iOS pauses intervals there).
 *
 * The timer is also saved to IndexedDB, so it survives the app being reloaded.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getMeta, setMeta } from '../db/db';
import { playRestTone } from './sound';

export interface RestTimerState {
  sessionId: number;
  /** Epoch ms when rest finishes. */
  endsAt: number;
  /** Full rest length in seconds (for the progress bar). */
  duration: number;
  /** Exercise name shown on the bar. */
  label: string;
}

const META_KEY = 'restTimer';
/** Hide the "rest over" bar this long after the timer ends. */
const DONE_LINGER_MS = 60_000;
/** Only beep if we notice the end within this window (not hours later). */
const TONE_WINDOW_MS = 3_000;

export function useRestTimer(sessionId: number) {
  const [timer, setTimer] = useState<RestTimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const alerted = useRef(false);

  const save = useCallback((t: RestTimerState | null) => {
    setTimer(t);
    setNow(Date.now());
    void setMeta(META_KEY, t);
  }, []);

  // Restore a running timer for this session after a reload.
  useEffect(() => {
    void getMeta<RestTimerState | null>(META_KEY).then((t) => {
      if (t && t.sessionId === sessionId && Date.now() - t.endsAt < DONE_LINGER_MS) {
        alerted.current = Date.now() >= t.endsAt; // don't beep for an old timer
        setTimer(t);
      }
    });
  }, [sessionId]);

  // Re-render a few times a second while a timer exists, and immediately on return to the app.
  useEffect(() => {
    if (!timer) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [timer]);

  const remainingMs = timer ? timer.endsAt - now : 0;
  const done = !!timer && remainingMs <= 0;

  // Fire the tone once when rest finishes, and clear the bar a while later.
  useEffect(() => {
    if (!timer || !done) return;
    if (!alerted.current) {
      alerted.current = true;
      if (document.visibilityState === 'visible' && now - timer.endsAt < TONE_WINDOW_MS) playRestTone();
    }
    if (now - timer.endsAt > DONE_LINGER_MS) save(null);
  }, [timer, done, now, save]);

  const start = useCallback(
    (seconds: number, label: string) => {
      alerted.current = false;
      save({ sessionId, endsAt: Date.now() + seconds * 1000, duration: seconds, label });
    },
    [sessionId, save],
  );

  const adjust = useCallback(
    (deltaSec: number) => {
      if (!timer) return;
      const t = Date.now();
      const endsAt = Math.max(t, timer.endsAt + deltaSec * 1000);
      if (endsAt > t) alerted.current = false;
      save({ ...timer, endsAt, duration: Math.max(timer.duration, Math.ceil((endsAt - t) / 1000)) });
    },
    [timer, save],
  );

  const skip = useCallback(() => save(null), [save]);

  return { timer, remainingMs: Math.max(0, remainingMs), done, start, adjust, skip };
}
