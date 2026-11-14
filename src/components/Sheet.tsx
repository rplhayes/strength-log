/**
 * Bottom sheet used for confirmations and choices. Thumb-reachable on a phone.
 */
import type { ReactNode } from 'react';

export interface SheetAction {
  label: string;
  onClick: () => void;
  kind?: 'primary' | 'danger' | 'plain';
}

interface Props {
  title: string;
  children?: ReactNode;
  actions: SheetAction[];
  onClose: () => void;
}

export function Sheet({ title, children, actions, onClose }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="sheet-title">{title}</h2>
        {children && <div className="sheet-body">{children}</div>}
        <div className="sheet-actions">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={`btn btn-block btn-${a.kind ?? 'plain'}`}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
          <button type="button" className="btn btn-block btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
