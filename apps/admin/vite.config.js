import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig(({ mode }) => {
  // Read API_PORT from the single .env at the repository root, so the proxy follows the API.
  const env = loadEnv(mode, repoRoot, '');
  const apiPort = env.API_PORT || 4000;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true, // must match ADMIN_ORIGIN in .env
      proxy: {
        // The browser calls /api/… on the same address; Vite forwards it to the local API.
        '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: true },
      },
    },
  };
});
