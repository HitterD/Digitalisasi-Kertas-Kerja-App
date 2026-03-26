import fs from 'fs';
import path from 'path';
import process from 'process';
import { getAllowedOrigin, isRateLimited, recordLoginAttempt, resetLoginAttempts, verifyPassword, hashPassword, JWT_SECRET, createJsonSender, handleCorsIfPreflight } from '../utils/common.js';
import { logAudit } from '../../utils/logger.js';
import jwt from 'jsonwebtoken';

function userManagementMiddleware(req, res, next) {
  const usersFilePath = path.resolve(process.cwd(), 'data/users.json');
  const sendJson = createJsonSender(req, res);
  if (handleCorsIfPreflight(req, res, '/api/users', 'GET, POST, PUT, DELETE, OPTIONS')) return;
  
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (isRateLimited(ip)) {
          logAudit({ actor: 'SYSTEM', action: 'LOGIN_RATE_LIMITED', ip, status: 'FAILED' });
          return sendJson(429, { success: false, error: 'Terlalu banyak percobaan login. Coba lagi nanti.' });
        }
  
        const { username, password } = JSON.parse(body);
        if (!fs.existsSync(usersFilePath)) {
          return sendJson(401, { success: false, error: 'Username atau password salah' });
        }
        
        const fileData = fs.readFileSync(usersFilePath, 'utf8');
        const users = JSON.parse(fileData);
        
        const user = users.find(u => u.username === username);
        if (user && user.isActive !== false && verifyPassword(password, user.password)) {
          resetLoginAttempts(ip);
          logAudit({ actor: username, action: 'LOGIN_SUCCESS', target: `Role: ${user.role}`, ip, status: 'SUCCESS' });
          
          // MIGRATION PATCH: Otomatis konversi password lama (SHA-256) ke metode kuat (Bcrypt)
          if (user.password && user.password.length === 64 && !user.password.startsWith('$2')) {
            user.password = hashPassword(password);
            const tempPath = usersFilePath + '.' + Date.now() + '.tmp';
            fs.writeFileSync(tempPath, JSON.stringify(users, null, 2), 'utf8');
            fs.renameSync(tempPath, usersFilePath);
            console.log(`[Security] Re-hashed password for ${username} to Bcrypt algorithm`);
          }

          const token = jwt.sign(
            { id: user.id || username, username, role: user.role, name: user.name || username },
            JWT_SECRET,
            { expiresIn: '12h' }
          );
          
          sendJson(200, {
            success: true,
            user: { username, role: user.role, name: user.name || username, access: user.access || [] },
            token,
            message: 'Login successful'
          });
        } else {
          recordLoginAttempt(ip);
          if (user && user.isActive === false) logAudit({ actor: username, action: 'LOGIN_INACTIVE_USER', ip, status: 'FAILED' });
          else logAudit({ actor: username || 'UNKNOWN', action: 'LOGIN_FAILED', ip, status: 'FAILED' });
          
          sendJson(401, { success: false, error: 'Username atau password salah' });
        }
      } catch (err) {
        console.error('[Login] Error:', err);
        sendJson(500, { success: false, error: err.message });
      }
    });
    return;
  }
  
  if (req.url === '/api/auth/verify' && req.method === 'GET') {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendJson(401, { success: false, message: 'Dibutuhkan token' });
    }
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!fs.existsSync(usersFilePath)) {
        return sendJson(401, { success: false, message: 'Data pengguna tidak ditemukan' });
      }
      
      const fileData = fs.readFileSync(usersFilePath, 'utf8');
      const users = JSON.parse(fileData);
      
      const user = users.find(u => u.username === decoded.username);
      if (!user || user.isActive === false) {
        return sendJson(401, { success: false, message: 'Akun tidak aktif atau tidak ditemukan' });
      }
      
      sendJson(200, {
        success: true,
        user: { username: user.username, role: user.role, name: user.name || user.username, access: user.access || [] },
        token: jwt.sign(
          { id: user.id || user.username, username: user.username, role: user.role, name: user.name || user.username },
          JWT_SECRET,
          { expiresIn: '12h' }
        )
      });
    } catch (err) {
      sendJson(401, { success: false, message: 'Token invalid atau expired' });
    }
    return;
  }
  
  if (req.url === '/api/users' && req.method === 'GET') {
    try {
      if (!fs.existsSync(usersFilePath)) return sendJson(200, { success: true, users: [] });
      const fileData = fs.readFileSync(usersFilePath, 'utf8');
      const users = JSON.parse(fileData).map(u => {
        const { password, ...safeUser } = u;
        return safeUser;
      });
      sendJson(200, { success: true, users });
    } catch (err) {
      sendJson(500, { success: false, error: err.message });
    }
    return;
  }
  
  if (req.url === '/api/users' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newUser = JSON.parse(body);
        let users = [];
        if (fs.existsSync(usersFilePath)) {
          users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        }
        if (users.find(u => u.username === newUser.username)) {
          return sendJson(400, { success: false, error: 'Username sudah digunakan' });
        }
        
        newUser.password = hashPassword(newUser.password);
        if (!newUser.id) newUser.id = 'USR-' + Date.now();
        if (newUser.isActive === undefined) newUser.isActive = true;
        
        users.push(newUser);
        
        // Atomic write: write to temp file then rename
        const tempPath = usersFilePath + '.' + Date.now() + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(users, null, 2), 'utf8');
        fs.renameSync(tempPath, usersFilePath);
        
        const ipHost = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        logAudit({ actor: req.headers['x-user'] || 'SYSTEM', action: 'USER_CREATED', target: `Username: ${newUser.username}`, ip: ipHost, status: 'SUCCESS' });
        sendJson(200, { success: true, message: 'User berhasil ditambahkan' });
      } catch (err) {
        console.error('[User Management] Create error:', err);
        sendJson(500, { success: false, error: err.message });
      }
    });
    return;
  }
  
  if (req.url?.startsWith('/api/users/') && req.method === 'PUT') {
    const id = req.url.split('/').pop();
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const edits = JSON.parse(body);
        if (!fs.existsSync(usersFilePath)) return sendJson(404, { success: false, error: 'Data tidak ditemukan' });
        
        const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        const index = users.findIndex(u => u.username === id || u.id === id);
        if (index === -1) return sendJson(404, { success: false, error: 'User tidak ditemukan' });
        
        if (edits.password) {
          users[index].password = hashPassword(edits.password);
        }
        if (edits.role) users[index].role = edits.role;
        if (edits.name) users[index].name = edits.name;
        if (edits.isActive !== undefined) users[index].isActive = edits.isActive;
        
        // Atomic write: write to temp file then rename
        const tempPath = usersFilePath + '.' + Date.now() + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(users, null, 2), 'utf8');
        fs.renameSync(tempPath, usersFilePath);
        
        const { password: _, ...safeUser } = users[index];
        
        const ipHost = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        logAudit({ actor: req.headers['x-user'] || 'SYSTEM', action: 'USER_UPDATED', target: `User: ${safeUser.username}`, ip: ipHost, status: 'SUCCESS' });
        sendJson(200, { success: true, message: 'User berhasil diupdate', user: safeUser });
      } catch (err) {
        console.error('[User Management] Update error:', err);
        sendJson(500, { success: false, error: err.message });
      }
    });
    return;
  }

  if (req.url?.startsWith('/api/users/') && req.method === 'DELETE') {
    const id = req.url.split('/').pop();
    try {
      if (!fs.existsSync(usersFilePath)) return sendJson(404, { success: false, error: 'Data tidak ditemukan' });
      
      const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
      const index = users.findIndex(u => u.username === id || u.id === id);
      if (index === -1) return sendJson(404, { success: false, error: 'User tidak ditemukan' });
      
      const deletedUser = users.splice(index, 1)[0];
      
      const tempPath = usersFilePath + '.' + Date.now() + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(users, null, 2), 'utf8');
      fs.renameSync(tempPath, usersFilePath);
      
      const ipHost = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      logAudit({ actor: req.headers['x-user'] || 'SYSTEM', action: 'USER_DELETED', target: `User: ${deletedUser.username}`, ip: ipHost, status: 'SUCCESS' });
      sendJson(200, { success: true, message: 'User berhasil dihapus' });
    } catch (err) {
      console.error('[User Management] Delete error:', err);
      sendJson(500, { success: false, error: err.message });
    }
    return;
  }

  next();
}

export default function viteUserManagementPlugin() {
  return {
    name: 'vite-plugin-user-management',
    configureServer(server) {
      server.middlewares.use(userManagementMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(userManagementMiddleware);
    },
  };
}
