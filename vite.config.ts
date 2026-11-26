import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const devCspPlugin: Plugin = {
  name: 'sapira-dev-csp',
  apply: 'serve',
  transformIndexHtml(html) {
    return html
      .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
      .replace(
        "connect-src 'self'",
        "connect-src 'self' ws://localhost:5173 http://localhost:5173"
      );
  },
};

export default defineConfig({
  plugins: [react(), devCspPlugin],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
  },
});
