/**
 * Home: pick today's programme. Shows when each was last done, and a
 * "Resume workout" banner if a session is unfinished.
 */
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { finishSession, getLastSessionByProgramme, getUnfinishedSession, startSession } from '../db/queries';
import type { Programme, Session } from '../db/types';
import { fmtDate, fmtDaysAgo } from '../lib/format';
import { navigate } from '../lib/router';
import { Sheet } from '../components/Sheet';
import { setMeta } from '../db/db';
import { DEFAULT_APP_NAME, isStandalone, shouldRemindBackup, snoozeBackupReminder, useMeta } from '../lib/settings';
import { useUpdateState } from '../lib/updateContext';

export function HomeScreen() {
  const data = useLiveQuery(async () => {
    const programmes = (await db.programmes.toArray()).sort((a, b) => a.order - b.order);
    const last = await getLastSessionByProgramme();
    const unfinished = await getUnfinishedSession();
    const unfinishedSetCount = unfinished?.id
      ? await db.sets.where('sessionId').equals(unfinished.id).count()
      : 0;
    const remindBackup = await shouldRemindBackup();
    return { programmes, last, unfinished, unfinishedSetCount, remindBackup };
  }, []);
  const appName = useMeta<string>('appName', DEFAULT_APP_NAME);
  const installTipDismissed = useMeta<boolean>('installTipDismissed', false);
  const { needRefresh, update } = useUpdateState();

  // When the user picks a different programme while one is unfinished.
  const [conflict, setConflict] = useState<{ open: Session; wanted: Programme } | null>(null);

  if (!data) return null;
  const { programmes, last, unfinished, unfinishedSetCount, remindBackup } = data;
  const nameOf = (id: string) => programmes.find((p) => p.id === id)?.name ?? id;

  const begin = async (p: Programme) => {
    const id = await startSession(p);
    navigate(`/workout/${id}`);
  };

  const onPick = async (p: Programme) => {
    if (unfinished?.id !== undefined) {
      if (unfinished.programmeId === p.id) return navigate(`/workout/${unfinished.id}`);
      if (unfinishedSetCount === 0) {
        // Nothing logged in the open session — just clear it away.
        await finishSession(unfinished.id);
        return begin(p);
      }
      return setConflict({ open: unfinished, wanted: p });
    }
    await begin(p);
  };

  return (
    <main className="screen">
      <header className="screen-header">
        <h1>{appName}</h1>
      </header>

      {needRefresh && (
        <div className="banner banner-update">
          <span>A new version of the app is ready.</span>
          <button type="button" className="btn btn-primary btn-small" onClick={update}>
            Update
          </button>
        </div>
      )}

      {unfinished?.id !== undefined && (
        <button
          type="button"
          className="banner banner-resume"
          onClick={() => navigate(`/workout/${unfinished.id}`)}
        >
          <span>
            <strong>Resume workout</strong>
            <br />
            {nameOf(unfinished.programmeId)} · started {fmtDaysAgo(unfinished.startedAt).toLowerCase()}
            {unfinishedSetCount > 0 && ` · ${unfinishedSetCount} sets logged`}
          </span>
          <span aria-hidden="true">›</span>
        </button>
      )}

      {remindBackup && (
        <div className="banner banner-reminder">
          <span>
            <strong>Time for a backup?</strong>
            <br />
            It’s been over a month. Your data only lives on this phone.
          </span>
          <span className="banner-actions">
            <button type="button" className="btn btn-primary btn-small" onClick={() => navigate('/settings')}>
              Back up
            </button>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => snoozeBackupReminder()}>
              Later
            </button>
          </span>
        </div>
      )}

      {!isStandalone() && !installTipDismissed && (
        <div className="banner banner-tip">
          <span>
            <strong>Install the app:</strong> in Safari tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
            It then works offline in the gym.
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            aria-label="Dismiss install tip"
            onClick={() => setMeta('installTipDismissed', true)}
          >
            ✕
          </button>
        </div>
      )}

      <p className="muted section-intro">Choose today’s workout</p>
      <div className="programme-list">
        {programmes.map((p) => {
          const s = last[p.id];
          return (
            <button key={p.id} type="button" className="programme-card" onClick={() => onPick(p)}>
              <span className="programme-name">{p.name}</span>
              <span className="programme-meta">
                {s ? (
                  <>
                    Last done {fmtDate(s.startedAt)}
                    <span className="programme-ago">{fmtDaysAgo(s.startedAt)}</span>
                  </>
                ) : (
                  'Not done yet'
                )}
              </span>
              <span className="programme-count muted">{p.slots.length} exercises</span>
            </button>
          );
        })}
      </div>

      {conflict && (
        <Sheet
          title={`${nameOf(conflict.open.programmeId)} workout is still open`}
          onClose={() => setConflict(null)}
          actions={[
            {
              label: `Resume ${nameOf(conflict.open.programmeId)}`,
              kind: 'primary',
              onClick: () => navigate(`/workout/${conflict.open.id}`),
            },
            {
              label: `Finish it and start ${conflict.wanted.name}`,
              onClick: async () => {
                await finishSession(conflict.open.id!);
                setConflict(null);
                await begin(conflict.wanted);
              },
            },
          ]}
        >
          <p>Your logged sets are kept either way.</p>
        </Sheet>
      )}
    </main>
  );
}
