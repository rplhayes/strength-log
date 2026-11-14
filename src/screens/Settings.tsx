/**
 * Settings: edit exercises, back up and restore, appearance, app name,
 * install instructions and app updates.
 */
import { useRef, useState, type ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  deliverExport,
  parseBackup,
  prepareExport,
  restoreBackup,
  summariseBackup,
  summariseCurrent,
  type BackupFile,
  type DataSummary,
  type PreparedExport,
} from '../lib/backup';
import { DEFAULT_APP_NAME, isStandalone, setAppName, setTheme, useMeta, type Theme } from '../lib/settings';
import { fmtDate, fmtDaysAgo, fmtKg, fmtTarget } from '../lib/format';
import { navigate } from '../lib/router';
import { useUpdateState } from '../lib/updateContext';
import { Segmented } from '../components/Segmented';
import { Sheet } from '../components/Sheet';

export function SettingsScreen() {
  return (
    <main className="screen">
      <header className="screen-header">
        <h1>Settings</h1>
      </header>
      <UpdateSection />
      <BackupSection />
      <ExercisesSection />
      <AppearanceSection />
      <InstallSection />
      <AboutSection />
    </main>
  );
}

// ─── Exercises ──────────────────────────────────────────────────────────────

function ExercisesSection() {
  const list = useLiveQuery(async () => {
    const programmes = (await db.programmes.toArray()).sort((a, b) => a.order - b.order);
    const exercises = new Map((await db.exercises.toArray()).map((e) => [e.id, e]));
    const seen = new Set<string>();
    return programmes.map((p) => ({
      programme: p,
      exercises: p.slots
        .flatMap((s) => s.exerciseIds)
        .filter((id) => !seen.has(id) && seen.add(id))
        .map((id) => exercises.get(id)!)
        .filter(Boolean),
    }));
  }, []);
  if (!list) return null;

  return (
    <section className="settings-section">
      <h2 className="section-title">Exercises</h2>
      <p className="muted small">Change names, targets, rest times and weight steps.</p>
      {list.map(({ programme, exercises }) =>
        exercises.length === 0 ? null : (
          <div key={programme.id} className="settings-group">
            <h3 className="settings-group-title">{programme.name}</h3>
            <ul className="history-list">
              {exercises.map((ex) => (
                <li key={ex.id}>
                  <button type="button" className="history-row" onClick={() => navigate(`/settings/exercise/${ex.id}`)}>
                    <span className="history-main">
                      <strong>{ex.name}</strong>
                      <span className="muted small">
                        {fmtTarget(ex)} · rest {ex.restSec} s · +{fmtKg(ex.increment)} kg
                      </span>
                    </span>
                    <span className="muted" aria-hidden="true">
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ),
      )}
    </section>
  );
}

// ─── Backup ─────────────────────────────────────────────────────────────────

function BackupSection() {
  const lastBackup = useMeta<number | undefined>('lastBackup', undefined);
  const [prepared, setPrepared] = useState<PreparedExport | null>(null);
  const [importing, setImporting] = useState<{ backup: BackupFile; incoming: DataSummary; current: DataSummary } | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onExport = async () => {
    setMessage(null);
    try {
      setPrepared(await prepareExport());
    } catch (err) {
      setMessage({ kind: 'error', text: `Couldn’t prepare the backup: ${String(err)}` });
    }
  };

  const onShare = async () => {
    if (!prepared) return;
    try {
      const done = await deliverExport(prepared);
      setPrepared(null);
      if (done) setMessage({ kind: 'ok', text: 'Backup saved.' });
    } catch (err) {
      setPrepared(null);
      setMessage({ kind: 'error', text: `Couldn’t share the backup: ${String(err)}` });
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      setImporting({ backup, incoming: summariseBackup(backup), current: await summariseCurrent() });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    }
  };

  const onRestore = async () => {
    if (!importing) return;
    try {
      await restoreBackup(importing.backup);
      setImporting(null);
      setMessage({ kind: 'ok', text: 'Backup restored.' });
    } catch (err) {
      setImporting(null);
      setMessage({ kind: 'error', text: `Restore failed, nothing was changed: ${String(err)}` });
    }
  };

  const describe = (s: DataSummary) =>
    s.sessions === 0
      ? 'No workouts'
      : `${s.sessions} ${s.sessions === 1 ? 'workout' : 'workouts'}, ${s.sets} sets (${fmtDate(s.first!)} – ${fmtDate(s.last!)})`;

  return (
    <section className="settings-section">
      <h2 className="section-title">Backup</h2>
      <p className="backup-status">
        Last backup: <strong>{lastBackup ? fmtDaysAgo(lastBackup).toLowerCase() : 'never'}</strong>
      </p>
      <p className="muted small">
        Your data lives only on this phone. Save a backup to iCloud Drive or Files regularly, so nothing is lost if
        the phone is lost or the app is removed.
      </p>
      <div className="button-row">
        <button type="button" className="btn btn-primary" onClick={onExport}>
          Export backup
        </button>
        <button type="button" className="btn btn-plain" onClick={() => fileInput.current?.click()}>
          Import backup
        </button>
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onFile} />
      {message && <p className={`notice notice-${message.kind}`}>{message.text}</p>}

      {prepared && (
        <Sheet
          title="Backup ready"
          onClose={() => setPrepared(null)}
          actions={[{ label: 'Save or share files', kind: 'primary', onClick: onShare }]}
        >
          <p>
            {prepared.sessions} workouts and {prepared.sets} sets, as two files: a full backup (.json) for restoring,
            and a spreadsheet of every set (.csv).
          </p>
          <p>In the share sheet, choose “Save to Files” and pick iCloud Drive.</p>
        </Sheet>
      )}

      {importing && (
        <Sheet
          title="Replace your data?"
          onClose={() => setImporting(null)}
          actions={[{ label: 'Replace with this backup', kind: 'danger', onClick: onRestore }]}
        >
          <p>
            <strong>Backup from {fmtDate(importing.backup.exportedAt)}:</strong> {describe(importing.incoming)}.
          </p>
          <p>
            <strong>On this phone now:</strong> {describe(importing.current)}.
          </p>
          <p>Everything currently on this phone, including exercise settings, will be replaced. This can’t be undone.</p>
        </Sheet>
      )}
    </section>
  );
}

// ─── Appearance ─────────────────────────────────────────────────────────────

function AppearanceSection() {
  const theme = useMeta<Theme>('theme', 'dark');
  const appName = useMeta<string>('appName', DEFAULT_APP_NAME);
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <section className="settings-section">
      <h2 className="section-title">Appearance</h2>
      <Segmented
        label="Theme"
        value={theme}
        onChange={(t) => void setTheme(t)}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ]}
      />
      <label className="field">
        <span className="field-label">App name</span>
        <input
          className="text-input"
          value={draft ?? appName}
          maxLength={30}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={async () => {
            if (draft !== null) await setAppName(draft);
            setDraft(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </label>
      <p className="muted small">
        Shown at the top of the home screen. The name under the home-screen icon is set when you add the app (you can
        type a different name then).
      </p>
    </section>
  );
}

// ─── Install ────────────────────────────────────────────────────────────────

function InstallSection() {
  const persisted = useLiveQuery(async () => (navigator.storage?.persisted ? navigator.storage.persisted() : false), []);
  const installed = isStandalone();
  return (
    <section className="settings-section">
      <h2 className="section-title">Install on iPhone</h2>
      {installed ? (
        <p>✓ Running from the home screen. The app works offline.</p>
      ) : (
        <ol className="install-steps">
          <li>Open this page in <strong>Safari</strong>.</li>
          <li>
            Tap the <strong>Share</strong> button (the square with an arrow).
          </li>
          <li>
            Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
          </li>
          <li>Open Strength Log from its new icon. It then works in aeroplane mode.</li>
        </ol>
      )}
      <p className="muted small">
        Protected storage: {persisted ? 'on — iOS won’t clear your data to free space.' : 'not granted yet (usually granted once the app is on the home screen). Keep backing up.'}
      </p>
    </section>
  );
}

// ─── Updates and about ──────────────────────────────────────────────────────

function UpdateSection() {
  const { needRefresh, update } = useUpdateState();
  if (!needRefresh) return null;
  return (
    <div className="banner banner-update">
      <span>A new version of the app is ready.</span>
      <button type="button" className="btn btn-primary btn-small" onClick={update}>
        Update
      </button>
    </div>
  );
}

function AboutSection() {
  return (
    <section className="settings-section">
      <h2 className="section-title">About</h2>
      <p className="muted small">
        Strength Log {__APP_VERSION__}. No accounts, no tracking — everything stays on this phone.
      </p>
      <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate('/demos')}>
        Review all exercise animations ›
      </button>
    </section>
  );
}
