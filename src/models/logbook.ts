// Logbook/Daily Log model
// Untuk mencatat aktivitas harian dengan tag

export type LogbookTag = 'CODING' | 'MEETING' | 'RESEARCH' | 'DESIGN' | 'REVIEW' | 'LAINNYA';

export interface LogbookEntry {
    id: number;
    date: string; // Format: YYYY-MM-DD
    content: string;
    tags: LogbookTag[];
    created_at: string;
    updated_at: string;
}

export interface CreateLogbookInput {
    date: string;
    content: string;
    tags: LogbookTag[];
}

export interface UpdateLogbookInput {
    content: string;
    tags: LogbookTag[];
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
