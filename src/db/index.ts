// src/db/index.ts
import { Database } from 'bun:sqlite';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || './data/petpad.db';

// Buat direktori parent kalau belum ada (penting untuk lokal & Railway volume)
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  console.log(`Created DB directory: ${dbDir}`);
}

let db: Database;

try {
  db = new Database(DB_PATH, {
    create: true,         // auto create file kalau belum ada
    readwrite: true,
    // safeIntegers: true, // optional: pakai bigint untuk integer besar > 2^53
    // strict: true,       // optional: named params tanpa prefix $/:@
  });

  // Optimasi untuk production/container (Railway)
  db.run('PRAGMA journal_mode = WAL;');          // concurrency lebih baik
  db.run('PRAGMA synchronous = NORMAL;');        // balance speed & safety
  db.run('PRAGMA busy_timeout = 5000;');         // hindari lock timeout

  console.log(`✅ SQLite connected at: ${DB_PATH}`);
  console.log(`   WAL mode: enabled`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  // ────────────────────────────────────────────────
  // Schema & Indexes (jalan idempoten)
  // ────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS launches (
      id              TEXT PRIMARY KEY,
      symbol          TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      description     TEXT,
      pet_type        TEXT NOT NULL,
      image_url       TEXT,
      agent_name      TEXT,
      agent_wallet    TEXT NOT NULL,
      contract_address TEXT,
      tx_hash         TEXT,
      chain_id        INTEGER DEFAULT 8453,
      post_id         TEXT,
      post_url        TEXT,
      website         TEXT,
      twitter         TEXT,
      clanker_url     TEXT,
      status          TEXT DEFAULT 'pending',
      error_message   TEXT,
      launched_at     DATETIME,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      agent_id        TEXT PRIMARY KEY,
      agent_name      TEXT,
      last_launch_at  DATETIME NOT NULL,
      launch_count    INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS processed_posts (
      post_id         TEXT PRIMARY KEY,
      processed_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      status          TEXT DEFAULT 'processed'
    );

    CREATE INDEX IF NOT EXISTS idx_launches_symbol ON launches(symbol);
    CREATE INDEX IF NOT EXISTS idx_launches_status ON launches(status);
  `);

  console.log('   Schema & indexes ready');
} catch (err) {
  console.error('❌ SQLite initialization failed:', err);
  console.error('   Path attempted:', DB_PATH);
  process.exit(1); // Crash agar Railway detect error
}

// ────────────────────────────────────────────────
// Prepared statements (gunakan db.query untuk caching)
// ────────────────────────────────────────────────
export const queries = {
  createLaunch: db.query(`
    INSERT INTO launches (id, symbol, name, description, pet_type, image_url, agent_name, agent_wallet, post_id, post_url, website, twitter, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `),

  updateLaunchDeployed: db.query(`
    UPDATE launches 
    SET contract_address = ?, tx_hash = ?, clanker_url = ?, status = 'deployed', launched_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),

  updateLaunchFailed: db.query(`
    UPDATE launches 
    SET status = 'failed', error_message = ? 
    WHERE id = ?
  `),

  getLaunchBySymbol: db.query(`SELECT * FROM launches WHERE symbol = ? COLLATE NOCASE`),

  getLaunchByContract: db.query(`SELECT * FROM launches WHERE contract_address = ?`),

  getAllLaunches: db.query(`SELECT * FROM launches WHERE status = 'deployed' ORDER BY launched_at DESC LIMIT ? OFFSET ?`),

  getLaunchesByPetType: db.query(`SELECT * FROM launches WHERE pet_type = ? AND status = 'deployed' ORDER BY launched_at DESC LIMIT ? OFFSET ?`),

  countLaunches: db.query(`SELECT COUNT(*) as count FROM launches WHERE status = 'deployed'`),

  getRateLimit: db.query(`SELECT * FROM rate_limits WHERE agent_id = ?`),

  upsertRateLimit: db.query(`
    INSERT INTO rate_limits (agent_id, agent_name, last_launch_at, launch_count) 
    VALUES (?, ?, CURRENT_TIMESTAMP, 1)
    ON CONFLICT(agent_id) DO UPDATE SET 
      last_launch_at = CURRENT_TIMESTAMP, 
      launch_count = launch_count + 1
  `),

  isPostProcessed: db.query(`SELECT * FROM processed_posts WHERE post_id = ?`),

  markPostProcessed: db.query(`INSERT OR REPLACE INTO processed_posts (post_id, status) VALUES (?, ?)`),
};

// Contoh penggunaan (di kode lain):
// queries.createLaunch.run(id, symbol, name, ...);
// queries.getLaunchBySymbol.get(symbol);  // return object atau null

console.log('✅ Database & prepared statements ready');

export default db;
