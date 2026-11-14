/** Top-level layout and routing. */
import { useRoute } from './lib/router';
import { HomeScreen } from './screens/Home';
import { WorkoutScreen } from './screens/Workout';
import { SummaryScreen } from './screens/Summary';
import { DemosScreen } from './screens/Demos';
import { DemoScreen } from './screens/Demo';
import { HistoryScreen } from './screens/History';
import { SessionDetailScreen } from './screens/SessionDetail';
import { lazy, Suspense } from 'react';

// The progress page pulls in the charting library, so it is loaded on demand
// (it is still precached for offline use once the PWA is set up).
const ExerciseDetailScreen = lazy(() =>
  import('./screens/ExerciseDetail').then((m) => ({ default: m.ExerciseDetailScreen })),
);
import { TabBar } from './components/TabBar';

export function App() {
  const path = useRoute();

  if (path === 'demos' || path === '/demos') return <DemosScreen />;

  const demo = path.match(/^\/exercise\/([\w-]+)\/demo$/);
  if (demo) return <DemoScreen exerciseId={demo[1]} />;

  const workout = path.match(/^\/workout\/(\d+)$/);
  if (workout) return <WorkoutScreen sessionId={Number(workout[1])} />;

  const summary = path.match(/^\/summary\/(\d+)$/);
  if (summary) return <SummaryScreen sessionId={Number(summary[1])} />;

  const sessionDetail = path.match(/^\/history\/session\/(\d+)$/);
  if (sessionDetail) {
    return (
      <>
        <SessionDetailScreen sessionId={Number(sessionDetail[1])} />
        <TabBar active="history" />
      </>
    );
  }

  const exerciseDetail = path.match(/^\/exercise\/([\w-]+)$/);
  if (exerciseDetail) {
    return (
      <>
        <Suspense fallback={<main className="screen" />}>
          <ExerciseDetailScreen exerciseId={exerciseDetail[1]} />
        </Suspense>
        <TabBar active="history" />
      </>
    );
  }

  if (path === '/history') {
    return (
      <>
        <HistoryScreen />
        <TabBar active="history" />
      </>
    );
  }

  if (path === '/settings') {
    return (
      <>
        <Placeholder title="Settings" note="Exercise editing, backups and theme arrive in stage 5." />
        <TabBar active="settings" />
      </>
    );
  }

  return (
    <>
      <HomeScreen />
      <TabBar active="workout" />
    </>
  );
}

function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <main className="screen">
      <header className="screen-header">
        <h1>{title}</h1>
      </header>
      <p className="muted">{note}</p>
    </main>
  );
}
