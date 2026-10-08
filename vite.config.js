import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Dev only: mirror the Vercel rewrite so "/api" works locally
    proxy: {
      '/api': {
        target: 'https://kitsuneapi.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api/v2'),
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        detail: 'detail.html',
        watch: 'watch.html',
        news: 'news.html',
        movie: 'movie.html',
      },
    },
  },
});
