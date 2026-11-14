/**
 * Large −/+ stepper with a tappable value that can also be typed into.
 * Designed for one-handed use: buttons are 56 px square.
 */
import { useEffect, useState } from 'react';
import { fmtKg, roundKg } from '../lib/format';

interface Props {
  label: string;
  value: number;
  step: number;
  min?: number;
  /** Allow decimals (weights) or whole numbers only (reps). */
  decimal?: boolean;
  onChange: (value: number) => void;
}

export function Stepper({ label, value, step, min = 0, decimal = false, onChange }: Props) {
  // Keep a text copy so the user can type freely (e.g. "42." mid-edit).
  const [text, setText] = useState(fmtKg(value));
  useEffect(() => setText(fmtKg(value)), [value]);

  const clamp = (n: number) => Math.max(min, decimal ? roundKg(n) : Math.round(n));

  const commitText = () => {
    const n = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(n)) onChange(clamp(n));
    else setText(fmtKg(value));
  };

  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-row">
        <button
          type="button"
          className="stepper-btn"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - step))}
        >
          −
        </button>
        <input
          className="stepper-value"
          inputMode={decimal ? 'decimal' : 'numeric'}
          aria-label={label}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <button
          type="button"
          className="stepper-btn"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + step))}
        >
          +
        </button>
      </div>
    </div>
  );
}
