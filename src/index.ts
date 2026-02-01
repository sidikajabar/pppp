import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';

import config, { validateConfig } from './config';
import './db';  // side-effect: init DB dengan bun:sqlite

import api from './routes/api';

validateConfig();

const app = new Hono<{
  Variables: {
    // extend kalau nanti butuh context (misal user dari auth)
  };
}>();

// ────────────────────────────────────────────────
// Global Middleware
// ────────────────────────────────────────────────
app.use('*', logger());

// CORS – ubah origin ke spesifik di production!
app.use('*', cors({
  origin: '*',  // ← TODO: ganti ke ['https://yourdomain.com', 'http://localhost:3000'] nanti
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
  credentials: true,
}));

// ────────────────────────────────────────────────
// Static Assets
// ────────────────────────────────────────────────
app.use('/pets/*', serveStatic({ root: './public' }));
app.use('/static/*', serveStatic({ root: './public' }));

// Skill.md – dokumentasi
app.get('/skill.md', async (c) => {
  const file = Bun.file('./public/skill.md');
  if (!(await file.exists())) {
    return c.text('Skill documentation not found', 404);
  }
  return c.body(await file.text(), 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
  });
});

// ────────────────────────────────────────────────
// API Routes
// ────────────────────────────────────────────────
app.route('/api', api);

// ────────────────────────────────────────────────
// SPA Fallback (Frontend)
// ────────────────────────────────────────────────
app.get('/', serveStatic({ path: './public/index.html' }));

app.get('*', async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Not Found', path: c.req.path }, 404);
  }

  const file = Bun.file('./public/index.html');
  if (!(await file.exists())) {
    return c.text('Frontend build not found. Run `bun run build`?', 500);
  }

  return c.body(await file.text(), 200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
});

// ────────────────────────────────────────────────
// Error Handler (penting untuk Railway/debug)
// ────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  }, 500);
});

// Not Found (lebih ramah)
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Not Found' }, 404);
  }
  return c.text('404 - Not Found', 404);
});

// ────────────────────────────────────────────────
// Startup Banner
// ────────────────────────────────────────────────
const banner = `
🐾 PetPad Server running on Bun + bun:sqlite
  Local:   http://localhost:${config.port}
  Docs:    http://localhost:${config.port}/skill.md
  Health:  http://localhost:${config.port}/api/health
  DB:      ${process.env.NODE_ENV === 'production' ? 'Railway volume' : './data/petpad.db (atau sesuai config)'}
`;

console.log(banner.trim());

export default {
  port: config.port,
  fetch: app.fetch,
};
