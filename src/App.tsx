/** Top-level layout and routing. */
import { useRoute } from './lib/router';
import { HomeScreen } from './screens/Home';
import { WorkoutScreen } from './screens/Workout';
import { SummaryScreen } from './screens/Summary';
import { TabBar } from './components/TabBar';

export function App() {
  const path = useRoute();

  const workout = path.match(/^\/workout\/(\d+)$/);
  if (workout) return <WorkoutScreen sessionId={Number(workout[1])} />;

  const summary = path.match(/^\/summary\/(\d+)$/);
  if (summary) return <SummaryScreen sessionId={Number(summary[1])} />;

  if (path === '/history') {
    return (
      <>
        <Placeholder title="History" note="Session list and progress charts arrive in stage 3." />
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
