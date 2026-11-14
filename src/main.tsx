import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initDatabase } from './db/db';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

// Seed the database before the first render so screens always have data.
initDatabase()
  .then(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((err) => {
    console.error(err);
    root.render(
      <main className="screen">
        <h1>Couldn’t open storage</h1>
        <p>{String(err)}</p>
        <p>If you’re in a private browsing tab, open the app in a normal tab instead.</p>
      </main>,
    );
  });
