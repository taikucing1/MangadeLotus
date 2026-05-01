import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(dbPath);

export const initDb = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Create Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT,
          role TEXT CHECK(role IN ('admin', 'reseller')),
          saldo INTEGER DEFAULT 0,
          markup_percent INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Transactions table
      db.run(`
        CREATE TABLE IF NOT EXISTS transaksi (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          produk TEXT,
          harga_beli INTEGER,
          harga_jual INTEGER,
          keuntungan INTEGER DEFAULT 0,
          status TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // Create Withdraw table
      db.run(`
        CREATE TABLE IF NOT EXISTS withdraw (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          amount INTEGER,
          status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // Create Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE,
          value TEXT
        )
      `);

      // Create Activity Log table
      db.run(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          activity TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // Create Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          harga_dasar INTEGER,
          margin INTEGER, -- in percentage
          stok INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed default admin
      const adminUsername = 'admin';
      const adminPass = 'Admin230521';
      const hashedPass = bcrypt.hashSync(adminPass, 10);

      db.get('SELECT * FROM users WHERE username = ?', [adminUsername], (err, row) => {
        if (!row) {
          db.run('INSERT INTO users (username, password, role, saldo) VALUES (?, ?, ?, ?)', [adminUsername, hashedPass, 'admin', 0]);
          console.log('[ADMIN] Default admin created');
        }
      });

      // Seed default API Key if not exists
      db.get('SELECT * FROM settings WHERE key = ?', ['API_KEY'], (err, row) => {
        if (!row) {
          db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['API_KEY', 'DEFAULT_KEY_123']);
        }
      });

      resolve();
    });
  });
};

export const query = (sql: string, params: any[] = []) => {
  return new Promise<any[]>((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const get = (sql: string, params: any[] = []) => {
  return new Promise<any>((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = (sql: string, params: any[] = []) => {
  return new Promise<{ lastID: number; changes: number }>((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export default db;
