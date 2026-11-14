/** Bottom navigation: Workout, History, Settings. */
import { navigate } from '../lib/router';

type Tab = 'workout' | 'history' | 'settings';

const TABS: { id: Tab; label: string; path: string; icon: string }[] = [
  // Simple inline SVG paths (24×24 viewBox).
  { id: 'workout', label: 'Workout', path: '/', icon: 'M3 10h2v4H3zM19 10h2v4h-2zM6 7h3v10H6zM15 7h3v10h-3zM9 11h6v2H9z' },
  { id: 'history', label: 'History', path: '/history', icon: 'M4 19h16v2H4zM6 11h3v6H6zM11 6h3v11h-3zM16 13h3v4h-3z' },
  { id: 'settings', label: 'Settings', path: '/settings', icon: 'M4 6h10v2H4zM17 5h3v4h-3zM4 16h4v2H4zM11 15h9v4h-9zM16 6h1v2h-1z' },
];

export function TabBar({ active }: { active: Tab }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab ${active === t.id ? 'tab-active' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => navigate(t.path)}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d={t.icon} fill="currentColor" />
          </svg>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
