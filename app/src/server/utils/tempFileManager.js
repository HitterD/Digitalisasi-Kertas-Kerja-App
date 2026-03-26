import fs from 'fs';
import { getAllowedOrigin } from './common.js';

export function cleanupUploadedFiles(filesArrayOrDict) {
  if (!filesArrayOrDict) return;
  
  const files = Array.isArray(filesArrayOrDict) ? filesArrayOrDict : Object.values(filesArrayOrDict).flat();
  
  files.forEach(f => {
    try {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    } catch (e) {
      console.error('Failed to delete temp file:', f.path, e);
    }
  });
}

export function streamFileResponse(req, res, outPath, filename, mimeType, cleanupCallback) {
  const readStream = fs.createReadStream(outPath);
  
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
  if (mimeType) res.setHeader('Content-Type', mimeType);
  if (filename) res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  try {
    const stats = fs.statSync(outPath);
    res.setHeader('Content-Length', stats.size);
  } catch(e) {}

  res.statusCode = 200;
  readStream.pipe(res);

  const cleanup = () => {
    if (cleanupCallback) cleanupCallback();
    try { if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (ce) { }
  };

  res.on('finish', cleanup);

  readStream.on('error', (err) => {
    console.error('Download stream error:', err);
    cleanup();
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: 'Download failed' }));
    }
  });
}