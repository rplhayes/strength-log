/**
 * Tiny hash-based router. Hash routes work on GitHub Pages without any server
 * configuration and survive the app being reopened from the home screen.
 *
 *   #/                 home (programme picker)
 *   #/workout/:id      workout in progress
 *   #/history          history (stage 3)
 *   #/settings         settings (stage 5)
 *   #demos             developer animation review page (stage 4)
 */
import { useEffect, useState } from 'react';

function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h === '' ? '/' : h;
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

/** How many in-app navigations can be undone with history.back(). */
let inAppDepth = 0;

export function navigate(path: string): void {
  if (currentPath() === path) return;
  inAppDepth += 1;
  window.location.hash = path;
}

/**
 * Go back to the previous screen if we got here by navigating inside the app,
 * otherwise to `fallback` (e.g. the app was reopened directly on this page).
 */
export function goBack(fallback: string): void {
  if (inAppDepth > 0) {
    inAppDepth -= 1;
    window.history.back();
  } else {
    navigate(fallback);
  }
}
