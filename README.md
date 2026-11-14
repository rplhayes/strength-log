# Strength Log

A personal strength-training log for iPhone. It runs as a web app that you add
to your home screen from Safari, and works fully offline in the gym. There are
no accounts and no cloud: all of your data stays on your phone.

**App address:** https://rplhayes.github.io/strength-log/

## What it does

- Three workouts: **Posterior**, **Anterior**, and **Shoulders & arms**, each
  starting with chin-ups. The posterior day alternates Romanian and
  conventional deadlifts automatically.
- Large buttons for logging sets one-handed. Weights and reps are filled in
  from last time, and every set is saved the moment you log it.
- A rest timer, suggestions for when to add weight, and personal bests.
- History, with progress charts for every exercise.
- An animated demo for every exercise, showing the muscles it works and three
  coaching cues.
- Backup to iCloud Drive or Files, and restore from a backup.

## Installing on your iPhone

1. Open **Safari** on your iPhone and go to the app address above.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**, then tap **Add**.
4. Open **Strength Log** from its new home-screen icon.

After it has opened once, the app works without any internet connection,
including in aeroplane mode.

> Use Safari for this step. "Add to Home Screen" from other browsers may not
> give you the offline, full-screen app.

## Keeping your data safe

Your workouts are stored only on your phone. Back them up regularly:

1. In the app, go to **Settings → Backup → Export backup**.
2. Tap **Save or share files**, choose **Save to Files**, and pick
   **iCloud Drive**.

This saves two files:

- a full backup (`.json`), which you can restore with **Import backup**;
- a spreadsheet of every set (`.csv`).

The home screen reminds you if you haven't backed up for 30 days.

## Publishing the app (one-time setup)

The app is published to GitHub Pages automatically by GitHub Actions, using the
workflow in `.github/workflows/deploy.yml`. To switch this on:

1. On GitHub, open the repository and go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab, open **Deploy to GitHub Pages**, and click
   **Run workflow**. Every change to the `main` branch after this publishes
   automatically.
4. After a minute or two the app is live at the address above. A green tick on
   the latest run in the Actions tab means it worked.

### Getting updates onto your phone

When a new version has been published, open the app while you're online. A
**"A new version of the app is ready — Update"** banner appears on the home
screen and in Settings. Tap **Update**. The app never updates by itself in the
middle of a workout.

## Changing exercises

- **Small changes** (name, sets, rep range, rest time, weight step): use
  **Settings → Exercises** in the app. These changes are saved on the phone.
- **Defaults and new exercises:** edit `src/data/programmes.ts`. Everything
  about each exercise is defined there, and the comments in the file explain
  the format. To make a slot alternate between two exercises, list both IDs in
  that slot's `exerciseIds`.
- Never change an exercise's `id` after you have logged sets with it, because
  its history is linked by ID. Change the `name` instead.

## For developers

You need [Node.js](https://nodejs.org/) 22 or later.

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Type-check and build for production:

```bash
npm run build
```

Serve the production build locally:

```bash
npm run preview
```

- **Stack:** Vite, React, TypeScript, Dexie (IndexedDB), vite-plugin-pwa
  (offline service worker) and Recharts.
- **Animation review page:** open the app with `#demos` at the end of the
  address to see every exercise animation in one grid. It's useful when
  editing poses in `src/anim/library.ts`.

### Where things are

| Path | What it holds |
|---|---|
| `src/data/programmes.ts` | Exercise and programme definitions |
| `src/db/` | Database schema and queries |
| `src/screens/` | One file per screen |
| `src/anim/` | Pose system, animations and muscle maps |
| `src/lib/` | Rest timer, progression, personal bests, backup, settings |
