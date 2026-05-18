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
    {
      name: 'inject-build-version',
      transformIndexHtml(html) {
        return html.replace('__BUILD_VERSION__', Date.now().toString(36));
      },
    },
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
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3_000_000,
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/_/],
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
            urlPattern: /\/generate$/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/verify-payment$/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/models$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-models',
              expiration: { maxEntries: 5 },
            },
          },
          {
            urlPattern: /\/images\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'r2-images',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /\/generated-images\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'generated-images',
              expiration: { maxEntries: 50 },
            },
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
    { path: '/', changefreq: 'weekly', priority: '1.0', hasImage: true },
    { path: '/about', changefreq: 'monthly', priority: '0.6', hasImage: false },
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
      const lastmod = new Date().toISOString();

      writeFileSync(path.join(outDir, 'robots.txt'), [
        'User-agent: *',
        'Allow: /',
        'Disallow: /config',
        'Disallow: /myImages',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n') + '\n');

      const urls = routes.map(r => {
        let entry = `  <url>\n    <loc>${baseUrl}${r.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>`;
        if (r.hasImage) {
          entry += `\n    <image:image>\n      <image:loc>${baseUrl}/og-image.png</image:loc>\n      <image:title>Prompter - AI Image Generation</image:title>\n    </image:image>`;
        }
        entry += '\n  </url>';
        return entry;
      }).join('\n');

      writeFileSync(path.join(outDir, 'sitemap.xml'), [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        urls,
        '</urlset>',
      ].join('\n') + '\n');
    },
  };
}
