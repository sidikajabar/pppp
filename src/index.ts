// src/db/index.ts
import { Database } from 'bun:sqlite';

let db: Database;

try {
  // Gunakan env var untuk path DB (wajib di Railway)
  // Default fallback untuk development lokal
  const dbPath = process.env.DB_PATH || './data/petpad.db';

  // Pastikan direktori parent ada (untuk lokal dev)
  // Di Railway volume sudah di-mount, jadi aman
  await Bun.$`mkdir -p ${dbPath.split('/').slice(0, -1).join('/')}`.catch(() => {});

  db = new Database(dbPath, {
    create: true,          // buat file kalau belum ada
    readwrite: true,
    // timeout: 5000,      // default sudah bagus, tapi bisa diatur
    // strict: true,       // lebih ketat parsing SQL (opsional, aktifkan kalau mau)
  });

  // Verifikasi koneksi & write access
  db.exec('PRAGMA user_version = 1;'); // test write

  // Optimasi performa & concurrency di container
  db.exec('PRAGMA journal_mode = WAL;');          // Write-Ahead Logging
  db.exec('PRAGMA synchronous = NORMAL;');        // balance speed & durability
  db.exec('PRAGMA busy_timeout = 5000;');         // tunggu lock lebih lama
  db.exec('PRAGMA mmap_size = 3000000000;');      // memory map (untuk DB besar, opsional)
  db.exec('PRAGMA cache_size = -20000;');         // 20MB cache (dalam halaman 4KB)

  console.log(`✅ SQLite connected successfully`);
  console.log(`   Path: ${dbPath}`);
  console.log(`   WAL mode: enabled`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  // ────────────────────────────────────────────────
  // Inisialisasi schema / migration sederhana
  // Jalankan sekali saat start (idempoten dengan IF NOT EXISTS)
  // ────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      email           TEXT UNIQUE,
      password_hash   TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pets (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      type            TEXT,           -- dog, cat, bird, etc
      breed           TEXT,
      birth_date      DATE,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tambahkan index kalau sering query
    CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
  `);

  console.log('   Schema initialized / migrated');

} catch (err) {
  console.error('❌ Failed to initialize SQLite database:');
  console.error(err);
  console.error('   Path attempted:', process.env.DB_PATH || './data/petpad.db');
  console.error('   Possible causes:');
  console.error('   - Volume mount path salah di Railway');
  console.error('   - Permission denied pada direktori DB');
  console.error('   - DB file corrupt atau locked');
  process.exit(1); // force crash agar Railway detect failure
}

// Export db yang sudah diinisialisasi
export { db };
