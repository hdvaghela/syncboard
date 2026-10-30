import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import { initSocket } from './socket/index.js';

const app = express();
app.use(cors({ origin: config.clientOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built React app in production
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|socket\.io).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Express 4 doesn't catch async errors by itself; routes below throw HttpError.
app.use((err, _req, res, _next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const server = http.createServer(app);
app.set('io', initSocket(server));

try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('MongoDB connected');
} catch (err) {
  console.error(`\nCould not connect to MongoDB at ${config.mongoUri}\n  ${err.message}\nStart one with "docker compose up -d" or set MONGO_URI in server/.env\n`);
  process.exit(1);
}

server.listen(config.port, () => console.log(`SyncBoard API + Socket.io on http://localhost:${config.port}`));
