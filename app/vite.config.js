import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import dotenv from 'dotenv';

dotenv.config();

const APP_PORT = parseInt(process.env.PORT || '5181');

const config = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Opname Aset - Kertas Kerja',
        short_name: 'Opname Aset',
        description: 'Digitalisasi Kertas Kerja Opname Aset Tetap',
        theme_color: '#1e3a8a',
        background_color: '#f0f4f8',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10485760,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 3 },
          },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  server: { 
    host: '0.0.0.0', 
    port: APP_PORT,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  preview: { 
    host: '0.0.0.0', 
    port: APP_PORT,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    minify: false,
    sourcemap: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    css: false,
    server: {
      esbuild: {
        jsx: 'automatic',
      },
    },
    esbuild: {
      jsx: 'automatic',
    },
  },
});

export default config;
