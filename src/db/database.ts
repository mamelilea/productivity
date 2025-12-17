// Database configuration and initialization
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import {
  getMockDatabase,
  initializeMockDatabase,
  MockSQLiteDatabase,
  resetMockDatabase
} from './database.web';

const DATABASE_NAME = 'taskmaster.db';

// Check apakah platform web
const isWeb = Platform.OS === 'web';

// Type untuk database (bisa SQLite atau Mock)
type DatabaseType = SQLite.SQLiteDatabase | MockSQLiteDatabase;

// Singleton instance untuk database
let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Get database instance (singleton)
export const getDatabase = async (): Promise<DatabaseType> => {
  if (isWeb) {
    return getMockDatabase();
  }

  // Jika sudah ada instance, return langsung
  if (dbInstance) {
    return dbInstance;
  }

  // Jika sedang dalam proses opening, tunggu
  if (dbPromise) {
    return dbPromise;
  }

  // Buat promise untuk opening database
  dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);

  try {
    dbInstance = await dbPromise;
    return dbInstance;
  } catch (error) {
    // Reset promise jika gagal
    dbPromise = null;
    throw error;
  }
};

// Initialize all tables
export const initializeDatabase = async (): Promise<void> => {
  // Jika web, gunakan mock database
  if (isWeb) {
    await initializeMockDatabase();
    return;
  }

  const db = await getDatabase();

  // Migration: Recreate tasks table with CUSTOM type support
  try {
    // Check if table exists and if it has CUSTOM in type constraint
    const sqlResult = await db.getAllAsync(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'"
    );

    if (sqlResult.length > 0) {
      const createSql = (sqlResult[0] as any).sql || '';
      // Check if CUSTOM is in the type constraint
      const hasCustomConstraint = createSql.includes("'CUSTOM'");

      if (!hasCustomConstraint) {
        console.log('Migration: Recreating tasks table with CUSTOM type support...');

        await db.execAsync(`
          -- Create new table with correct schema
          CREATE TABLE IF NOT EXISTS tasks_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category_id INTEGER,
            type TEXT NOT NULL CHECK(type IN ('KULIAH', 'NON_KULIAH', 'CUSTOM')),
            custom_type TEXT DEFAULT NULL,
            status TEXT NOT NULL DEFAULT 'TODO' CHECK(status IN ('TODO', 'PROGRESS', 'DONE')),
            priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH')),
            deadline TEXT,
            is_today INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            completed_at TEXT,
            FOREIGN KEY (category_id) REFERENCES categories(id)
          );

          -- Copy data from old table (only columns that exist)
          INSERT INTO tasks_new (id, title, description, category_id, type, status, priority, deadline, is_today, created_at, completed_at)
          SELECT id, title, description, category_id, type, status, priority, deadline, is_today, created_at, completed_at FROM tasks;

          -- Drop old table
          DROP TABLE tasks;

          -- Rename new table
          ALTER TABLE tasks_new RENAME TO tasks;
        `);

        console.log('Migration: Tasks table recreated successfully');
      }
    }
  } catch (e) {
    console.log('Migration check skipped:', e);
    // Table doesn't exist yet, will be created below
  }

  // Migration: Add is_private column to notes table if it doesn't exist
  try {
    const notesTableInfo = await db.getAllAsync("PRAGMA table_info(notes)");
    if ((notesTableInfo as any[]).length > 0) {
      const hasIsPrivate = (notesTableInfo as any[]).some(col => col.name === 'is_private');
      if (!hasIsPrivate) {
        await db.execAsync("ALTER TABLE notes ADD COLUMN is_private INTEGER DEFAULT 0");
        console.log('Migration: Added is_private column to notes table');
      }
    }
  } catch (e) {
    console.log('Notes migration check skipped:', e);
  }

  // Migration: Add missing columns to schedules table
  try {
    const schedulesTableInfo = await db.getAllAsync("PRAGMA table_info(schedules)");
    if ((schedulesTableInfo as any[]).length > 0) {
      const columns = (schedulesTableInfo as any[]).map(col => col.name);

      // Add all potentially missing columns
      const missingColumns = [
        { name: 'custom_type', sql: "ALTER TABLE schedules ADD COLUMN custom_type TEXT DEFAULT NULL" },
        { name: 'description', sql: "ALTER TABLE schedules ADD COLUMN description TEXT DEFAULT ''" },
        { name: 'is_recurring', sql: "ALTER TABLE schedules ADD COLUMN is_recurring INTEGER DEFAULT 0" },
        { name: 'recurrence_type', sql: "ALTER TABLE schedules ADD COLUMN recurrence_type TEXT DEFAULT 'none'" },
        { name: 'recurrence_interval', sql: "ALTER TABLE schedules ADD COLUMN recurrence_interval INTEGER DEFAULT 1" },
        { name: 'recurrence_days', sql: "ALTER TABLE schedules ADD COLUMN recurrence_days TEXT DEFAULT NULL" },
        { name: 'recurrence_end_type', sql: "ALTER TABLE schedules ADD COLUMN recurrence_end_type TEXT DEFAULT 'never'" },
        { name: 'recurrence_end_date', sql: "ALTER TABLE schedules ADD COLUMN recurrence_end_date TEXT DEFAULT NULL" },
        { name: 'recurrence_end_count', sql: "ALTER TABLE schedules ADD COLUMN recurrence_end_count INTEGER DEFAULT NULL" },
      ];

      for (const col of missingColumns) {
        if (!columns.includes(col.name)) {
          await db.execAsync(col.sql);
          console.log(`Migration: Added ${col.name} column to schedules table`);
        }
      }
    }
  } catch (e) {
    console.log('Schedules migration check skipped:', e);
  }

  await db.execAsync(`
    -- Categories table (untuk Task dan Notes)
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('TASK', 'NOTE')),
      color TEXT DEFAULT '#6366F1',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Tasks table (semua tugas kuliah & non-kuliah)
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('KULIAH', 'NON_KULIAH', 'CUSTOM')),
      custom_type TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'TODO' CHECK(status IN ('TODO', 'PROGRESS', 'DONE')),
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH')),
      deadline TEXT,
      is_today INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      completed_at TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- Course details (detail khusus tugas kuliah)
    CREATE TABLE IF NOT EXISTS course_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER UNIQUE NOT NULL,
      course_name TEXT NOT NULL,
      assignment_type TEXT NOT NULL CHECK(assignment_type IN ('INDIVIDU', 'KELOMPOK')),
      notes TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- Task links (link pendukung per task)
    CREATE TABLE IF NOT EXISTS task_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      label TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- Notes table (catatan berbasis kategori)
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      category_id INTEGER,
      is_private INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- App settings table (untuk sandi dan pengaturan lainnya)
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Schedules table (jadwal kuliah, UTS/UAS, custom)
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('KULIAH', 'UTS', 'UAS', 'CUSTOM')),
      custom_type TEXT DEFAULT NULL,
      description TEXT DEFAULT '',
      start_time TEXT NOT NULL,
      end_time TEXT,
      day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
      is_recurring INTEGER DEFAULT 0,
      recurrence_type TEXT DEFAULT 'none' CHECK(recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom')),
      recurrence_interval INTEGER DEFAULT 1,
      recurrence_days TEXT DEFAULT NULL,
      recurrence_end_type TEXT DEFAULT 'never' CHECK(recurrence_end_type IN ('never', 'date', 'count')),
      recurrence_end_date TEXT DEFAULT NULL,
      recurrence_end_count INTEGER DEFAULT NULL,
      location TEXT,
      color TEXT DEFAULT '#6366F1',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Schedule links table (link pendukung per jadwal)
    CREATE TABLE IF NOT EXISTS schedule_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      label TEXT,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
    );

    -- Notifications table (reminder untuk task & schedule)
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL CHECK(target_type IN ('TASK', 'SCHEDULE')),
      target_id INTEGER NOT NULL,
      trigger_at TEXT NOT NULL,
      offset_minutes INTEGER NOT NULL,
      is_sent INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      expo_notification_id TEXT
    );

    -- Logbook categories table (kategori logbook custom)
    CREATE TABLE IF NOT EXISTS logbook_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366F1',
      icon TEXT DEFAULT '📝',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Logbook entries table (catatan aktivitas harian per kategori)
    CREATE TABLE IF NOT EXISTS logbook_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      date TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES logbook_categories(id) ON DELETE CASCADE
    );

    -- Finance categories table (kategori keuangan custom)
    CREATE TABLE IF NOT EXISTS finance_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
      icon TEXT DEFAULT '💵',
      color TEXT DEFAULT '#6B7280',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- Transactions table (log keuangan harian)
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
      amount REAL NOT NULL,
      category_id INTEGER,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (category_id) REFERENCES finance_categories(id)
    );

    -- Monthly budgets table (anggaran bulanan dan harian)
    CREATE TABLE IF NOT EXISTS monthly_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      planned_income REAL DEFAULT 0,
      planned_expense REAL DEFAULT 0,
      daily_budget REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(year, month)
    );

    -- Create indexes untuk performa query
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_is_today ON tasks(is_today);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_schedules_start_time ON schedules(start_time);
    CREATE INDEX IF NOT EXISTS idx_notifications_trigger_at ON notifications(trigger_at);
    CREATE INDEX IF NOT EXISTS idx_logbook_date ON logbook_entries(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  `);

  // Insert default categories jika belum ada
  const existingCategories = await db.getAllAsync('SELECT COUNT(*) as count FROM categories');
  if ((existingCategories[0] as any).count === 0) {
    await db.execAsync(`
      -- Kategori Task
      INSERT INTO categories (name, type, color) VALUES ('Umum', 'TASK', '#6366F1');
      INSERT INTO categories (name, type, color) VALUES ('Penting', 'TASK', '#EF4444');
      INSERT INTO categories (name, type, color) VALUES ('Pribadi', 'TASK', '#10B981');
      
      -- Kategori Notes
      INSERT INTO categories (name, type, color) VALUES ('Catatan Umum', 'NOTE', '#8B5CF6');
      INSERT INTO categories (name, type, color) VALUES ('Wishlist', 'NOTE', '#F59E0B');
      INSERT INTO categories (name, type, color) VALUES ('Makanan', 'NOTE', '#EC4899');
    `);
  }

  console.log('Database initialized successfully');
};

// Reset database (untuk development)
export const resetDatabase = async (): Promise<void> => {
  // Jika web, gunakan mock reset
  if (isWeb) {
    await resetMockDatabase();
    return;
  }

  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS logbook_entries;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS task_links;
    DROP TABLE IF EXISTS course_details;
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS schedules;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS categories;
  `);
  await initializeDatabase();
};
