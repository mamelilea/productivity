// Logbook/Daily Log model
// Untuk mencatat aktivitas harian dengan kategori

export type LogbookTag = 'CODING' | 'MEETING' | 'RESEARCH' | 'DESIGN' | 'REVIEW' | 'LAINNYA';

// Logbook Category
export interface LogbookCategory {
    id: number;
    name: string;
    color: string;
    icon: string;
    created_at: string;
}

export interface CreateLogbookCategoryInput {
    name: string;
    color?: string;
    icon?: string;
}

export interface UpdateLogbookCategoryInput {
    name?: string;
    color?: string;
    icon?: string;
}

// Logbook Entry
export interface LogbookEntry {
    id: number;
    category_id: number | null;
    date: string; // Format: YYYY-MM-DD
    content: string;
    tags: LogbookTag[];
    created_at: string;
    updated_at: string;
}

export interface LogbookEntryWithCategory extends LogbookEntry {
    category_name?: string;
    category_color?: string;
    category_icon?: string;
}

export interface CreateLogbookInput {
    category_id: number;
    date: string;
    content: string;
    tags?: LogbookTag[];
}

export interface UpdateLogbookInput {
    content?: string;
    tags?: LogbookTag[];
    date?: string;
}

// Tag labels dalam Bahasa Indonesia
export const TAG_LABELS: Record<LogbookTag, string> = {
    CODING: 'Coding',
    MEETING: 'Meeting',
    RESEARCH: 'Riset',
    DESIGN: 'Desain',
    REVIEW: 'Review',
    LAINNYA: 'Lainnya',
};

// Tag colors
export const TAG_COLORS: Record<LogbookTag, string> = {
    CODING: '#6366F1', // Indigo
    MEETING: '#EC4899', // Pink
    RESEARCH: '#8B5CF6', // Purple
    DESIGN: '#F59E0B', // Amber
    REVIEW: '#10B981', // Emerald
    LAINNYA: '#6B7280', // Gray
};

// Category icons available
export const LOGBOOK_ICONS = [
    '📝', '💻', '📚', '🎓', '💼', '🔬', '🎨', '📊', '🏋️', '🎮', '🎵', '✏️'
];
