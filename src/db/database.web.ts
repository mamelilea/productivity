// Mock Database untuk Web Platform (localStorage)
// File ini digunakan saat aplikasi berjalan di browser

import { Platform } from 'react-native';

interface MockRow {
    [key: string]: any;
}

interface MockTable {
    rows: MockRow[];
    autoIncrement: number;
}

interface MockDatabase {
    [tableName: string]: MockTable;
}

const STORAGE_KEY = 'taskmaster_mock_db';

// Helper untuk generate ID
let mockIdCounter = 1;

// In-memory database
let mockDb: MockDatabase = {
    categories: { rows: [], autoIncrement: 1 },
    tasks: { rows: [], autoIncrement: 1 },
    course_details: { rows: [], autoIncrement: 1 },
    task_links: { rows: [], autoIncrement: 1 },
    notes: { rows: [], autoIncrement: 1 },
    schedules: { rows: [], autoIncrement: 1 },
    notifications: { rows: [], autoIncrement: 1 },
    logbook_entries: { rows: [], autoIncrement: 1 },
};

// Load dari localStorage
const loadFromStorage = (): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                mockDb = JSON.parse(stored);
            } catch (e) {
                console.warn('Failed to parse stored database:', e);
            }
        }
    }
};

// Save ke localStorage
const saveToStorage = (): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDb));
    }
};

// Get current datetime dalam format SQLite
const getCurrentDateTime = (): string => {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
};

// Mock SQLite Database class untuk web
export class MockSQLiteDatabase {
    async execAsync(sql: string): Promise<void> {
        // Parse dan execute SQL statements
        const statements = sql.split(';').filter(s => s.trim());
        for (const stmt of statements) {
            await this.executeStatement(stmt.trim());
        }
        saveToStorage();
    }

    private async executeStatement(sql: string): Promise<void> {
        const sqlLower = sql.toLowerCase();

        // Skip CREATE TABLE dan CREATE INDEX - struktur sudah fix
        if (sqlLower.includes('create table') || sqlLower.includes('create index')) {
            return;
        }

        // Skip DROP TABLE untuk reset
        if (sqlLower.includes('drop table')) {
            const match = sql.match(/drop\s+table\s+if\s+exists\s+(\w+)/i);
            if (match) {
                const tableName = match[1];
                if (mockDb[tableName]) {
                    mockDb[tableName] = { rows: [], autoIncrement: 1 };
                }
            }
            return;
        }

        // Handle INSERT
        if (sqlLower.startsWith('insert into')) {
            await this.handleInsert(sql);
            return;
        }

        // Handle UPDATE
        if (sqlLower.startsWith('update')) {
            await this.handleUpdate(sql);
            return;
        }

        // Handle DELETE
        if (sqlLower.startsWith('delete')) {
            await this.handleDelete(sql);
            return;
        }
    }

    private async handleInsert(sql: string): Promise<number> {
        // Simple INSERT parser
        const match = sql.match(/insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
        if (!match) return 0;

        const tableName = match[1];
        const columns = match[2].split(',').map(c => c.trim());
        const valuesStr = match[3];

        // Parse values (handle strings dengan quotes)
        const values: any[] = [];
        let current = '';
        let inString = false;
        let stringChar = '';

        for (let i = 0; i < valuesStr.length; i++) {
            const char = valuesStr[i];
            if ((char === "'" || char === '"') && !inString) {
                inString = true;
                stringChar = char;
            } else if (char === stringChar && inString) {
                inString = false;
                stringChar = '';
            } else if (char === ',' && !inString) {
                values.push(this.parseValue(current.trim()));
                current = '';
                continue;
            }
            current += char;
        }
        if (current.trim()) {
            values.push(this.parseValue(current.trim()));
        }

        if (!mockDb[tableName]) {
            mockDb[tableName] = { rows: [], autoIncrement: 1 };
        }

        const row: MockRow = {
            id: mockDb[tableName].autoIncrement++,
            created_at: getCurrentDateTime(),
        };

        columns.forEach((col, idx) => {
            row[col] = values[idx];
        });

        mockDb[tableName].rows.push(row);
        return row.id;
    }

    private parseValue(value: string): any {
        // Remove quotes dari string
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
            return value.slice(1, -1);
        }
        // NULL
        if (value.toLowerCase() === 'null') {
            return null;
        }
        // Number
        const num = Number(value);
        if (!isNaN(num)) {
            return num;
        }
        return value;
    }

