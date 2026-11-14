/**
 * Registers the service worker (offline support) and reports when a new
 * version of the app has been downloaded. The update is only applied when the
 * user taps "Update", so the app never reloads in the middle of a workout.
 */
import { useRegisterSW } from 'virtual:pwa-register/react';

export function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for a new version each time the app is opened, and hourly while open.
      if (!registration) return;
      void registration.update();
      setInterval(() => void registration.update(), 60 * 60 * 1000);
    },
  });
  return { needRefresh, offlineReady, update: () => updateServiceWorker(true) };
}
