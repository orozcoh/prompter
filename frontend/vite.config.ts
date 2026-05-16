import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { writeFileSync } from 'fs';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    generateSeoFiles(mode),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Prompter - AI Image Generation',
        short_name: 'Prompter',
        description: 'AI image generation platform. Upload a reference image, select a prompt style, and receive an AI-generated image.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/favicon.ico',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3_000_000,
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname === '/prompts',
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-prompts',
              expiration: { maxEntries: 10 },
            },
          },
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/prompt-sample/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'prompt-images',
              expiration: { maxEntries: 50 },
            },
          },
          {
            urlPattern: /\/generate$/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/verify-payment$/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      'vite-plugin-node-polyfills/shims/global': path.resolve(__dirname, 'node_modules/vite-plugin-node-polyfills/shims/global/dist/index.js'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
  },
}));

function generateSeoFiles(mode: string): Plugin {
  const routes = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/myImages', changefreq: 'weekly', priority: '0.7' },
    { path: '/config', changefreq: 'monthly', priority: '0.3' },
    { path: '/about', changefreq: 'monthly', priority: '0.6' },
  ];

  return {
    name: 'generate-seo-files',
    apply: 'build',
    closeBundle() {
      const env = loadEnv(mode, process.cwd(), 'VITE_');
      const baseUrl = env.VITE_UI_BASE_URL;
      if (!baseUrl) {
        console.warn('VITE_UI_BASE_URL not set, skipping sitemap/robots generation');
        return;
      }

      const outDir = path.resolve(__dirname, 'dist');

      writeFileSync(path.join(outDir, 'robots.txt'), [
        'User-agent: *',
        'Allow: /',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n') + '\n');

      const urls = routes.map(r =>
        `  <url>\n    <loc>${baseUrl}${r.path}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
      ).join('\n');

      writeFileSync(path.join(outDir, 'sitemap.xml'), [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls,
        '</urlset>',
      ].join('\n') + '\n');
    },
  };
}
