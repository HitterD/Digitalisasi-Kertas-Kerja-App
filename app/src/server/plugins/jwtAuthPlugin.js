import { getAllowedOrigin, JWT_SECRET, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import jwt from 'jsonwebtoken';

function jwtAuthMiddleware(req, res, next) {
  const sendJson = createJsonSender(req, res);

  const publicPaths = [
    '/api/auth/login',
    '/api/auth/verify',
    '/api/db/status'
  ];

  if (req.url && publicPaths.some(p => req.url.startsWith(p))) {
    return next();
  }

  if (req.url?.startsWith('/api/')) {
    if (req.method === 'OPTIONS') return next();

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendJson(401, { success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // attach user payload
      next();
    } catch (err) {
      console.error('[Auth] Token verification failed:', err.message);
      return sendJson(401, { success: false, message: 'Akses ditolak. Token tidak valid atau kadaluarsa.' });
    }
  } else {
    next();
  }
}

export default function viteJwtAuthPlugin() {
  return {
    name: 'vite-plugin-jwt-auth',
    configureServer(server) {
      server.middlewares.use(jwtAuthMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(jwtAuthMiddleware);
    },
  };
}
