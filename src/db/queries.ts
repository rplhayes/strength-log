/**
 * Database reads and writes used by the screens. Every write goes straight to
 * IndexedDB, so nothing is lost if the app is closed or crashes mid-workout.
 */
import Dexie from 'dexie';
import { db } from './db';
import type { Programme, Session, SetEntry, Slot } from './types';

// ─── Reads ──────────────────────────────────────────────────────────────────

/** The in-progress session, if there is one. */
export async function getUnfinishedSession(): Promise<Session | undefined> {
  return db.sessions
    .orderBy('startedAt')
    .reverse()
    .filter((s) => s.finishedAt === undefined)
    .first();
}

/** Most recent *finished* session for each programme (programmeId → session). */
export async function getLastSessionByProgramme(): Promise<Record<string, Session>> {
  const result: Record<string, Session> = {};
  const finished = await db.sessions
    .orderBy('startedAt')
    .reverse()
    .filter((s) => s.finishedAt !== undefined)
    .toArray();
  for (const s of finished) {
    if (!result[s.programmeId]) result[s.programmeId] = s;
  }
  return result;
}

/** All sets for one session, oldest first. */
export async function getSessionSets(sessionId: number): Promise<SetEntry[]> {
  return db.sets.where('sessionId').equals(sessionId).sortBy('timestamp');
}

/** Timestamp of the most recent set ever logged for an exercise, if any. */
async function lastSetTime(exerciseId: string): Promise<number | undefined> {
  const last = await db.sets
    .where('[exerciseId+timestamp]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .last();
  return last?.timestamp;
}

export interface LastTime {
  sessionId: number;
  date: number;
  sets: SetEntry[];
}

/**
 * The sets from the most recent session (other than `excludeSessionId`) in
 * which this exercise was done. Each exercise has completely separate history,
 * so the two exercises in an alternating slot never mix.
 */
export async function getLastTime(
  exerciseId: string,
  excludeSessionId?: number,
): Promise<LastTime | null> {
  const latest = await db.sets
    .where('[exerciseId+timestamp]')
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
    .reverse()
    .filter((s) => s.sessionId !== excludeSessionId)
    .first();
  if (!latest) return null;
  const sets = (await getSessionSets(latest.sessionId)).filter(
    (s) => s.exerciseId === exerciseId,
  );
  return { sessionId: latest.sessionId, date: sets[0]?.timestamp ?? latest.timestamp, sets };
}

/**
 * Which exercise a slot should show by default.
 * Single-exercise slots: that exercise.
 * Alternating slots: the exercise after the one done most recently (so two
 * exercises alternate). If none has been done yet, the first one.
 */
export async function defaultExerciseForSlot(slot: Slot): Promise<string> {
  if (slot.exerciseIds.length === 1) return slot.exerciseIds[0];
  let mostRecentIndex = -1;
  let mostRecentTime = -Infinity;
  for (const [i, id] of slot.exerciseIds.entries()) {
    const t = await lastSetTime(id);
    if (t !== undefined && t > mostRecentTime) {
      mostRecentTime = t;
      mostRecentIndex = i;
    }
  }
  if (mostRecentIndex === -1) return slot.exerciseIds[0];
  return slot.exerciseIds[(mostRecentIndex + 1) % slot.exerciseIds.length];
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/** Start a new session for a programme and return its ID. */
export async function startSession(programme: Programme): Promise<number> {
  const slotChoices: Record<string, string> = {};
  for (const slot of programme.slots) {
    slotChoices[slot.id] = await defaultExerciseForSlot(slot);
  }
  return db.sessions.add({
    programmeId: programme.id,
    startedAt: Date.now(),
    slotChoices,
  });
}

/** Change which exercise is used for a slot in this session only. */
export async function swapSlotExercise(
  sessionId: number,
  slotId: string,
  exerciseId: string,
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) return;
    await db.sessions.update(sessionId, {
      slotChoices: { ...session.slotChoices, [slotId]: exerciseId },
    });
  });
}

/**
 * Finish a session. A session with no logged sets is simply deleted, so an
 * accidental tap on a programme leaves no empty entry in the history.
 * Returns true if the session was kept.
 */
export async function finishSession(sessionId: number): Promise<boolean> {
  return db.transaction('rw', db.sessions, db.sets, async () => {
    const count = await db.sets.where('sessionId').equals(sessionId).count();
    if (count === 0) {
      await db.sessions.delete(sessionId);
      return false;
    }
    await db.sessions.update(sessionId, { finishedAt: Date.now() });
    return true;
  });
}

export async function logSet(
  sessionId: number,
  exerciseId: string,
  reps: number,
  weight: number,
): Promise<number> {
  return db.sets.add({ sessionId, exerciseId, reps, weight, timestamp: Date.now() });
}

export async function updateSet(id: number, reps: number, weight: number): Promise<void> {
  await db.sets.update(id, { reps, weight });
}

export async function deleteSet(id: number): Promise<void> {
  await db.sets.delete(id);
}

// ─── History ────────────────────────────────────────────────────────────────

export interface SessionListItem {
  session: Session;
  programmeName: string;
  setCount: number;
  /** Duration in ms (to the last set if the session is still open). */
  durationMs: number;
}

/** All sessions, newest first, with set counts. */
export async function listSessions(): Promise<SessionListItem[]> {
  const [sessions, programmes, sets] = await Promise.all([
    db.sessions.orderBy('startedAt').reverse().toArray(),
    db.programmes.toArray(),
    db.sets.toArray(),
  ]);
  const names = new Map(programmes.map((p) => [p.id, p.name]));
  const counts = new Map<number, { n: number; last: number }>();
  for (const s of sets) {
    const c = counts.get(s.sessionId) ?? { n: 0, last: 0 };
    c.n += 1;
    c.last = Math.max(c.last, s.timestamp);
    counts.set(s.sessionId, c);
  }
  return sessions.map((session) => {
    const c = counts.get(session.id!);
    const end = session.finishedAt ?? c?.last ?? session.startedAt;
    return {
      session,
      programmeName: names.get(session.programmeId) ?? session.programmeId,
      setCount: c?.n ?? 0,
      durationMs: end - session.startedAt,
    };
  });
}

/** Delete a session and all of its sets. */
export async function deleteSession(sessionId: number): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

/**
 * Add a forgotten set to a past session. Its timestamp is placed just after the
 * exercise's last set in that session, so ordering and personal-best history
 * stay correct.
 */
export async function addSetToSession(
  sessionId: number,
  exerciseId: string,
  reps: number,
  weight: number,
): Promise<number> {
  const session = await db.sessions.get(sessionId);
  const sets = await getSessionSets(sessionId);
  const sameEx = sets.filter((s) => s.exerciseId === exerciseId);
  const after = sameEx[sameEx.length - 1]?.timestamp ?? sets[sets.length - 1]?.timestamp ?? session?.startedAt ?? Date.now();
  return db.sets.add({ sessionId, exerciseId, reps, weight, timestamp: after + 1000 });
}
