// Notification entity types
export type NotificationTargetType = 'TASK' | 'SCHEDULE';

export interface AppNotification {
    id: number;
    target_type: NotificationTargetType;
    target_id: number;
    trigger_at: string; // ISO datetime string
    offset_minutes: number;
    is_sent: boolean;
    title: string;
    body: string;
    expo_notification_id: string | null;
}

export interface CreateNotificationInput {
    target_type: NotificationTargetType;
    target_id: number;
    trigger_at: string;
    offset_minutes: number;
    title: string;
    body: string;
}

// Preset offset dalam menit
export const REMINDER_PRESETS = [
    { label: '5 menit sebelum', value: 5 },
    { label: '15 menit sebelum', value: 15 },
    { label: '30 menit sebelum', value: 30 },
    { label: '1 jam sebelum', value: 60 },
    { label: '2 jam sebelum', value: 120 },
    { label: '1 hari sebelum', value: 1440 },
    { label: '2 hari sebelum', value: 2880 },
    { label: '1 minggu sebelum', value: 10080 },
];
