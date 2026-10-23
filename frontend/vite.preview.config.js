import { defineConfig } from 'vite';

// Retired read-only preview: keep existing bookmarks on the editable local store.
// No API requests from this port are forwarded to production.
export default defineConfig({
  plugins: [{
    name: 'editable-preview-redirect',
    configureServer(server) {
      server.middlewares.use((req, res) => {
        res.statusCode = 307;
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Location', `http://127.0.0.1:5175${req.url?.startsWith('/') ? req.url : '/'}`);
        res.end();
      });
    },
  }],
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
});
