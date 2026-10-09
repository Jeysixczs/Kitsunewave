import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import articleHandler from './api/news-article.js';

// Dev only: the full-article scraper is a Vercel function, so serve it from
// the dev server too (everything else under /api goes to the proxy below).
const newsArticleDev = () => ({
  name: 'news-article-dev',
  configureServer(server) {
    server.middlewares.use('/api/news-article', (req, res) => {
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (body) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
      };
      // connect strips the mount path; restore it so the handler sees a full URL
      req.url = '/api/news-article' + (req.url === '/' ? '' : req.url);
      articleHandler(req, res);
    });
  },
});

export default defineConfig({
  plugins: [react(), newsArticleDev()],
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
        newsDetail: 'news-detail.html',
        movie: 'movie.html',
      },
    },
  },
});
