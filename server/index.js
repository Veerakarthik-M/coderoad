// ANAVANDI — Express Server
// Handles auth, student applications, institution review, admin approval, credential signing, verification

import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';
import { seedIfEmpty } from './seed.js';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/student.js';
import institutionRoutes from './routes/institution.js';
import adminRoutes from './routes/admin.js';
import verifyRoutes from './routes/verify.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize database before starting
async function start() {
  await getDb();
  console.log('📦 Database initialized');
  
  // Auto-seed demo data if database is empty (handles ephemeral Render restarts)
  await seedIfEmpty();

  // Routes (standard /api prefix)
  app.use('/api/auth', authRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/institution', institutionRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/verify', verifyRoutes);

  // Fallback direct mounts (handles any client or proxy calling /admin/* directly)
  app.use('/auth', authRoutes);
  app.use('/student', studentRoutes);
  app.use('/institution', institutionRoutes);
  app.use('/admin', adminRoutes);
  app.use('/verify', verifyRoutes);

  // Serve uploaded files (ID cards, photos) via /uploads/:filename
  app.use('/uploads', express.static(join(__dirname, 'uploads')));
  app.use('/api/uploads', express.static(join(__dirname, 'uploads')));

  // Health check
  const healthHandler = (req, res) => {
    res.json({ status: 'ok', service: 'ANAVANDI Server', timestamp: new Date().toISOString() });
  };
  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);

  app.listen(PORT, () => {
    console.log(`\n🚌 ANAVANDI Server running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
}

start().catch(console.error);
