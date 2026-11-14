import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is served from https://<user>.github.io/strength-log/ on GitHub Pages,
// so every asset URL must be prefixed with the repository name.
export default defineConfig({
  base: '/strength-log/',
  plugins: [react()],
});
