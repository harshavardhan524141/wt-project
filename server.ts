import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { initDatabase } from './server/db/database.ts';
import authRoutes from './server/routes/auth.ts';
import centersRoutes from './server/routes/centers.ts';
import servicesRoutes from './server/routes/services.ts';
import queueRoutes from './server/routes/queues.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize SQLite Database and seed initial state if empty
initDatabase();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/centers', centersRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/queue', queueRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'QueueLess API',
    database: 'SQLite persistent',
    timestamp: new Date().toISOString()
  });
});

// Direct Project ZIP Download Endpoint
app.get('/api/download-zip', (req, res) => {
  const zipPath = path.resolve(__dirname, 'public', 'queueless-smart-management-system.zip');
  res.download(zipPath, 'queueless-smart-management-system.zip');
});

async function startServer() {
  if (!isProduction) {
    // Development mode: attach Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[QueueLess] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[QueueLess] Failed to start server:', err);
  process.exit(1);
});
