import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';

import config, { validateConfig } from './config';
import './db';  // init SQLite (sekarang sudah OK dari log kamu)

import api from './routes/api';

validateConfig();

// ────────────────────────────────────────────────
// Buat instance Hono di sini (WAJIB sebelum export)
// ────────────────────────────────────────────────
const app = new Hono<{
  Variables: {
    // extend kalau butuh context seperti user/auth nanti
  };
}>();

// Global Middleware
app.use('*', logger());

// CORS – whitelist di production nanti
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
  credentials: true,
}));

// Static files
app.use('/pets/*', serveStatic({ root: './public' }));
app.use('/static/*', serveStatic({ root: './public' }));

// skill.md
app.get('/skill.md', async (c) => {
  const file = Bun.file('./public/skill.md');
  if (!(await file.exists())) return c.text('Not found', 404);
  return c.body(await file.text(), 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
});

// API routes
app.route('/api', api);

// SPA fallback
app.get('/', serveStatic({ path: './public/index.html' }));

app.get('*', async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Not Found' }, 404);
  }
  const file = Bun.file('./public/index.html');
  if (!(await file.exists())) return c.text('Frontend not found', 500);
  return c.body(await file.text(), 200, { 'Content-Type': 'text/html; charset=utf-8' });
});

// Error & Not Found handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// ────────────────────────────────────────────────
// Startup Banner & Export (HARUS DI AKHIR SETELAH APP DIDEFINISIKAN)
// ────────────────────────────────────────────────
const actualPort = Number(process.env.PORT) || config.port || 3000;

const banner = `
✅ PetPad Server ready (Bun + bun:sqlite)
  Listening: http://0.0.0.0:${actualPort}
  Docs:      /skill.md
  Health:    /api/health
  DB:        ${process.env.DB_PATH || '/app/data/petpad.db'}
  Env:       ${process.env.NODE_ENV || 'development'}
`;

console.log(banner.trim());

export default {
  port: actualPort,
  hostname: '0.0.0.0',    // Wajib Railway
  fetch: app.fetch,       // Sekarang app sudah ada di scope
};
