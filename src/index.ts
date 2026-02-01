// src/db/index.ts
import { Database } from 'bun:sqlite';

// Path DB – penting untuk Railway pakai persistent volume
// Di Railway, mount volume ke /data atau /app/data, lalu set env DB_PATH=/data/petpad.db
const dbPath = process.env.DB_PATH || './data/petpad.db';

export const db = new Database(dbPath, {
  create: true,       // auto buat file kalau belum ada
  readwrite: true,
});

// Enable WAL mode → concurrency lebih baik di production (Railway container)
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');   // cepat tapi aman
db.exec('PRAGMA busy_timeout = 5000;');    // hindari lock timeout

console.log(`✅ Connected to SQLite at: ${dbPath}`);

// Kalau ada schema init / migration sederhana, taruh di sini (jalan sekali saat start)
// Contoh: buat table kalau belum ada
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
