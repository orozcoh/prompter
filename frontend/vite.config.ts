import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
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
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
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
    proxy: process.env.NODE_ENV === 'production' ? {} : {
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
    sourcemap: true,
  },
});
