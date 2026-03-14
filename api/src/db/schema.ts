import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { config } from "../config";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(config.dbPath);
    db.pragma("journal_mode = WAL");
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS epochs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      epoch_number INTEGER UNIQUE NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      finalized BOOLEAN DEFAULT 0,
      finalized_at TEXT
    );

    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      external_id INTEGER,
      token_symbol TEXT,
      token_address TEXT,
      profile_pic TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_name ON agents(name);

    CREATE TABLE IF NOT EXISTS rankings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      epoch_number INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      rank INTEGER NOT NULL,
      score REAL,
      weekly_revenue REAL,
      job_count INTEGER,
      unique_users INTEGER,
      success_rate REAL,
      scraped_at TEXT DEFAULT (datetime('now')),
      is_final BOOLEAN DEFAULT 0,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    -- Unique constraint: one ranking per agent per epoch (latest wins via upsert)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_rankings_epoch_agent
      ON rankings(epoch_number, agent_id);

    CREATE INDEX IF NOT EXISTS idx_rankings_epoch ON rankings(epoch_number);

    CREATE TABLE IF NOT EXISTS markets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT UNIQUE NOT NULL,
      question TEXT NOT NULL,
      market_type INTEGER NOT NULL,
      collateral_token TEXT,
      epoch_number INTEGER,
      agent_name TEXT,
      resolution_time INTEGER NOT NULL,
      resolved BOOLEAN DEFAULT 0,
      outcome INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_markets_epoch ON markets(epoch_number);
  `);

  // Migration: add profile_pic column if missing (existing databases)
  const cols = db.prepare("PRAGMA table_info(agents)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "profile_pic")) {
    db.exec("ALTER TABLE agents ADD COLUMN profile_pic TEXT");
  }
}

// --- Epoch operations ---

export function upsertEpoch(
  epochNumber: number,
  startTime: string,
  endTime: string,
  finalized: boolean = false
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO epochs (epoch_number, start_time, end_time, finalized, finalized_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(epoch_number) DO UPDATE SET
       start_time = excluded.start_time,
       end_time = excluded.end_time,
       finalized = excluded.finalized,
       finalized_at = CASE WHEN excluded.finalized = 1 THEN datetime('now') ELSE finalized_at END`
  ).run(epochNumber, startTime, endTime, finalized ? 1 : 0, finalized ? new Date().toISOString() : null);
}

// --- Agent operations ---

export function upsertAgent(name: string, tokenSymbol?: string, tokenAddress?: string, profilePic?: string): number {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM agents WHERE name = ?").get(name) as
    | { id: number }
    | undefined;

  if (existing) {
    if (tokenSymbol || tokenAddress || profilePic) {
      db.prepare("UPDATE agents SET token_symbol = ?, token_address = ?, profile_pic = ? WHERE id = ?").run(
        tokenSymbol,
        tokenAddress,
        profilePic || null,
        existing.id
      );
    }
    return existing.id;
  }

  const result = db
    .prepare("INSERT INTO agents (name, token_symbol, token_address, profile_pic) VALUES (?, ?, ?, ?)")
    .run(name, tokenSymbol || null, tokenAddress || null, profilePic || null);
  return result.lastInsertRowid as number;
}

// --- Ranking operations ---

/**
 * Insert or update a ranking entry.
 * Uses UPSERT (ON CONFLICT) to deduplicate — only one entry per agent per epoch.
 * Each scrape updates the existing row rather than creating duplicates.
 */
export function clearEpochRankings(epochNumber: number): void {
  const db = getDb();
  db.prepare("DELETE FROM rankings WHERE epoch_number = ? AND is_final = 0").run(epochNumber);
}

export function insertRanking(
  epochNumber: number,
  agentId: number,
  rank: number,
  score?: number,
  weeklyRevenue?: number,
  jobCount?: number,
  uniqueUsers?: number,
  successRate?: number,
  isFinal: boolean = false
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO rankings (epoch_number, agent_id, rank, score, weekly_revenue, job_count, unique_users, success_rate, is_final, scraped_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(epoch_number, agent_id) DO UPDATE SET
       rank = excluded.rank,
       score = excluded.score,
       weekly_revenue = excluded.weekly_revenue,
       job_count = excluded.job_count,
       unique_users = excluded.unique_users,
       success_rate = excluded.success_rate,
       is_final = excluded.is_final,
       scraped_at = excluded.scraped_at`
  ).run(epochNumber, agentId, rank, score, weeklyRevenue, jobCount, uniqueUsers, successRate, isFinal ? 1 : 0);
}

// --- Query helpers ---

export interface LeaderboardEntry {
  rank: number;
  name: string;
  token_symbol: string | null;
  profile_pic: string | null;
  score: number | null;
  weekly_revenue: number | null;
  job_count: number | null;
  unique_users: number | null;
  success_rate: number | null;
  scraped_at: string;
}

export function getLatestLeaderboard(epochNumber?: number): LeaderboardEntry[] {
  const db = getDb();

  if (epochNumber) {
    return db
      .prepare(
        `SELECT r.rank, a.name, a.token_symbol, a.profile_pic, r.score, r.weekly_revenue,
                r.job_count, r.unique_users, r.success_rate, r.scraped_at
         FROM rankings r
         JOIN agents a ON r.agent_id = a.id
         WHERE r.epoch_number = ?
         ORDER BY r.rank ASC`
      )
      .all(epochNumber) as LeaderboardEntry[];
  }

  // Get rankings for the most recent epoch
  return db
    .prepare(
      `SELECT r.rank, a.name, a.token_symbol, a.profile_pic, r.score, r.weekly_revenue,
              r.job_count, r.unique_users, r.success_rate, r.scraped_at
       FROM rankings r
       JOIN agents a ON r.agent_id = a.id
       WHERE r.epoch_number = (SELECT MAX(epoch_number) FROM rankings)
       ORDER BY r.rank ASC`
    )
    .all() as LeaderboardEntry[];
}

export function getFinalRankings(epochNumber: number): LeaderboardEntry[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT r.rank, a.name, a.token_symbol, a.profile_pic, r.score, r.weekly_revenue,
              r.job_count, r.unique_users, r.success_rate, r.scraped_at
       FROM rankings r
       JOIN agents a ON r.agent_id = a.id
       WHERE r.epoch_number = ? AND r.is_final = 1
       ORDER BY r.rank ASC`
    )
    .all(epochNumber) as LeaderboardEntry[];
}

export function getEpochInfo(epochNumber: number) {
  const db = getDb();
  return db.prepare("SELECT * FROM epochs WHERE epoch_number = ?").get(epochNumber);
}
