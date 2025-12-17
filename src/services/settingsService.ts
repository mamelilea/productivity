// Settings service - App settings management
import { getDatabase } from '../db/database';

// Simple hash function for password (not cryptographically secure, but sufficient for local app)
const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
};

export const getSetting = async (key: string): Promise<string | null> => {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        [key]
    );
    return result?.value || null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(`
        INSERT OR REPLACE INTO app_settings (key, value)
        VALUES (?, ?)
    `, [key, value]);
};

export const deleteSetting = async (key: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM app_settings WHERE key = ?', [key]);
};

// Note password specific functions
const NOTE_PASSWORD_KEY = 'note_password_hash';

export const hasNotePassword = async (): Promise<boolean> => {
    const hash = await getSetting(NOTE_PASSWORD_KEY);
    return hash !== null && hash.length > 0;
};

export const setNotePassword = async (password: string): Promise<void> => {
    const hash = simpleHash(password);
    await setSetting(NOTE_PASSWORD_KEY, hash);
};

export const verifyNotePassword = async (input: string): Promise<boolean> => {
    const storedHash = await getSetting(NOTE_PASSWORD_KEY);
    if (!storedHash) return false;

    const inputHash = simpleHash(input);
    return inputHash === storedHash;
};

export const removeNotePassword = async (): Promise<void> => {
    await deleteSetting(NOTE_PASSWORD_KEY);
};
