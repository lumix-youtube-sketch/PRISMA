// SQLite access layer. One better-sqlite3 connection, created lazily, with the
// schema applied on first open. All queries are prepared statements; callers get
// typed rows. No ORM — the schema is small and explicit on purpose.

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config";
import type { Profile, RestrictionId, Verdict } from "@foodguard/shared";

let db: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,          -- telegram user id
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  restrictions  TEXT NOT NULL DEFAULT '[]',   -- JSON array of RestrictionId
  custom        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

CREATE TABLE IF NOT EXISTS scans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source        TEXT NOT NULL,                -- 'barcode' | 'photo' | 'chat'
  barcode       TEXT,
  product_name  TEXT,
  image_url     TEXT,
  ingredients   TEXT NOT NULL DEFAULT '[]',   -- JSON array of string
  results       TEXT NOT NULL DEFAULT '[]',   -- JSON array of ProfileResult
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS diary (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id    INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  reaction      TEXT NOT NULL,                -- 'none' | 'mild' | 'severe'
  note          TEXT,
  eaten_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_diary_user ON diary(user_id, eaten_at DESC);

CREATE TABLE IF NOT EXISTS catalog_cache (
  barcode       TEXT PRIMARY KEY,
  product_name  TEXT,
  image_url     TEXT,
  ingredients   TEXT NOT NULL DEFAULT '[]',
  source        TEXT NOT NULL,                -- 'off' | 'crowd'
  fetched_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS crowd_submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  barcode       TEXT,
  product_name  TEXT,
  ingredients   TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Prisma+ subscription. One row per user; isPremium is derived from an active row.
-- Real billing (Telegram Stars / ЮKassa) comes later — see subsRepo.activateDemo.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL,                -- 'prisma_plus'
  status        TEXT NOT NULL,                -- 'active' | 'canceled' | 'expired'
  expires_at    TEXT,                         -- ISO datetime, or NULL (demo = no expiry)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function getDb(): Database.Database {
  if (db) return db;
  const dir = path.dirname(config.dbPath);
  if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
  db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

/** Ensure a users row exists for this telegram id (profiles hang off it). */
export function ensureUser(userId: number): void {
  getDb().prepare("INSERT OR IGNORE INTO users(id) VALUES (?)").run(userId);
}

// ---- Row shapes as stored (JSON columns are strings) -------------------------

interface ProfileRow {
  id: number; user_id: number; name: string; restrictions: string; custom: string | null;
}

function rowToProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    name: r.name,
    restrictions: JSON.parse(r.restrictions) as RestrictionId[],
    custom: r.custom ?? undefined,
  };
}

// ---- Profiles ----------------------------------------------------------------

export const profilesRepo = {
  list(userId: number): Profile[] {
    return (getDb()
      .prepare("SELECT * FROM profiles WHERE user_id = ? ORDER BY id")
      .all(userId) as ProfileRow[]).map(rowToProfile);
  },
  create(userId: number, p: Profile): Profile {
    const info = getDb()
      .prepare("INSERT INTO profiles(user_id, name, restrictions, custom) VALUES (?,?,?,?)")
      .run(userId, p.name, JSON.stringify(p.restrictions ?? []), p.custom ?? null);
    return { ...p, id: Number(info.lastInsertRowid) };
  },
  update(userId: number, id: number, p: Profile): Profile | null {
    const info = getDb()
      .prepare("UPDATE profiles SET name=?, restrictions=?, custom=? WHERE id=? AND user_id=?")
      .run(p.name, JSON.stringify(p.restrictions ?? []), p.custom ?? null, id, userId);
    return info.changes ? { ...p, id } : null;
  },
  remove(userId: number, id: number): boolean {
    return getDb().prepare("DELETE FROM profiles WHERE id=? AND user_id=?").run(id, userId).changes > 0;
  },
};

// ---- Scans / history ---------------------------------------------------------

export interface ScanRecord {
  source: "barcode" | "photo" | "chat";
  barcode?: string;
  productName?: string;
  imageUrl?: string;
  ingredients: string[];
  results: unknown; // ProfileResult[]
}

export const scansRepo = {
  add(userId: number, s: ScanRecord): number {
    const info = getDb()
      .prepare(`INSERT INTO scans(user_id, source, barcode, product_name, image_url, ingredients, results)
                VALUES (?,?,?,?,?,?,?)`)
      .run(userId, s.source, s.barcode ?? null, s.productName ?? null, s.imageUrl ?? null,
           JSON.stringify(s.ingredients), JSON.stringify(s.results ?? []));
    return Number(info.lastInsertRowid);
  },
  list(userId: number, limit = 50): unknown[] {
    return (getDb()
      .prepare("SELECT * FROM scans WHERE user_id=? ORDER BY created_at DESC, id DESC LIMIT ?")
      .all(userId, limit) as any[]).map((r) => ({
        id: r.id, source: r.source, barcode: r.barcode, productName: r.product_name,
        imageUrl: r.image_url, ingredients: JSON.parse(r.ingredients),
        results: JSON.parse(r.results), createdAt: r.created_at,
      }));
  },
};

// ---- Diary -------------------------------------------------------------------

export const diaryRepo = {
  add(userId: number, d: { profileId?: number; productName: string; reaction: string; note?: string }): number {
    const info = getDb()
      .prepare("INSERT INTO diary(user_id, profile_id, product_name, reaction, note) VALUES (?,?,?,?,?)")
      .run(userId, d.profileId ?? null, d.productName, d.reaction, d.note ?? null);
    return Number(info.lastInsertRowid);
  },
  list(userId: number, limit = 100): unknown[] {
    return (getDb()
      .prepare("SELECT * FROM diary WHERE user_id=? ORDER BY eaten_at DESC, id DESC LIMIT ?")
      .all(userId, limit) as any[]).map((r) => ({
        id: r.id, profileId: r.profile_id, productName: r.product_name,
        reaction: r.reaction, note: r.note, eatenAt: r.eaten_at,
      }));
  },
};

// ---- Catalog cache (barcode -> composition) ----------------------------------

export const cacheRepo = {
  get(barcode: string): { productName?: string; imageUrl?: string; ingredients: string[]; source: string } | null {
    const r = getDb().prepare("SELECT * FROM catalog_cache WHERE barcode=?").get(barcode) as any;
    if (!r) return null;
    return { productName: r.product_name, imageUrl: r.image_url, ingredients: JSON.parse(r.ingredients), source: r.source };
  },
  put(barcode: string, v: { productName?: string; imageUrl?: string; ingredients: string[]; source: string }): void {
    getDb().prepare(`INSERT INTO catalog_cache(barcode, product_name, image_url, ingredients, source)
                     VALUES (?,?,?,?,?)
                     ON CONFLICT(barcode) DO UPDATE SET
                       product_name=excluded.product_name, image_url=excluded.image_url,
                       ingredients=excluded.ingredients, source=excluded.source,
                       fetched_at=datetime('now')`)
      .run(barcode, v.productName ?? null, v.imageUrl ?? null, JSON.stringify(v.ingredients), v.source);
  },
};

// ---- Crowdsourced compositions -----------------------------------------------

export const crowdRepo = {
  add(userId: number, c: { barcode?: string; productName?: string; ingredients: string[] }): number {
    const info = getDb()
      .prepare("INSERT INTO crowd_submissions(user_id, barcode, product_name, ingredients) VALUES (?,?,?,?)")
      .run(userId, c.barcode ?? null, c.productName ?? null, JSON.stringify(c.ingredients));
    // A crowd submission immediately backfills the cache so the next scan sees it.
    if (c.barcode) cacheRepo.put(c.barcode, { productName: c.productName, ingredients: c.ingredients, source: "crowd" });
    return Number(info.lastInsertRowid);
  },
};

// ---- Subscriptions (Prisma+) -------------------------------------------------

export interface Subscription { plan: string; status: string; expiresAt: string | null }

export const subsRepo = {
  get(userId: number): Subscription | null {
    const r = getDb().prepare("SELECT plan, status, expires_at FROM subscriptions WHERE user_id=?").get(userId) as any;
    return r ? { plan: r.plan, status: r.status, expiresAt: r.expires_at ?? null } : null;
  },
  /** Premium = an active subscription that hasn't expired (NULL expiry = demo, never expires). */
  isPremium(userId: number): boolean {
    const s = this.get(userId);
    if (!s || s.status !== "active") return false;
    return s.expiresAt === null || new Date(s.expiresAt).getTime() > Date.now();
  },
  /** DEMO activation — no real payment. TODO: replace with Telegram Stars / ЮKassa billing. */
  activateDemo(userId: number): void {
    getDb().prepare(`INSERT INTO subscriptions(user_id, plan, status, expires_at)
                     VALUES (?, 'prisma_plus', 'active', NULL)
                     ON CONFLICT(user_id) DO UPDATE SET plan='prisma_plus', status='active', expires_at=NULL`)
      .run(userId);
  },
  cancel(userId: number): void {
    getDb().prepare("UPDATE subscriptions SET status='canceled' WHERE user_id=?").run(userId);
  },
};
