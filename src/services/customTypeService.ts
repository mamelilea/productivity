// Custom Type service - CRUD operations for reusable custom types
import { getDatabase } from '../db/database';
import { CreateCustomTypeInput, CustomType, CustomTypeEntity } from '../models';

// Get all custom types for an entity type
export const getCustomTypes = async (entityType: CustomTypeEntity): Promise<CustomType[]> => {
    const db = await getDatabase();
    return db.getAllAsync<CustomType>(
        'SELECT * FROM custom_types WHERE entity_type = ? ORDER BY name',
        [entityType]
    );
};

// Get all custom types
export const getAllCustomTypes = async (): Promise<CustomType[]> => {
    const db = await getDatabase();
    return db.getAllAsync<CustomType>('SELECT * FROM custom_types ORDER BY entity_type, name');
};

// Check if custom type exists
export const customTypeExists = async (name: string, entityType: CustomTypeEntity): Promise<boolean> => {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM custom_types WHERE LOWER(name) = LOWER(?) AND entity_type = ?',
        [name.trim(), entityType]
    );
    return (result?.count || 0) > 0;
};

// Add a new custom type (if it doesn't already exist)
export const addCustomType = async (input: CreateCustomTypeInput): Promise<number | null> => {
    const db = await getDatabase();
    const trimmedName = input.name.trim();

    if (!trimmedName) return null;

    // Check if already exists (case-insensitive)
    const exists = await customTypeExists(trimmedName, input.entity_type);
    if (exists) return null;

    const result = await db.runAsync(
        'INSERT INTO custom_types (name, entity_type) VALUES (?, ?)',
        [trimmedName, input.entity_type]
    );

    return result.lastInsertRowId;
};

// Delete a custom type
export const deleteCustomType = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM custom_types WHERE id = ?', [id]);
};

// Migrate existing custom types from tasks and schedules
export const migrateExistingCustomTypes = async (): Promise<void> => {
    const db = await getDatabase();

    // Get unique custom types from tasks
    const taskCustomTypes = await db.getAllAsync<{ custom_type: string }>(
        "SELECT DISTINCT custom_type FROM tasks WHERE type = 'CUSTOM' AND custom_type IS NOT NULL AND custom_type != ''"
    );

    // Get unique custom types from schedules
    const scheduleCustomTypes = await db.getAllAsync<{ custom_type: string }>(
        "SELECT DISTINCT custom_type FROM schedules WHERE type = 'CUSTOM' AND custom_type IS NOT NULL AND custom_type != ''"
    );

    // Insert task custom types
    for (const item of taskCustomTypes) {
        await addCustomType({ name: item.custom_type, entity_type: 'TASK' });
    }

    // Insert schedule custom types
    for (const item of scheduleCustomTypes) {
        await addCustomType({ name: item.custom_type, entity_type: 'SCHEDULE' });
    }
};
