import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/petpad.db';
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS launches (
    id TEXT PRIMARY KEY,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    pet_type TEXT NOT NULL,
    image_url TEXT,
    agent_name TEXT,
    agent_wallet TEXT NOT NULL,
    contract_address TEXT,
    tx_hash TEXT,
    chain_id INTEGER DEFAULT 8453,
    post_id TEXT,
    post_url TEXT,
    website TEXT,
    twitter TEXT,
    clanker_url TEXT,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    launched_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    agent_id TEXT PRIMARY KEY,
    agent_name TEXT,
    last_launch_at DATETIME NOT NULL,
    launch_count INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS processed_posts (
    post_id TEXT PRIMARY KEY,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'processed'
  );

  CREATE INDEX IF NOT EXISTS idx_launches_symbol ON launches(symbol);
  CREATE INDEX IF NOT EXISTS idx_launches_status ON launches(status);
`);

console.log('✅ Database ready:', DB_PATH);

export default db;

export const queries = {
  createLaunch: db.prepare(`
    INSERT INTO launches (id, symbol, name, description, pet_type, image_url, agent_name, agent_wallet, post_id, post_url, website, twitter, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `),
  updateLaunchDeployed: db.prepare(`
    UPDATE launches SET contract_address = ?, tx_hash = ?, clanker_url = ?, status = 'deployed', launched_at = CURRENT_TIMESTAMP WHERE id = ?
  `),
  updateLaunchFailed: db.prepare(`
    UPDATE launches SET status = 'failed', error_message = ? WHERE id = ?
  `),
  getLaunchBySymbol: db.prepare(`SELECT * FROM launches WHERE symbol = ? COLLATE NOCASE`),
  getLaunchByContract: db.prepare(`SELECT * FROM launches WHERE contract_address = ?`),
  getAllLaunches: db.prepare(`SELECT * FROM launches WHERE status = 'deployed' ORDER BY launched_at DESC LIMIT ? OFFSET ?`),
  getLaunchesByPetType: db.prepare(`SELECT * FROM launches WHERE pet_type = ? AND status = 'deployed' ORDER BY launched_at DESC LIMIT ? OFFSET ?`),
  countLaunches: db.prepare(`SELECT COUNT(*) as count FROM launches WHERE status = 'deployed'`),
  getRateLimit: db.prepare(`SELECT * FROM rate_limits WHERE agent_id = ?`),
  upsertRateLimit: db.prepare(`
    INSERT INTO rate_limits (agent_id, agent_name, last_launch_at, launch_count) VALUES (?, ?, CURRENT_TIMESTAMP, 1)
    ON CONFLICT(agent_id) DO UPDATE SET last_launch_at = CURRENT_TIMESTAMP, launch_count = launch_count + 1
  `),
  isPostProcessed: db.prepare(`SELECT * FROM processed_posts WHERE post_id = ?`),
  markPostProcessed: db.prepare(`INSERT OR REPLACE INTO processed_posts (post_id, status) VALUES (?, ?)`),
};
