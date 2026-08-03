import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const DATA_DIR = path.join(process.cwd(), 'data');
const BAST_FILE = path.join(DATA_DIR, 'bast_documents.json');

// Ensure data folder and bast_documents.json exist
function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BAST_FILE)) {
        fs.writeFileSync(BAST_FILE, JSON.stringify([]), 'utf8');
    }
}

// GET /api/bast
router.get('/api/bast', (req, res) => {
    try {
        ensureDataFile();
        const content = fs.readFileSync(BAST_FILE, 'utf8');
        const list = JSON.parse(content || '[]');
        return res.json({ success: true, data: list });
    } catch (err) {
        console.error('[API /api/bast GET] Error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/bast
router.post('/api/bast', express.json({ limit: '50mb' }), (req, res) => {
    try {
        ensureDataFile();
        const docPayload = req.body;
        if (!docPayload || !docPayload.noBast) {
            return res.status(400).json({ success: false, error: 'Data BAST tidak valid.' });
        }

        const content = fs.readFileSync(BAST_FILE, 'utf8');
        let list = JSON.parse(content || '[]');

        const idx = list.findIndex(item => item.id === docPayload.id || item.noBast === docPayload.noBast);
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...docPayload, updatedAt: new Date().toISOString() };
        } else {
            list.unshift({ ...docPayload, id: docPayload.id || `bast_${Date.now()}`, createdAt: new Date().toISOString() });
        }

        fs.writeFileSync(BAST_FILE, JSON.stringify(list, null, 2), 'utf8');
        return res.json({ success: true, message: 'Dokumen BAST berhasil disimpan.', data: docPayload });
    } catch (err) {
        console.error('[API /api/bast POST] Error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/bast/:id
router.delete('/api/bast/:id', (req, res) => {
    try {
        ensureDataFile();
        const { id } = req.params;
        const content = fs.readFileSync(BAST_FILE, 'utf8');
        let list = JSON.parse(content || '[]');

        const updated = list.filter(item => item.id !== id);
        fs.writeFileSync(BAST_FILE, JSON.stringify(updated, null, 2), 'utf8');
        return res.json({ success: true, message: 'Dokumen BAST berhasil dihapus.' });
    } catch (err) {
        console.error('[API /api/bast DELETE] Error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
