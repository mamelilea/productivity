// Logbook Service - CRUD operations untuk daily log dengan kategori
import { getDatabase } from '../db/database';
import {
    CreateLogbookCategoryInput,
    CreateLogbookInput,
    LogbookCategory,
    LogbookEntry,
    LogbookEntryWithCategory,
    LogbookTag,
    UpdateLogbookCategoryInput,
    UpdateLogbookInput
} from '../models';

// ==================== CATEGORY FUNCTIONS ====================

// Get all logbook categories
export const getAllCategories = async (): Promise<LogbookCategory[]> => {
    const db = await getDatabase();
    return db.getAllAsync<LogbookCategory>(`
        SELECT * FROM logbook_categories 
        ORDER BY created_at DESC
    `);
};

// Get category by ID
export const getCategoryById = async (id: number): Promise<LogbookCategory | null> => {
    const db = await getDatabase();
    return db.getFirstAsync<LogbookCategory>(
        'SELECT * FROM logbook_categories WHERE id = ?',
        [id]
    );
};

// Create category
export const createCategory = async (input: CreateLogbookCategoryInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(`
        INSERT INTO logbook_categories (name, color, icon)
        VALUES (?, ?, ?)
    `, [input.name, input.color || '#6366F1', input.icon || '📝']);
    return result.lastInsertRowId;
};

// Update category
export const updateCategory = async (id: number, input: UpdateLogbookCategoryInput): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
    }
    if (input.color !== undefined) {
        updates.push('color = ?');
        values.push(input.color);
    }
    if (input.icon !== undefined) {
        updates.push('icon = ?');
        values.push(input.icon);
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.runAsync(
        `UPDATE logbook_categories SET ${updates.join(', ')} WHERE id = ?`,
        values
    );
};

// Delete category
export const deleteCategory = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM logbook_categories WHERE id = ?', [id]);
};

// Get entry count for category
export const getCategoryEntryCount = async (categoryId: number): Promise<number> => {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM logbook_entries WHERE category_id = ?',
        [categoryId]
    );
    return result?.count || 0;
};

// ==================== ENTRY FUNCTIONS ====================

// Get all logbook entries
export const getAllLogbookEntries = async (): Promise<LogbookEntryWithCategory[]> => {
    const db = await getDatabase();
    const entries = await db.getAllAsync<any>(`
        SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM logbook_entries e
        LEFT JOIN logbook_categories c ON e.category_id = c.id
        ORDER BY e.date DESC, e.created_at DESC
    `);
    return entries.map(parseLogbookEntry);
};

// Get entries by category
export const getEntriesByCategory = async (categoryId: number): Promise<LogbookEntry[]> => {
    const db = await getDatabase();
    const entries = await db.getAllAsync<any>(`
        SELECT * FROM logbook_entries 
        WHERE category_id = ?
        ORDER BY date DESC, created_at DESC
    `, [categoryId]);
    return entries.map(parseLogbookEntry);
};

// Get logbook entries for a specific month
export const getLogbookEntriesByMonth = async (year: number, month: number): Promise<LogbookEntryWithCategory[]> => {
    const db = await getDatabase();
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    const entries = await db.getAllAsync<any>(`
        SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM logbook_entries e
        LEFT JOIN logbook_categories c ON e.category_id = c.id
        WHERE e.date BETWEEN ? AND ?
        ORDER BY e.date DESC, e.created_at DESC
    `, [startDate, endDate]);

    return entries.map(parseLogbookEntry);
};

// Get logbook entry by date and category
export const getLogbookEntryByDateAndCategory = async (date: string, categoryId: number): Promise<LogbookEntry | null> => {
    const db = await getDatabase();
    const entry = await db.getFirstAsync<any>(
        'SELECT * FROM logbook_entries WHERE date = ? AND category_id = ?',
        [date, categoryId]
    );
    return entry ? parseLogbookEntry(entry) : null;
};

// Get logbook entry by ID
export const getLogbookEntryById = async (id: number): Promise<LogbookEntryWithCategory | null> => {
    const db = await getDatabase();
    const entry = await db.getFirstAsync<any>(`
        SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM logbook_entries e
        LEFT JOIN logbook_categories c ON e.category_id = c.id
        WHERE e.id = ?
    `, [id]);
    return entry ? parseLogbookEntry(entry) : null;
};

// Create new logbook entry
export const createLogbookEntry = async (input: CreateLogbookInput): Promise<number> => {
    const db = await getDatabase();
    const tagsJson = JSON.stringify(input.tags || []);

    const result = await db.runAsync(`
        INSERT INTO logbook_entries (category_id, date, content, tags)
        VALUES (?, ?, ?, ?)
    `, [input.category_id, input.date, input.content, tagsJson]);

    return result.lastInsertRowId;
};

// Update logbook entry
export const updateLogbookEntry = async (id: number, input: UpdateLogbookInput): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = ["updated_at = datetime('now', 'localtime')"];
    const values: any[] = [];

    if (input.content !== undefined) {
        updates.push('content = ?');
        values.push(input.content);
    }
    if (input.tags !== undefined) {
        updates.push('tags = ?');
        values.push(JSON.stringify(input.tags));
    }
    if (input.date !== undefined) {
        updates.push('date = ?');
        values.push(input.date);
    }

    values.push(id);
    await db.runAsync(
        `UPDATE logbook_entries SET ${updates.join(', ')} WHERE id = ?`,
        values
    );
};

// Create or update logbook entry by date and category
export const upsertLogbookEntry = async (
    categoryId: number,
    date: string,
    content: string,
    tags: LogbookTag[]
): Promise<number> => {
    const existing = await getLogbookEntryByDateAndCategory(date, categoryId);

    if (existing) {
        await updateLogbookEntry(existing.id, { content, tags });
        return existing.id;
    } else {
        return await createLogbookEntry({ category_id: categoryId, date, content, tags });
    }
};

// Delete logbook entry
export const deleteLogbookEntry = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM logbook_entries WHERE id = ?', [id]);
};

// Get recent entries (last N days)
export const getRecentLogbookEntries = async (days: number = 7): Promise<LogbookEntryWithCategory[]> => {
    const db = await getDatabase();
    const entries = await db.getAllAsync<any>(`
        SELECT e.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM logbook_entries e
        LEFT JOIN logbook_categories c ON e.category_id = c.id
        WHERE e.date >= date('now', '-${days} days', 'localtime')
        ORDER BY e.date DESC, e.created_at DESC
    `);
    return entries.map(parseLogbookEntry);
};

// Helper: Parse database row to LogbookEntry
const parseLogbookEntry = (row: any): LogbookEntryWithCategory => {
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
        category_id: row.category_id,
        date: row.date,
        content: row.content,
        tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
        category_name: row.category_name,
        category_color: row.category_color,
        category_icon: row.category_icon,
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

// Format date for display
export const formatDateForDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = dateStr.split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateOnly === todayStr) return 'Hari Ini';
    if (dateOnly === yesterdayStr) return 'Kemarin';

    const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    };
    return date.toLocaleDateString('id-ID', options);
};
