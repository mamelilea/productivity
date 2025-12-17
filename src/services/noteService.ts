// Note service - CRUD operations
import { getDatabase } from '../db/database';
import { CreateNoteInput, NoteWithCategory, UpdateNoteInput } from '../models';

export const getAllNotes = async (): Promise<NoteWithCategory[]> => {
  const db = await getDatabase();
  const notes = await db.getAllAsync<any>(`
    SELECT n.*, c.name as category_name, c.color as category_color
    FROM notes n
    LEFT JOIN categories c ON n.category_id = c.id
    ORDER BY n.updated_at DESC
  `);
  return notes.map(n => ({ ...n, is_private: Boolean(n.is_private) }));
};

export const getNotesByCategory = async (categoryId: number): Promise<NoteWithCategory[]> => {
  const db = await getDatabase();
  const notes = await db.getAllAsync<any>(`
    SELECT n.*, c.name as category_name, c.color as category_color
    FROM notes n
    LEFT JOIN categories c ON n.category_id = c.id
    WHERE n.category_id = ?
    ORDER BY n.updated_at DESC
  `, [categoryId]);
  return notes.map(n => ({ ...n, is_private: Boolean(n.is_private) }));
};

export const getNoteById = async (id: number): Promise<NoteWithCategory | null> => {
  const db = await getDatabase();
  const note = await db.getFirstAsync<any>(`
    SELECT n.*, c.name as category_name, c.color as category_color
    FROM notes n
    LEFT JOIN categories c ON n.category_id = c.id
    WHERE n.id = ?
  `, [id]);
  return note ? { ...note, is_private: Boolean(note.is_private) } : null;
};

export const searchNotes = async (query: string): Promise<NoteWithCategory[]> => {
  const db = await getDatabase();
  const searchTerm = `%${query}%`;
  const notes = await db.getAllAsync<any>(`
    SELECT n.*, c.name as category_name, c.color as category_color
    FROM notes n
    LEFT JOIN categories c ON n.category_id = c.id
    WHERE n.title LIKE ? OR n.content LIKE ?
    ORDER BY n.updated_at DESC
  `, [searchTerm, searchTerm]);
  return notes.map(n => ({ ...n, is_private: Boolean(n.is_private) }));
};

export const createNote = async (input: CreateNoteInput): Promise<number> => {
  const db = await getDatabase();
  const result = await db.runAsync(`
    INSERT INTO notes (title, content, category_id, is_private)
    VALUES (?, ?, ?, ?)
  `, [input.title, input.content || '', input.category_id || null, input.is_private ? 1 : 0]);

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
  if (input.is_private !== undefined) {
    updates.push('is_private = ?');
    values.push(input.is_private ? 1 : 0);
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
