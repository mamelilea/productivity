// App constants
export const APP_NAME = 'TaskMaster';
export const APP_VERSION = '1.0.0';

// Colors
export const COLORS = {
    primary: '#6366F1',       // Indigo
    secondary: '#8B5CF6',     // Purple
    accent: '#F59E0B',        // Amber
    success: '#10B981',       // Emerald
    warning: '#F59E0B',       // Amber
    danger: '#EF4444',        // Red
    info: '#3B82F6',          // Blue

    // Backgrounds
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceVariant: '#F3F4F6',

    // Text
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textInverse: '#FFFFFF',

    // Borders
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',

    // Priority colors
    priorityLow: '#10B981',
    priorityMedium: '#F59E0B',
    priorityHigh: '#EF4444',

    // Status colors
    statusTodo: '#6B7280',
    statusProgress: '#3B82F6',
    statusDone: '#10B981',
};

// Dark mode colors
export const DARK_COLORS = {
    ...COLORS,
    background: '#111827',
    surface: '#1F2937',
    surfaceVariant: '#374151',
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    border: '#374151',
    borderStrong: '#4B5563',
};

// Priority options
export const PRIORITY_OPTIONS = [
    { value: 'LOW', label: 'Rendah', color: COLORS.priorityLow },
    { value: 'MEDIUM', label: 'Sedang', color: COLORS.priorityMedium },
    { value: 'HIGH', label: 'Tinggi', color: COLORS.priorityHigh },
];

// Status options
export const STATUS_OPTIONS = [
    { value: 'TODO', label: 'Belum Dikerjakan', color: COLORS.statusTodo },
    { value: 'PROGRESS', label: 'Sedang Dikerjakan', color: COLORS.statusProgress },
    { value: 'DONE', label: 'Selesai', color: COLORS.statusDone },
];

// Task type options
export const TASK_TYPE_OPTIONS = [
    { value: 'KULIAH', label: 'Tugas Kuliah' },
    { value: 'NON_KULIAH', label: 'Tugas Non-Kuliah' },
];

// Assignment type options
export const ASSIGNMENT_TYPE_OPTIONS = [
    { value: 'INDIVIDU', label: 'Individu' },
    { value: 'KELOMPOK', label: 'Kelompok' },
];

// Schedule type options
export const SCHEDULE_TYPE_OPTIONS = [
    { value: 'KULIAH', label: 'Jadwal Kuliah' },
    { value: 'UTS', label: 'Ujian Tengah Semester' },
    { value: 'UAS', label: 'Ujian Akhir Semester' },
    { value: 'CUSTOM', label: 'Jadwal Lainnya' },
];

// Reminder preset options
export const REMINDER_PRESETS = [
    { value: 5, label: '5 menit sebelum' },
    { value: 15, label: '15 menit sebelum' },
    { value: 30, label: '30 menit sebelum' },
    { value: 60, label: '1 jam sebelum' },
    { value: 120, label: '2 jam sebelum' },
    { value: 1440, label: '1 hari sebelum' },
    { value: 2880, label: '2 hari sebelum' },
    { value: 10080, label: '1 minggu sebelum' },
];

// Category preset colors
export const CATEGORY_COLORS = [
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#14B8A6', // Teal
];
