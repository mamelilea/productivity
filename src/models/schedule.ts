// Schedule entity types
export type ScheduleType = 'KULIAH' | 'UTS' | 'UAS' | 'CUSTOM';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type RecurrenceEndType = 'never' | 'date' | 'count';

export interface Schedule {
    id: number;
    title: string;
    type: ScheduleType;
    custom_type: string | null;
    description: string | null;
    start_time: string; // ISO datetime string
    end_time: string | null;
    day_of_week: number | null; // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
    is_recurring: boolean;
    recurrence_type: RecurrenceType;
    recurrence_interval: number;
    recurrence_days: number[] | null; // Array of day numbers [0-6]
    recurrence_end_type: RecurrenceEndType;
    recurrence_end_date: string | null;
    recurrence_end_count: number | null;
    location: string | null;
    color: string;
    created_at: string;
}

export interface ScheduleLink {
    id: number;
    schedule_id: number;
    url: string;
    label: string | null;
}

export interface CreateScheduleInput {
    title: string;
    type: ScheduleType;
    custom_type?: string;
    description?: string;
    start_time: string;
    end_time?: string;
    day_of_week?: number;
    is_recurring?: boolean;
    recurrence_type?: RecurrenceType;
    recurrence_interval?: number;
    recurrence_days?: number[];
    recurrence_end_type?: RecurrenceEndType;
    recurrence_end_date?: string;
    recurrence_end_count?: number;
    location?: string;
    color?: string;
}

export interface UpdateScheduleInput extends Partial<CreateScheduleInput> { }

export interface CreateScheduleLinkInput {
    schedule_id: number;
    url: string;
    label?: string;
}

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
