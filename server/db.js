// Database module using sql.js (pure JavaScript SQLite)
// Persists to data/anavandi.db

import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const DB_PATH = join(DATA_DIR, 'anavandi.db');

let db = null;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  mkdirSync(DATA_DIR, { recursive: true });

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK(role IN ('student','institution','admin','conductor')),
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS institutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      place TEXT,
      postal_name TEXT,
      pincode TEXT,
      district TEXT,
      institution_type TEXT,
      education_level TEXT,
      head_name TEXT,
      affiliation_university TEXT,
      affiliation_number TEXT,
      status TEXT DEFAULT 'verified',
      verification_notes TEXT,
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrations for existing databases
  try { db.run("ALTER TABLE institutions ADD COLUMN status TEXT DEFAULT 'verified'"); } catch (_) {}
  try { db.run("ALTER TABLE institutions ADD COLUMN verification_notes TEXT"); } catch (_) {}
  try { db.run("ALTER TABLE institutions ADD COLUMN verified_by TEXT"); } catch (_) {}
  try { db.run("ALTER TABLE institutions ADD COLUMN verified_at TEXT"); } catch (_) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_user_id INTEGER NOT NULL REFERENCES users(id),
      institution_id INTEGER REFERENCES institutions(id),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','inst_approved','approved','rejected','issued')),
      
      -- Personal details
      date_of_birth TEXT,
      age INTEGER,
      gender TEXT,
      guardian_name TEXT,
      aadhaar_number TEXT,
      address TEXT,
      place TEXT,
      postal_name TEXT,
      pincode TEXT,
      district TEXT,
      
      -- Institution details
      roll_no TEXT,
      course TEXT,
      department TEXT,
      year_of_study TEXT,
      semester TEXT,
      academic_year TEXT,
      
      -- Route details
      route_from TEXT,
      route_to TEXT,
      distance_km REAL,
      concession_category TEXT DEFAULT 'General',
      
      -- Documents (file paths)
      photo_path TEXT,
      document_path TEXT,
      
      rejection_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      credential_id TEXT UNIQUE NOT NULL,
      jws_token TEXT NOT NULL,
      valid_from TEXT NOT NULL,
      valid_to TEXT NOT NULL,
      revoked INTEGER DEFAULT 0,
      revoked_at TEXT,
      revoke_reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS verification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credential_id TEXT,
      result TEXT,
      mode TEXT,
      verified_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // OTP tokens for email verification
  db.run(`
    CREATE TABLE IF NOT EXISTS otp_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Document uploads — ID cards and photos submitted by students
  db.run(`
    CREATE TABLE IF NOT EXISTS document_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER REFERENCES applications(id),
      student_user_id INTEGER REFERENCES users(id),
      doc_type TEXT NOT NULL CHECK(doc_type IN ('id_card','photo','other')),
      original_name TEXT,
      stored_path TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      uploaded_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Travel/verification events — created when conductor scans a pass
  db.run(`
    CREATE TABLE IF NOT EXISTS verification_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credential_id TEXT NOT NULL,
      student_name TEXT,
      institution_name TEXT,
      institution_id INTEGER,
      student_user_id INTEGER,
      route_from TEXT,
      route_to TEXT,
      pass_id TEXT,
      conductor_id INTEGER,
      conductor_name TEXT,
      verification_mode TEXT NOT NULL CHECK(verification_mode IN ('ONLINE','OFFLINE')),
      verification_result TEXT NOT NULL CHECK(verification_result IN ('VALID','INVALID','EXPIRED','REVOKED','TAMPERED')),
      verified_at TEXT NOT NULL,
      synced_at TEXT DEFAULT (datetime('now')),
      device_id TEXT,
      notes TEXT
    )
  `);

  saveDb();
  return db;
}

export function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

// Helper: run a query and return all results as array of objects
export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run a query and return the first result
export function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Helper: run an insert/update/delete and return lastInsertRowid
export function execute(sql, params = []) {
  db.run(sql, params);
  const result = db.exec("SELECT last_insert_rowid() as id");
  return result.length > 0 ? result[0].values[0][0] : null;
}
