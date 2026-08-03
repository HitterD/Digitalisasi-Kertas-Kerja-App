import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import route modules (formerly Vite plugins)
import jwtAuthRoute from './routes/jwtAuthRoute.js';
import sqlRoute from './routes/sqlRoute.js';
import syncRoute from './routes/syncRoute.js';
import fileBrowserRoute from './routes/fileBrowserRoute.js';
import userManagementRoute from './routes/userManagementRoute.js';
import app3Route from './routes/app3Route.js';
import app4Route from './routes/app4Route.js';
import app1SaveRoute from './routes/app1SaveRoute.js';
import adminRoute from './routes/adminRoute.js';
import upstreamStatusRoute from './routes/upstreamStatusRoute.js';
import bastRoute from './routes/bastRoute.js';
import sql from 'mssql';
import { registry } from './utils/upstreamHealth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Some routes might need express.json() but the existing middlewares handle their own parsing mostly.
// But we'll add it just in case, though Vite's connect server didn't have body-parser built-in for all requests.
// app.use(express.json({ limit: '50mb' }));

// Helper to mount legacy Vite plugin middlewares
function mountViteMiddleware(app, pluginOrMiddleware) {
    if (typeof pluginOrMiddleware === 'function') {
        const plugin = pluginOrMiddleware();
        if (plugin && typeof plugin.configureServer === 'function') {
            plugin.configureServer({
                middlewares: {
                    use: (mw) => app.use(mw)
                }
            });
            return;
        }
        // If it's just a raw middleware function
        app.use(pluginOrMiddleware);
    } else {
        app.use(pluginOrMiddleware);
    }
}

// Mount all routes
const routes = [
    jwtAuthRoute,
    sqlRoute,
    syncRoute,
    fileBrowserRoute,
    userManagementRoute,
    app3Route,
    app4Route,
    app1SaveRoute,
    adminRoute,
    upstreamStatusRoute,
    bastRoute
];

routes.forEach(route => mountViteMiddleware(app, route));

// Register SQL probe at module load
registry.registerProbe('sql', async () => {
  const startTime = Date.now();
  const pool = await sql.connect({
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE || 'ASSET_MANAGEMENT',
    server: process.env.MSSQL_HOST || 'localhost',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    connectionTimeout: 10000,
    requestTimeout: 5000,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });
  try {
    await pool.request().query('SELECT 1');
  } finally {
    await pool.close();
  }
  const elapsed = Date.now() - startTime;
  if (elapsed > 3000) {
    console.log(`[SQL Probe] Connected in ${elapsed}ms (slow)`);
  }
});

app.listen(PORT, () => {
    console.log(`[Backend] API Server running on port ${PORT}`);
});
