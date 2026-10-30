import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const signToken = (userId) => jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '7d' });

export const verifyToken = (token) => jwt.verify(token, config.jwtSecret).sub;

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in to continue' });
  try {
    req.userId = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Your session expired. Sign in again.' });
  }
}
