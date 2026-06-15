import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import viteJwtAuthPlugin from './src/server/plugins/jwtAuthPlugin.js';
import viteSqlServerPlugin from './src/server/plugins/sqlPlugin.js';
import viteSyncPlugin from './src/server/plugins/syncPlugin.js';
import viteFileBrowserPlugin from './src/server/plugins/fileBrowserPlugin.js';
import viteUserManagementPlugin from './src/server/plugins/userManagementPlugin.js';
import viteApp3Plugin from './src/server/plugins/app3Plugin.js';
import viteApp4Plugin from './src/server/plugins/app4Plugin.js';
import viteApp1SavePlugin from './src/server/plugins/app1SavePlugin.js';
import viteAdminPlugin from './src/server/plugins/adminPlugin.js';
import viteUpstreamStatusPlugin from './src/server/plugins/upstreamStatusPlugin.js';
import { registry } from './src/server/utils/upstreamHealth.js';

import dotenv from 'dotenv';
import sql from 'mssql';
dotenv.config();

const APP_PORT = parseInt(process.env.PORT || '5181');

const config = defineConfig({
  plugins: [
    react(),
    viteJwtAuthPlugin(),
    viteSqlServerPlugin(),
    viteSyncPlugin(),
    viteFileBrowserPlugin(),
    viteUserManagementPlugin(),
    viteApp3Plugin(),
    viteApp4Plugin(),
    viteApp1SavePlugin(),
    viteAdminPlugin(),
    viteUpstreamStatusPlugin(),
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
  server: { host: '0.0.0.0', port: APP_PORT },
  preview: { host: '0.0.0.0', port: APP_PORT },
});

// Register SQL probe at module load — just a callback, no execution here.
// Actual probe runs only when registry.init() is called inside viteUpstreamStatusPlugin's configureServer.
registry.registerProbe('sql', async () => {
  const pool = await sql.connect({
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
    server: process.env.MSSQL_HOST || 'localhost',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    connectionTimeout: 10000,
    requestTimeout: parseInt(process.env.UPSTREAM_PROBE_TIMEOUT_MS || '5000'),
  });
  try {
    await pool.request().query('SELECT 1');
  } finally {
    await pool.close();
  }
});

export default config;
