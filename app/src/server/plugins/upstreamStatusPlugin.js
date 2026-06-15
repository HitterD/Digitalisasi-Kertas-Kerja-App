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

export default function viteUpstreamStatusPlugin() {
  return {
    name: 'vite-plugin-upstream-status',
    configureServer(server) {
      server.middlewares.use(upstreamStatusMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(upstreamStatusMiddleware);
    },
  };
}
