import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Member portal. It lives under /m/ so the admin dev server can show it at
 * http://localhost:5173/m/ — same address as the admin website, so both share the sample data
 * kept in the browser (see docs/demo-data.md). Opened on its own (http://localhost:5174/m/) it
 * has its own copy of the sample data.
 */
export default defineConfig({
  base: '/m/',
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    // Live reload talks to this server directly, also when the page comes through 5173/m/.
    hmr: { clientPort: 5174 },
  },
});
