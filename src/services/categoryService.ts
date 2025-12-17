// Category service - CRUD operations
import { getDatabase } from '../db/database';
import { Category, CategoryType, CreateCategoryInput, UpdateCategoryInput } from '../models';

export const getAllCategories = async (): Promise<Category[]> => {
    const db = await getDatabase();
    return db.getAllAsync<Category>(
        'SELECT * FROM categories ORDER BY type, name'
    );
};

export const getCategoriesByType = async (type: CategoryType): Promise<Category[]> => {
    const db = await getDatabase();
    return db.getAllAsync<Category>(
        'SELECT * FROM categories WHERE type = ? ORDER BY name',
        [type]
    );
};

export const getCategoryById = async (id: number): Promise<Category | null> => {
    const db = await getDatabase();
    return db.getFirstAsync<Category>(
        'SELECT * FROM categories WHERE id = ?',
        [id]
    );
};

export const createCategory = async (input: CreateCategoryInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(`
    INSERT INTO categories (name, type, color)
    VALUES (?, ?, ?)
  `, [input.name, input.type, input.color || '#6366F1']);

    return result.lastInsertRowId;
};

export const updateCategory = async (id: number, input: UpdateCategoryInput): Promise<void> => {
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

    if (updates.length === 0) return;

    values.push(id);
    await db.runAsync(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
        values
    );
};

export const deleteCategory = async (id: number): Promise<boolean> => {
    const db = await getDatabase();

    // Check if category is being used
    const taskCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM tasks WHERE category_id = ?',
        [id]
    );
    const noteCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM notes WHERE category_id = ?',
        [id]
    );

    if ((taskCount?.count || 0) > 0 || (noteCount?.count || 0) > 0) {
        // Kategori masih digunakan, tidak bisa dihapus
        return false;
    }

    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
    return true;
};
