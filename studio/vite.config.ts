import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// "npm run build" makes studio/dist, which the studio server (server/server.js) serves.
// "npm run dev" is for working on the app: it passes the API and engine files on to a running studio server.
const server = 'http://127.0.0.1:3000';
export default defineConfig({
  plugins: [react()],
  // the app's own files go in dist/app/ (/assets/ is the project's asset folder)
  build: { outDir: 'dist', assetsDir: 'app', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
  server: { proxy: Object.fromEntries(['/api', '/engine', '/build', '/videos', '/assets', '/cache', '/voice-overrides'].map(p => [p, server])) },
});
