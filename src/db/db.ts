/**
 * IndexedDB database (via Dexie). Everything the app stores lives here,
 * on the phone only.
 */
import Dexie, { type Table } from 'dexie';
import type { Exercise, MetaEntry, Programme, Session, SetEntry } from './types';
import { EXERCISES, PROGRAMMES } from '../data/programmes';

export class StrengthDB extends Dexie {
  exercises!: Table<Exercise, string>;
  programmes!: Table<Programme, string>;
  sessions!: Table<Session, number>;
  sets!: Table<SetEntry, number>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super('strength-log');
    // Only indexed fields are listed here; other fields are stored as-is.
    this.version(1).stores({
      exercises: 'id',
      programmes: 'id',
      sessions: '++id, programmeId, startedAt',
      // [exerciseId+timestamp] lets us find an exercise's most recent sets quickly.
      sets: '++id, sessionId, exerciseId, [exerciseId+timestamp]',
      meta: 'key',
    });
  }
}

export const db = new StrengthDB();

/**
 * Seed the database from src/data/programmes.ts and ask the browser to keep
 * our storage. Called once before the app renders.
 *
 * - Exercises: only missing ones are added, so edits made in Settings survive.
 * - Programmes: always overwritten from the data file, so new slot
 *   alternatives in the data file take effect on next launch.
 */
export async function initDatabase(): Promise<void> {
  await db.transaction('rw', db.exercises, db.programmes, async () => {
    const existing = new Set(await db.exercises.toCollection().primaryKeys());
    const missing = EXERCISES.filter((e) => !existing.has(e.id));
    if (missing.length) await db.exercises.bulkAdd(missing);
    await db.programmes.bulkPut(PROGRAMMES);
  });
  await requestPersistentStorage();
}

/**
 * Ask the browser not to evict our data under storage pressure. On iOS this is
 * generally only granted once the app has been added to the home screen, so we
 * ask on every launch until it is granted.
 */
async function requestPersistentStorage(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    const granted = await navigator.storage.persist();
    await setMeta('storagePersisted', granted);
  } catch {
    // Not supported — nothing to do.
  }
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
