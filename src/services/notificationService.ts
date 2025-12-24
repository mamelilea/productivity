// Notification service - Local notifications with Expo
import * as Notifications from 'expo-notifications';
import { getDatabase } from '../db/database';
import {
    AppNotification,
    CreateNotificationInput,
    NotificationTargetType
} from '../models';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Request permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
};

// Schedule a notification
export const scheduleNotification = async (input: CreateNotificationInput): Promise<string | null> => {
    const db = await getDatabase();

    const triggerDate = new Date(input.trigger_at);

    // Don't schedule if trigger date is in the past
    if (triggerDate <= new Date()) {
        return null;
    }

    // Schedule with Expo Notifications
    const expoNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
            title: input.title,
            body: input.body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
        },
    });

    // Save to database
    await db.runAsync(`
    INSERT INTO notifications (target_type, target_id, trigger_at, offset_minutes, title, body, expo_notification_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
        input.target_type,
        input.target_id,
        input.trigger_at,
        input.offset_minutes,
        input.title,
        input.body,
        expoNotificationId
    ]);

    return expoNotificationId;
};

// Cancel a notification
export const cancelNotification = async (expoNotificationId: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(expoNotificationId);

    const db = await getDatabase();
    await db.runAsync(
        'DELETE FROM notifications WHERE expo_notification_id = ?',
        [expoNotificationId]
    );
};

// Cancel all notifications for a target
export const cancelNotificationsForTarget = async (
    targetType: NotificationTargetType,
    targetId: number
): Promise<void> => {
    const db = await getDatabase();

    const notifications = await db.getAllAsync<AppNotification>(
        'SELECT * FROM notifications WHERE target_type = ? AND target_id = ?',
        [targetType, targetId]
    );

    for (const notif of notifications) {
        if (notif.expo_notification_id) {
            await Notifications.cancelScheduledNotificationAsync(notif.expo_notification_id);
        }
    }

    await db.runAsync(
        'DELETE FROM notifications WHERE target_type = ? AND target_id = ?',
        [targetType, targetId]
    );
};

// Get all pending notifications
export const getPendingNotifications = async (): Promise<AppNotification[]> => {
    const db = await getDatabase();
    const notifications = await db.getAllAsync<AppNotification>(`
    SELECT * FROM notifications 
    WHERE is_sent = 0 AND trigger_at > datetime('now', 'localtime')
    ORDER BY trigger_at ASC
  `);

    return notifications.map(n => ({
        ...n,
        is_sent: Boolean(n.is_sent)
    }));
};

// Get notifications for a specific target
export const getNotificationsForTarget = async (
    targetType: NotificationTargetType,
    targetId: number
): Promise<AppNotification[]> => {
    const db = await getDatabase();
    const notifications = await db.getAllAsync<AppNotification>(
        'SELECT * FROM notifications WHERE target_type = ? AND target_id = ?',
        [targetType, targetId]
    );

    return notifications.map(n => ({
        ...n,
        is_sent: Boolean(n.is_sent)
    }));
};

// Create reminder for task deadline
export const createTaskDeadlineReminder = async (
    taskId: number,
    taskTitle: string,
    deadline: string,
    offsetMinutes: number
): Promise<string | null> => {
    const triggerDate = new Date(deadline);
    triggerDate.setMinutes(triggerDate.getMinutes() - offsetMinutes);

    return scheduleNotification({
        target_type: 'TASK',
        target_id: taskId,
        trigger_at: triggerDate.toISOString(),
        offset_minutes: offsetMinutes,
        title: '⏰ Pengingat Deadline',
        body: `"${taskTitle}" akan jatuh tempo dalam ${formatOffsetToText(offsetMinutes)}`,
    });
};

// Create reminder for schedule
export const createScheduleReminder = async (
    scheduleId: number,
    scheduleTitle: string,
    startTime: string,
    offsetMinutes: number
): Promise<string | null> => {
    const triggerDate = new Date(startTime);
    triggerDate.setMinutes(triggerDate.getMinutes() - offsetMinutes);

    return scheduleNotification({
        target_type: 'SCHEDULE',
        target_id: scheduleId,
        trigger_at: triggerDate.toISOString(),
        offset_minutes: offsetMinutes,
        title: '📅 Pengingat Jadwal',
        body: `"${scheduleTitle}" akan dimulai dalam ${formatOffsetToText(offsetMinutes)}`,
    });
};

// Create notification at exact task deadline time
export const createTaskDeadlineNotification = async (
    taskId: number,
    taskTitle: string,
    deadline: string
): Promise<string | null> => {
    return scheduleNotification({
        target_type: 'TASK',
        target_id: taskId,
        trigger_at: deadline,
        offset_minutes: 0,
        title: '🚨 Deadline Tugas!',
        body: `"${taskTitle}" sudah jatuh tempo sekarang!`,
    });
};

// Create notification at exact schedule start time
export const createScheduleStartNotification = async (
    scheduleId: number,
    scheduleTitle: string,
    startTime: string
): Promise<string | null> => {
    return scheduleNotification({
        target_type: 'SCHEDULE',
        target_id: scheduleId,
        trigger_at: startTime,
        offset_minutes: 0,
        title: '📅 Jadwal Dimulai!',
        body: `"${scheduleTitle}" dimulai sekarang!`,
    });
};

// Helper: Format offset to human readable text
const formatOffsetToText = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes} menit`;
    } else if (minutes < 1440) {
        const hours = Math.floor(minutes / 60);
        return `${hours} jam`;
    } else {
        const days = Math.floor(minutes / 1440);
        return `${days} hari`;
    }
};

// Cancel all scheduled notifications (for app reset)
export const cancelAllNotifications = async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const db = await getDatabase();
    await db.runAsync('DELETE FROM notifications');
};
