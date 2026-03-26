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

import dotenv from 'dotenv';
dotenv.config();

// ============================================================
// Vite Config - Refactored (Middlewares extracted to src/server/plugins)
// ============================================================
const APP_PORT = parseInt(process.env.PORT || '5181');

export default defineConfig({
  plugins: [
    react(),
    viteJwtAuthPlugin(), // Protects all /api/ endpoints below
    viteSqlServerPlugin(), // SQL Server API endpoints (dev + preview)
    viteSyncPlugin(), // Network sync (dev + preview)
    viteFileBrowserPlugin(), // File browser for network share (dev + preview)
    viteUserManagementPlugin(), // User Management and Offline Setup (dev + preview)
    viteApp3Plugin(), // APP3 Data Consolidation Middleware
    viteApp4Plugin(), // APP4 Recouncil Middleware
    viteApp1SavePlugin(), // App1 Save/Load Slots
    viteAdminPlugin(), // Admin Page Features (Audit, Backup, Restore)
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
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10485760, // 10MB limit
        navigateFallback: 'index.html', // SPA fallback for offline navigation
        runtimeCaching: [
          {
            // Cache page navigations for offline
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      devOptions: {
        enabled: true,  // Enable SW in dev mode (limited offline)
        type: 'module',
      },
    }),
  ],
  server: {
    host: '0.0.0.0', // Required for external tablet access
    port: APP_PORT,
  },
  preview: {
    host: '0.0.0.0', // Required for external tablet access
    port: APP_PORT,
  },
})
