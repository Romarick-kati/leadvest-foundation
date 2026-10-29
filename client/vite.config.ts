import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Preloads the main text font. Without this the browser only discovers it after the
 * JavaScript has rendered the page, and headings repaint late on slow phone connections.
 */
function preloadMainFont(): Plugin {
  return {
    name: 'lvf-preload-main-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const font = Object.keys(ctx.bundle ?? {}).find((f) => /plus-jakarta-sans-latin-wght-normal.*\.woff2$/.test(f));
        return font ? [{ tag: 'link', attrs: { rel: 'preload', href: `/${font}`, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head' }] : [];
      },
    },
  };
}

/** Puts the real site address into the sharing image and the search engine data in index.html. */
function siteUrlInHtml(): Plugin {
  return {
    name: 'lvf-site-url',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', (process.env.PUBLIC_APP_URL || process.env.URL || '').replace(/\/$/, '')),
  };
}

export default defineConfig({
  plugins: [react(), preloadMainFont(), siteUrlInHtml()],
  server: {
    port: 5173,
    // In development the API runs on port 4000 and is proxied so cookies stay same site.
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: false },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: false },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    // Keep fonts as files so the Content Security Policy can stay at font-src 'self'.
    assetsInlineLimit: (file) => (/\.(woff2?|ttf)$/.test(file) ? false : undefined),
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
            if (id.includes('@tanstack')) return 'query';
          }
        },
      },
    },
  },
});