    private async handleUpdate(sql: string): Promise<void> {
        const match = sql.match(/update\s+(\w+)\s+set\s+(.+?)\s+where\s+(.+)/i);
        if (!match) return;

        const tableName = match[1];
        const setClause = match[2];
        const whereClause = match[3];

        if (!mockDb[tableName]) return;

        // Parse SET clause
        const updates: Record<string, any> = {};
        const setParts = setClause.split(',');
        for (const part of setParts) {
            const [col, val] = part.split('=').map(s => s.trim());
            updates[col] = this.parseValue(val);
        }

        // Parse WHERE clause (simple id = X)
        const whereMatch = whereClause.match(/(\w+)\s*=\s*(.+)/);
        if (!whereMatch) return;

        const whereCol = whereMatch[1];
        const whereVal = this.parseValue(whereMatch[2].trim());

        mockDb[tableName].rows = mockDb[tableName].rows.map(row => {
            if (row[whereCol] === whereVal) {
                return { ...row, ...updates, updated_at: getCurrentDateTime() };
            }
            return row;
        });
    }

    private async handleDelete(sql: string): Promise<void> {
        const match = sql.match(/delete\s+from\s+(\w+)\s+where\s+(.+)/i);
        if (!match) return;

        const tableName = match[1];
        const whereClause = match[2];

        if (!mockDb[tableName]) return;

        const whereMatch = whereClause.match(/(\w+)\s*=\s*(.+)/);
        if (!whereMatch) return;

        const whereCol = whereMatch[1];
        const whereVal = this.parseValue(whereMatch[2].trim());

        mockDb[tableName].rows = mockDb[tableName].rows.filter(row => row[whereCol] !== whereVal);
    }

