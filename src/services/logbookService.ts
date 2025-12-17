// Logbook Service - CRUD operations untuk daily log
import { getDatabase } from '../db/database';
import {
    CreateLogbookInput,
    LogbookEntry,
    LogbookTag,
    UpdateLogbookInput
} from '../models';

// Get all logbook entries
export const getAllLogbookEntries = async (): Promise<LogbookEntry[]> => {
    const db = await getDatabase();
    const entries = await db.getAllAsync<any>(`
        SELECT * FROM logbook_entries 
        ORDER BY date DESC
    `);

    return entries.map(parseLogbookEntry);
};

// Get logbook entries for a specific month
export const getLogbookEntriesByMonth = async (year: number, month: number): Promise<LogbookEntry[]> => {
    const db = await getDatabase();
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    const entries = await db.getAllAsync<any>(`
        SELECT * FROM logbook_entries 
        WHERE date BETWEEN ? AND ?
        ORDER BY date DESC
    `, [startDate, endDate]);

    return entries.map(parseLogbookEntry);
};

// Get logbook entry by date
export const getLogbookEntryByDate = async (date: string): Promise<LogbookEntry | null> => {
    const db = await getDatabase();
    const entry = await db.getFirstAsync<any>(
        'SELECT * FROM logbook_entries WHERE date = ?',
        [date]
    );

    return entry ? parseLogbookEntry(entry) : null;
};

// Get logbook entry by ID
export const getLogbookEntryById = async (id: number): Promise<LogbookEntry | null> => {
    const db = await getDatabase();
    const entry = await db.getFirstAsync<any>(
        'SELECT * FROM logbook_entries WHERE id = ?',
        [id]
    );

    return entry ? parseLogbookEntry(entry) : null;
};

// Create new logbook entry
export const createLogbookEntry = async (input: CreateLogbookInput): Promise<number> => {
    const db = await getDatabase();
    const tagsJson = JSON.stringify(input.tags);

    const result = await db.runAsync(`
        INSERT INTO logbook_entries (date, content, tags)
        VALUES (?, ?, ?)
    `, [input.date, input.content, tagsJson]);

    return result.lastInsertRowId;
};

// Update logbook entry
export const updateLogbookEntry = async (id: number, input: UpdateLogbookInput): Promise<void> => {
    const db = await getDatabase();
    const tagsJson = JSON.stringify(input.tags);

    await db.runAsync(`
        UPDATE logbook_entries
        SET content = ?, tags = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
    `, [input.content, tagsJson, id]);
};

// Create or update logbook entry by date
export const upsertLogbookEntry = async (date: string, content: string, tags: LogbookTag[]): Promise<number> => {
    const existing = await getLogbookEntryByDate(date);

    if (existing) {
        await updateLogbookEntry(existing.id, { content, tags });
        return existing.id;
    } else {
        return await createLogbookEntry({ date, content, tags });
    }
};

// Delete logbook entry
export const deleteLogbookEntry = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM logbook_entries WHERE id = ?', [id]);
};

// Get entries by tag
export const getLogbookEntriesByTag = async (tag: LogbookTag): Promise<LogbookEntry[]> => {
    const db = await getDatabase();
    // Tags disimpan sebagai JSON array, jadi kita cari dengan LIKE
    const entries = await db.getAllAsync<any>(`
        SELECT * FROM logbook_entries 
        WHERE tags LIKE ?
        ORDER BY date DESC
    `, [`%"${tag}"%`]);

    return entries.map(parseLogbookEntry);
};

// Get recent entries (last N days)
export const getRecentLogbookEntries = async (days: number = 7): Promise<LogbookEntry[]> => {
    const db = await getDatabase();
    const entries = await db.getAllAsync<any>(`
        SELECT * FROM logbook_entries 
        WHERE date >= date('now', '-${days} days', 'localtime')
        ORDER BY date DESC
    `);

    return entries.map(parseLogbookEntry);
};

// Helper: Parse database row to LogbookEntry
const parseLogbookEntry = (row: any): LogbookEntry => {
    let tags: LogbookTag[] = [];

    if (row.tags) {
        try {
            tags = JSON.parse(row.tags);
        } catch (e) {
            tags = [];
        }
    }

    return {
        id: row.id,
        date: row.date,
        content: row.content,
        tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
};

// Get today's date in YYYY-MM-DD format
export const getTodayDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
