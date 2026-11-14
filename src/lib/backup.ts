/**
 * Backup and restore.
 *
 * Export produces two files:
 *  - a full JSON backup (everything needed to restore the app), and
 *  - a CSV of every set, for spreadsheets.
 * They are offered through the iOS share sheet (so they can be saved to
 * iCloud Drive / Files), falling back to ordinary downloads.
 *
 * Import reads a JSON backup, validates it, and replaces all data after the
 * user confirms.
 */
import { db, getMeta, initDatabase, setMeta } from '../db/db';
import type { Exercise, MetaEntry, Session, SetEntry } from '../db/types';

export const BACKUP_FORMAT = 'strength-log-backup';
export const BACKUP_VERSION = 1;

/** Settings worth carrying across a restore. */
const META_KEYS_IN_BACKUP = ['theme', 'appName'];

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  exercises: Exercise[];
  sessions: Session[];
  sets: SetEntry[];
  meta: MetaEntry[];
}

export async function buildBackup(): Promise<BackupFile> {
  const [exercises, sessions, sets, meta] = await Promise.all([
    db.exercises.toArray(),
    db.sessions.toArray(),
    db.sets.toArray(),
    db.meta.where('key').anyOf(META_KEYS_IN_BACKUP).toArray(),
  ]);
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: Date.now(), exercises, sessions, sets, meta };
}

// ─── CSV ────────────────────────────────────────────────────────────────────

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const localTime = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const WEIGHT_TYPE: Record<Exercise['loadType'], string> = {
  total: 'total',
  perDumbbell: 'per dumbbell',
  added: 'added to bodyweight',
};

/** One row per set, oldest first. */
export async function buildSetsCsv(b: BackupFile): Promise<string> {
  const programmes = new Map((await db.programmes.toArray()).map((p) => [p.id, p.name]));
  const sessions = new Map(b.sessions.map((s) => [s.id!, s]));
  const exercises = new Map(b.exercises.map((e) => [e.id, e]));
  const header = ['date', 'time', 'programme', 'exercise', 'set', 'reps', 'weight_kg', 'weight_type', 'estimated_1rm_kg', 'session_id'];
  const rows: string[] = [header.join(',')];

  const sorted = [...b.sets].sort((x, y) => x.timestamp - y.timestamp);
  const setNumber = new Map<string, number>();
  for (const s of sorted) {
    const key = `${s.sessionId}:${s.exerciseId}`;
    const n = (setNumber.get(key) ?? 0) + 1;
    setNumber.set(key, n);
    const session = sessions.get(s.sessionId);
    const ex = exercises.get(s.exerciseId);
    const e1rm = ex?.loadType === 'added' ? '' : (s.weight * (1 + s.reps / 30)).toFixed(1);
    rows.push(
      [
        localDate(s.timestamp),
        localTime(s.timestamp),
        session ? programmes.get(session.programmeId) ?? session.programmeId : '',
        ex?.name ?? s.exerciseId,
        n,
        s.reps,
        s.weight,
        ex ? WEIGHT_TYPE[ex.loadType] : '',
        e1rm,
        s.sessionId,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return rows.join('\n') + '\n';
}

// ─── Export ─────────────────────────────────────────────────────────────────

export interface PreparedExport {
  files: File[];
  sessions: number;
  sets: number;
}

/** Build the files. Kept separate from sharing, which must run inside a tap. */
export async function prepareExport(): Promise<PreparedExport> {
  const b = await buildBackup();
  const csv = await buildSetsCsv(b);
  const stamp = localDate(b.exportedAt);
  const files = [
    new File([JSON.stringify(b, null, 1)], `strength-log-backup-${stamp}.json`, { type: 'application/json' }),
    new File([csv], `strength-log-sets-${stamp}.csv`, { type: 'text/csv' }),
  ];
  return { files, sessions: b.sessions.length, sets: b.sets.length };
}

/**
 * Hand the files to the iOS share sheet, or download them where sharing files
 * isn't supported. Call this directly from a tap handler.
 * Returns false if the user cancelled the share sheet.
 */
export async function deliverExport(prepared: PreparedExport): Promise<boolean> {
  const { files } = prepared;
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title: 'Strength Log backup' });
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return false;
      throw err;
    }
  } else {
    for (const f of files) {
      const url = URL.createObjectURL(f);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  }
  await setMeta('lastBackup', Date.now());
  return true;
}

// ─── Import ─────────────────────────────────────────────────────────────────

/** Parse and validate a backup file. Throws an Error with a readable message. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file isn’t valid JSON. Choose a Strength Log backup (.json) file.');
  }
  const b = data as Partial<BackupFile>;
  if (!b || b.format !== BACKUP_FORMAT) throw new Error('This isn’t a Strength Log backup file.');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app. Update the app first.');
  }
  if (!Array.isArray(b.exercises) || !Array.isArray(b.sessions) || !Array.isArray(b.sets)) {
    throw new Error('The backup file is incomplete or damaged.');
  }
  const sessionIds = new Set<number>();
  for (const s of b.sessions) {
    if (typeof s?.id !== 'number' || typeof s.programmeId !== 'string' || typeof s.startedAt !== 'number') {
      throw new Error('The backup contains a damaged workout entry.');
    }
    sessionIds.add(s.id);
  }
  for (const s of b.sets) {
    if (
      typeof s?.sessionId !== 'number' ||
      typeof s.exerciseId !== 'string' ||
      typeof s.reps !== 'number' ||
      typeof s.weight !== 'number' ||
      typeof s.timestamp !== 'number'
    ) {
      throw new Error('The backup contains a damaged set entry.');
    }
    if (!sessionIds.has(s.sessionId)) throw new Error('The backup has sets that don’t belong to any workout.');
  }
  for (const e of b.exercises) {
    if (typeof e?.id !== 'string' || typeof e.name !== 'string') throw new Error('The backup contains a damaged exercise.');
  }
  return b as BackupFile;
}

export interface DataSummary {
  sessions: number;
  sets: number;
  first?: number;
  last?: number;
}

export function summariseBackup(b: BackupFile): DataSummary {
  const starts = b.sessions.map((s) => s.startedAt);
  return {
    sessions: b.sessions.length,
    sets: b.sets.length,
    first: starts.length ? Math.min(...starts) : undefined,
    last: starts.length ? Math.max(...starts) : undefined,
  };
}

export async function summariseCurrent(): Promise<DataSummary> {
  const sessions = await db.sessions.orderBy('startedAt').toArray();
  return {
    sessions: sessions.length,
    sets: await db.sets.count(),
    first: sessions[0]?.startedAt,
    last: sessions[sessions.length - 1]?.startedAt,
  };
}

/** Replace ALL workout data and exercise settings with the backup's contents. */
export async function restoreBackup(b: BackupFile): Promise<void> {
  await db.transaction('rw', [db.exercises, db.sessions, db.sets, db.meta], async () => {
    await Promise.all([db.exercises.clear(), db.sessions.clear(), db.sets.clear()]);
    await db.meta.delete('restTimer');
    await db.exercises.bulkPut(b.exercises);
    await db.sessions.bulkPut(b.sessions);
    await db.sets.bulkPut(b.sets);
    for (const m of b.meta ?? []) if (META_KEYS_IN_BACKUP.includes(m.key)) await db.meta.put(m);
    // The restored data is, by definition, backed up.
    await db.meta.put({ key: 'lastBackup', value: b.exportedAt });
  });
  // Add any exercises that are new since the backup was made.
  await initDatabase();
}

export async function getLastBackup(): Promise<number | undefined> {
  return getMeta<number>('lastBackup');
}
