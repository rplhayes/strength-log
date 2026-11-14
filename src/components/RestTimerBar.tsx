/** Persistent rest-timer bar at the bottom of the workout screen. */
import type { RestTimerState } from '../lib/useRestTimer';

interface Props {
  timer: RestTimerState;
  remainingMs: number;
  done: boolean;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
}

function fmtClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RestTimerBar({ timer, remainingMs, done, onAdjust, onSkip }: Props) {
  const fraction = done ? 0 : Math.min(1, remainingMs / (timer.duration * 1000));
  return (
    <div className={`rest-bar ${done ? 'rest-done' : ''}`} role="timer" aria-live="polite">
      <div className="rest-progress" style={{ transform: `scaleX(${fraction})` }} />
      <div className="rest-main">
        <div className="rest-info">
          <span className="rest-clock">{done ? 'Rest over' : fmtClock(remainingMs)}</span>
          <span className="rest-label">{done ? 'Time for your next set' : `Rest · ${timer.label}`}</span>
        </div>
        <div className="rest-actions">
          {!done && (
            <>
              <button type="button" className="rest-btn" onClick={() => onAdjust(-15)} aria-label="Remove 15 seconds">
                −15
              </button>
              <button type="button" className="rest-btn" onClick={() => onAdjust(15)} aria-label="Add 15 seconds">
                +15
              </button>
            </>
          )}
          <button type="button" className="rest-btn rest-skip" onClick={onSkip}>
            {done ? 'OK' : 'Skip'}
          </button>
        </div>
      </div>
      <p className="rest-note">The tone only plays while the app is open on screen (an iOS limit).</p>
    </div>
  );
}
