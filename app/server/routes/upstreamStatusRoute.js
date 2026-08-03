import { createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { registry } from '../utils/upstreamHealth.js';

function upstreamStatusMiddleware(req, res, next) {
  const sendJson = createJsonSender(req, res);

  if (handleCorsIfPreflight(req, res, '/api/upstream/', 'GET, OPTIONS')) return;

  if (req.url === '/api/upstream/status' && req.method === 'GET') {
    sendJson(200, registry.getStatus());
    return;
  }

  next();
}

function startHealthProbe() {
  // Only start once, idempotent
  if (registry.probeHandle) return;
  registry.init();
}

export default function viteUpstreamStatusPlugin() {
  return {
    name: 'vite-plugin-upstream-status',
    configureServer(server) {
      startHealthProbe();
      server.middlewares.use(upstreamStatusMiddleware);
    },
    configurePreviewServer(server) {
      startHealthProbe();
      server.middlewares.use(upstreamStatusMiddleware);
    },
  };
}
