import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // must match ADMIN_ORIGIN in .env
    proxy: {
      // The browser calls /api/… on the same address; Vite forwards it to the local API.
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
});
