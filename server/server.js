import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import investigationRoutes from './routes/investigation.js';
import adminRoutes from './routes/admin.js';
import { getClientIp } from './utils/ip.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable reverse proxy trust if configured
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
}

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));
app.use(cookieParser());

// Request logger for debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const ip = getClientIp(req);
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} - IP: ${ip}`);
  }
  next();
});

// Ensure uploads folder exists and serve static uploads
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/investigation', investigationRoutes);
app.use('/api/admin', adminRoutes);

// Serve frontend static build if exists
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// Fallback for React SPA router
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'), err => {
    if (err) {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Shinri Trial Node 04-271</title><meta charset="utf-8"></head>
          <body style="background:#0a0b10;color:#00f3ff;font-family:monospace;padding:2rem;text-align:center;">
            <h2>[ SHINRI TRIAL ARCHIVE NODE 04-271 ]</h2>
            <p>Клиентская часть компилируется... Пожалуйста, выполните сборку фронтенда (npm run build в папке client) или запустите dev-сервер Vite.</p>
          </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, () => {
  console.log(`
  ╔═════════════════════════════════════════════════════════════════╗
  ║              SHINRI TRIAL // NODE 04-271 ARCHIVE                ║
  ║               DANGANRONPA ARG INVESTIGATION SYSTEM              ║
  ║          «Пусть отчаяние станет ступенью к истинной надежде»    ║
  ╠═════════════════════════════════════════════════════════════════╣
  ║  ➜ Терминал доступен:     http://localhost:${PORT}                  ║
  ║  ➜ Панель администратора: http://localhost:${PORT}/admin         ║
  ║  ➜ Код доступа по умолчанию: 28042004333                        ║
  ║  ➜ Пароль администратора:   sidershope333                       ║
  ╚═════════════════════════════════════════════════════════════════╝
  `);
});
