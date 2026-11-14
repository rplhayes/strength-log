/**
 * App-wide settings stored in the meta table: theme, app name, and reminder
 * state. The theme is mirrored to localStorage so index.html can apply it
 * before the first paint (no flash of the wrong theme).
 */
import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getMeta, setMeta } from '../db/db';

export type Theme = 'dark' | 'light';
export const DEFAULT_APP_NAME = 'Strength Log';
const DAY = 86_400_000;
export const BACKUP_REMINDER_DAYS = 30;

/** Live value of a meta key, or `fallback` while loading / when unset. */
export function useMeta<T>(key: string, fallback: T): T {
  const v = useLiveQuery(() => db.meta.get(key), [key]);
  return (v?.value as T | undefined) ?? fallback;
}

export async function setTheme(theme: Theme): Promise<void> {
  await setMeta('theme', theme);
}

export async function setAppName(name: string): Promise<void> {
  await setMeta('appName', name.trim() || DEFAULT_APP_NAME);
}

/** Apply the theme and app name to the document whenever they change. */
export function useApplySettings(): void {
  const theme = useMeta<Theme>('theme', 'dark');
  const appName = useMeta<string>('appName', DEFAULT_APP_NAME);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Storage unavailable (private mode) — the theme still applies this session.
    }
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#0f1115');
  }, [theme]);

  useEffect(() => {
    document.title = appName;
  }, [appName]);
}

/**
 * Whether to show the home-screen backup reminder: there is training data,
 * and no backup for 30 days (counting from the first workout if never backed
 * up), and the reminder isn't snoozed.
 */
export async function shouldRemindBackup(now = Date.now()): Promise<boolean> {
  const first = await db.sessions.orderBy('startedAt').first();
  if (!first) return false;
  const snoozedUntil = (await getMeta<number>('backupSnoozedUntil')) ?? 0;
  if (now < snoozedUntil) return false;
  const last = (await getMeta<number>('lastBackup')) ?? first.startedAt;
  return now - last >= BACKUP_REMINDER_DAYS * DAY;
}

export async function snoozeBackupReminder(days = 7): Promise<void> {
  await setMeta('backupSnoozedUntil', Date.now() + days * DAY);
}

/** True when running as an installed home-screen app. */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}
