// Schedule entity types
export type ScheduleType = 'KULIAH' | 'UTS' | 'UAS' | 'CUSTOM';

export interface Schedule {
    id: number;
    title: string;
    type: ScheduleType;
    start_time: string; // ISO datetime string
    end_time: string | null;
    day_of_week: number | null; // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
    is_recurring: boolean;
    location: string | null;
    color: string;
    created_at: string;
}

export interface CreateScheduleInput {
    title: string;
    type: ScheduleType;
    start_time: string;
    end_time?: string;
    day_of_week?: number;
    is_recurring?: boolean;
    location?: string;
    color?: string;
}

export interface UpdateScheduleInput extends Partial<CreateScheduleInput> { }

// Helper untuk nama hari dalam Bahasa Indonesia
export const HARI_INDONESIA = [
    'Minggu',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu'
];

export const getHariLabel = (dayOfWeek: number): string => {
    return HARI_INDONESIA[dayOfWeek] || '';
};