    async getAllAsync<T>(sql: string, params?: any[]): Promise<T[]> {
        loadFromStorage();

        const sqlLower = sql.toLowerCase();

        // Handle COUNT(*)
        if (sqlLower.includes('count(*)')) {
            const tableMatch = sql.match(/from\s+(\w+)/i);
            if (tableMatch) {
                const tableName = tableMatch[1];
                const count = mockDb[tableName]?.rows?.length || 0;
                return [{ count } as any];
            }
            return [{ count: 0 } as any];
        }

        // Handle basic SELECT
        const tableMatch = sql.match(/from\s+(\w+)/i);
        if (!tableMatch) return [];

        const tableName = tableMatch[1];
        if (!mockDb[tableName]) return [];

        let results = [...mockDb[tableName].rows];

        // Handle WHERE clause
        const whereMatch = sql.match(/where\s+(.+?)(?:\s+order|\s+limit|\s*$)/i);
        if (whereMatch) {
            const whereClause = whereMatch[1];
            results = results.filter(row => this.evaluateWhere(row, whereClause, params));
        }

        // Handle ORDER BY
        const orderMatch = sql.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
        if (orderMatch) {
            const orderCol = orderMatch[1];
            const orderDir = (orderMatch[2] || 'asc').toLowerCase();
            results.sort((a, b) => {
                if (a[orderCol] < b[orderCol]) return orderDir === 'asc' ? -1 : 1;
                if (a[orderCol] > b[orderCol]) return orderDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Handle LIMIT
        const limitMatch = sql.match(/limit\s+(\d+)/i);
        if (limitMatch) {
            results = results.slice(0, parseInt(limitMatch[1]));
        }

        return results as T[];
    }

    private evaluateWhere(row: MockRow, whereClause: string, params?: any[]): boolean {
        // Simple WHERE evaluation
        let paramIndex = 0;
        let clause = whereClause;

        // Replace ? dengan actual params
        if (params) {
            clause = clause.replace(/\?/g, () => {
                const val = params[paramIndex++];
                return typeof val === 'string' ? `'${val}'` : String(val);
            });
        }

        // Handle simple conditions
        const conditions = clause.split(/\s+and\s+/i);

        for (const cond of conditions) {
            const eqMatch = cond.match(/(\w+)\s*=\s*(.+)/);
            if (eqMatch) {
                const col = eqMatch[1];
                const val = this.parseValue(eqMatch[2].trim());
                if (row[col] !== val) return false;
            }
        }

        return true;
    }

    async getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null> {
        const results = await this.getAllAsync<T>(sql, params);
        return results[0] || null;
    }

    async runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
        loadFromStorage();

        const sqlLower = sql.toLowerCase();
        let lastId = 0;
        let changes = 0;

        // Handle INSERT dengan params
        if (sqlLower.startsWith('insert into')) {
            const match = sql.match(/insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\([^)]+\)/i);
            if (match && params) {
                const tableName = match[1];
                const columns = match[2].split(',').map(c => c.trim());

                if (!mockDb[tableName]) {
                    mockDb[tableName] = { rows: [], autoIncrement: 1 };
                }

                const row: MockRow = {
                    id: mockDb[tableName].autoIncrement++,
                    created_at: getCurrentDateTime(),
                };

                columns.forEach((col, idx) => {
                    row[col] = params[idx];
                });

                mockDb[tableName].rows.push(row);
                lastId = row.id;
                changes = 1;
            }
        }

        // Handle UPDATE dengan params
        if (sqlLower.startsWith('update')) {
            const match = sql.match(/update\s+(\w+)\s+set\s+(.+?)\s+where\s+(.+)/i);
            if (match && params) {
                const tableName = match[1];
                if (mockDb[tableName]) {
                    // Get WHERE column and value
                    const setCols = match[2].match(/(\w+)\s*=/g)?.map(s => s.replace(/\s*=/, '').trim()) || [];
                    let paramIdx = setCols.length;
                    const whereVal = params[paramIdx];

                    mockDb[tableName].rows = mockDb[tableName].rows.map(row => {
                        if (row.id === whereVal) {
                            const updated: MockRow = { ...row, updated_at: getCurrentDateTime() };
                            setCols.forEach((col, idx) => {
                                updated[col] = params![idx];
                            });
                            changes++;
                            return updated;
                        }
                        return row;
                    });
                }
            }
        }

        // Handle DELETE dengan params
        if (sqlLower.startsWith('delete')) {
            const match = sql.match(/delete\s+from\s+(\w+)\s+where\s+(\w+)\s*=\s*\?/i);
            if (match && params) {
                const tableName = match[1];
                const whereVal = params[0];

                if (mockDb[tableName]) {
                    const before = mockDb[tableName].rows.length;
                    mockDb[tableName].rows = mockDb[tableName].rows.filter(row => row.id !== whereVal);
                    changes = before - mockDb[tableName].rows.length;
                }
            }
        }

        saveToStorage();
        return { lastInsertRowId: lastId, changes };
    }
}

// Singleton instance
let mockDbInstance: MockSQLiteDatabase | null = null;

export const getMockDatabase = (): MockSQLiteDatabase => {
    if (!mockDbInstance) {
        loadFromStorage();
        mockDbInstance = new MockSQLiteDatabase();
    }
    return mockDbInstance;
};

// Check apakah platform web
export const isWebPlatform = (): boolean => {
    return Platform.OS === 'web';
};

// Initialize dengan default categories
export const initializeMockDatabase = async (): Promise<void> => {
    loadFromStorage();

    // Insert default categories jika belum ada
    if (mockDb.categories.rows.length === 0) {
        const db = getMockDatabase();
        await db.execAsync(`
      INSERT INTO categories (name, type, color) VALUES ('Umum', 'TASK', '#6366F1');
      INSERT INTO categories (name, type, color) VALUES ('Penting', 'TASK', '#EF4444');
      INSERT INTO categories (name, type, color) VALUES ('Pribadi', 'TASK', '#10B981');
      INSERT INTO categories (name, type, color) VALUES ('Catatan Umum', 'NOTE', '#8B5CF6');
      INSERT INTO categories (name, type, color) VALUES ('Wishlist', 'NOTE', '#F59E0B');
      INSERT INTO categories (name, type, color) VALUES ('Makanan', 'NOTE', '#EC4899');
    `);
    }

    console.log('Mock database initialized for web');
};

// Reset mock database
export const resetMockDatabase = async (): Promise<void> => {
    mockDb = {
        categories: { rows: [], autoIncrement: 1 },
        tasks: { rows: [], autoIncrement: 1 },
        course_details: { rows: [], autoIncrement: 1 },
        task_links: { rows: [], autoIncrement: 1 },
        notes: { rows: [], autoIncrement: 1 },
        schedules: { rows: [], autoIncrement: 1 },
        notifications: { rows: [], autoIncrement: 1 },
        logbook_entries: { rows: [], autoIncrement: 1 },
    };
    saveToStorage();
    await initializeMockDatabase();
};
