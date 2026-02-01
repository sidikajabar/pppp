import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';

import config, { validateConfig } from './config';
import './db';
import api from './routes/api';

validateConfig();

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: '*' }));

// Static files
app.use('/pets/*', serveStatic({ root: './public' }));
app.use('/static/*', serveStatic({ root: './public' }));

// API
app.route('/api', api);

// Skill.md
app.get('/skill.md', async (c) => {
  const file = Bun.file('./public/skill.md');
  c.header('Content-Type', 'text/markdown');
  return c.body(await file.text());
});

// Frontend
app.get('/', serveStatic({ path: './public/index.html' }));
app.get('/*', async (c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Not found' }, 404);
  const file = Bun.file('./public/index.html');
  c.header('Content-Type', 'text/html');
  return c.body(await file.text());
});

console.log(`
🐾 PetPad Server
   http://localhost:${config.port}
   Docs: /skill.md
   Health: /api/health
`);

export default { port: config.port, fetch: app.fetch };
