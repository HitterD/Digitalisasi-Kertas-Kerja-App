import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'audit.json') }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export function logAudit({ actor, action, target, ip, status, details = {} }) {
  logger.info({
    actor: actor || 'SYSTEM',
    action,
    target,
    ip: ip || 'UNKNOWN',
    status,
    details
  });
}
