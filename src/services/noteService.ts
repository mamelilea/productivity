// Note service - CRUD operations
import { getDatabase } from '../db/database';
import { CreateNoteInput, NoteWithCategory, UpdateNoteInput } from '../models';

export const getAllNotes = async (): Promise<NoteWithCategory[]> => {
    const db = await getDatabase();
    return db.getAllAsync<NoteWithCategory>(`
    SELECT n.*, c.name as category_name, c.color as category_color
    FROM notes n
    LEFT JOIN categories c ON n.category_id = c.id
    ORDER BY n.updated_at DESC
  `);
};

export const getNotesByCategory = async (categoryId: number): Promise<NoteWithCategory[]> => {
    const db = await getDatabase();
    return db.getAllAsync<NoteWithCategory>(`
    SELECT n.*, c.name as category_name, c.color as category_color
    FROM notes n
    LEFT JOIN categories c ON n.category_id = c.id
    WHERE n.category_id = ?
    ORDER BY n.updated_at DESC
  `, [categoryId]);
};

export const getNoteById = async (id: number): Promise<NoteWithCategory | null> => {
    const db = await getDatabase();
    return db.getFirstAsync<NoteWithCategory>(`
    SELECT n.*, c.name as category_name, c.color as category_color
    FROM notes n
    LEFT JOIN categories c ON n.category_id = c.id
    WHERE n.id = ?
  `, [id]);
};

export const searchNotes = async (query: string): Promise<NoteWithCategory[]> => {
    const db = await getDatabase();
    const searchTerm = `%${query}%`;
    return db.getAllAsync<NoteWithCategory>(`
    SELECT n.*, c.name as category_name, c.color as category_color
    FROM notes n
    LEFT JOIN categories c ON n.category_id = c.id
    WHERE n.title LIKE ? OR n.content LIKE ?
    ORDER BY n.updated_at DESC
  `, [searchTerm, searchTerm]);
};

export const createNote = async (input: CreateNoteInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(`
    INSERT INTO notes (title, content, category_id)
    VALUES (?, ?, ?)
  `, [input.title, input.content || '', input.category_id || null]);

    return result.lastInsertRowId;
};

export const updateNote = async (id: number, input: UpdateNoteInput): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = ["updated_at = datetime('now', 'localtime')"];
    const values: any[] = [];

    if (input.title !== undefined) {
        updates.push('title = ?');
        values.push(input.title);
    }
    if (input.content !== undefined) {
        updates.push('content = ?');
        values.push(input.content);
    }
    if (input.category_id !== undefined) {
        updates.push('category_id = ?');
        values.push(input.category_id);
    }

    values.push(id);
    await db.runAsync(
        `UPDATE notes SET ${updates.join(', ')} WHERE id = ?`,
        values
    );
};

export const deleteNote = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
};
