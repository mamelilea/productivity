// Schedule service - CRUD operations
import { getDatabase } from '../db/database';
import {
    CreateScheduleInput,
    CreateScheduleLinkInput,
    Schedule,
    ScheduleLink,
    ScheduleType,
    UpdateScheduleInput
} from '../models';

// Helper to parse recurrence_days from DB (stored as JSON string)
const parseRecurrenceDays = (days: string | null): number[] | null => {
    if (!days) return null;
    try {
        return JSON.parse(days);
    } catch {
        return null;
    }
};

// Helper to serialize recurrence_days for DB
const serializeRecurrenceDays = (days: number[] | null | undefined): string | null => {
    if (!days || days.length === 0) return null;
    return JSON.stringify(days);
};

// Helper to parse exception_dates from DB (stored as JSON string)
const parseExceptionDates = (dates: string | null): string[] | null => {
    if (!dates) return null;
    try {
        return JSON.parse(dates);
    } catch {
        return null;
    }
};

// Helper to serialize exception_dates for DB
const serializeExceptionDates = (dates: string[] | null | undefined): string | null => {
    if (!dates || dates.length === 0) return null;
    return JSON.stringify(dates);
};

// Transform raw DB row to Schedule object
const transformSchedule = (s: any): Schedule => ({
    ...s,
    is_recurring: Boolean(s.is_recurring),
    recurrence_days: parseRecurrenceDays(s.recurrence_days),
    recurrence_type: s.recurrence_type || 'none',
    recurrence_interval: s.recurrence_interval || 1,
    recurrence_end_type: s.recurrence_end_type || 'never',
    exception_dates: parseExceptionDates(s.exception_dates),
});

export const getAllSchedules = async (): Promise<Schedule[]> => {
    const db = await getDatabase();
    const schedules = await db.getAllAsync<any>(`
    SELECT * FROM schedules
    ORDER BY start_time ASC
  `);

    return schedules.map(transformSchedule);
};

export const getSchedulesByType = async (type: ScheduleType): Promise<Schedule[]> => {
    const db = await getDatabase();
    const schedules = await db.getAllAsync<any>(`
    SELECT * FROM schedules
    WHERE type = ?
    ORDER BY start_time ASC
  `, [type]);

    return schedules.map(transformSchedule);
};

export const getSchedulesByDay = async (dayOfWeek: number): Promise<Schedule[]> => {
    const db = await getDatabase();
    const schedules = await db.getAllAsync<any>(`
    SELECT * FROM schedules
    WHERE day_of_week = ? AND is_recurring = 1
    ORDER BY start_time ASC
  `, [dayOfWeek]);

    return schedules.map(transformSchedule);
};

// Check if a schedule should occur on a given date
const shouldOccurOnDate = (schedule: Schedule, targetDate: Date): boolean => {
    const startDate = new Date(schedule.start_time);
    const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    // Format target date as YYYY-MM-DD for exception check
    const targetDateStr = `${targetDateOnly.getFullYear()}-${String(targetDateOnly.getMonth() + 1).padStart(2, '0')}-${String(targetDateOnly.getDate()).padStart(2, '0')}`;

    // Check if this date is excluded
    if (schedule.exception_dates && schedule.exception_dates.includes(targetDateStr)) {
        return false;
    }

    // Check end conditions
    if (schedule.recurrence_end_type === 'date' && schedule.recurrence_end_date) {
        const endDate = new Date(schedule.recurrence_end_date);
        if (targetDateOnly > endDate) return false;
    }

    // Can't occur before start date
    if (targetDateOnly < startDateOnly) return false;

    const dayOfWeek = targetDate.getDay();
    const interval = schedule.recurrence_interval || 1;

    switch (schedule.recurrence_type) {
        case 'none':
            // Non-recurring: only on exact start date
            return targetDateOnly.getTime() === startDateOnly.getTime();

        case 'daily':
            const daysDiff = Math.floor((targetDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
            return daysDiff % interval === 0;

        case 'weekly':
            // Check if it's been the right number of weeks
            const weeksDiff = Math.floor((targetDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24 * 7));
            const isRightWeek = weeksDiff % interval === 0;

            // Check if it's on one of the selected days
            const recurrenceDays = schedule.recurrence_days || [startDate.getDay()];
            const isRightDay = recurrenceDays.includes(dayOfWeek);

            return isRightWeek && isRightDay;

        case 'monthly':
            const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
                (targetDate.getMonth() - startDate.getMonth());
            if (monthsDiff % interval !== 0) return false;
            return targetDate.getDate() === startDate.getDate();

        case 'yearly':
            const yearsDiff = targetDate.getFullYear() - startDate.getFullYear();
            if (yearsDiff % interval !== 0) return false;
            return targetDate.getMonth() === startDate.getMonth() &&
                targetDate.getDate() === startDate.getDate();

        case 'custom':
            // Custom uses weekly logic with recurrence_days
            const customWeeksDiff = Math.floor((targetDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24 * 7));
            const isCustomRightWeek = customWeeksDiff % interval === 0;
            const customRecurrenceDays = schedule.recurrence_days || [];
            return isCustomRightWeek && customRecurrenceDays.includes(dayOfWeek);

        default:
            return false;
    }
};

export const getSchedulesForDate = async (date: string): Promise<Schedule[]> => {
    const db = await getDatabase();
    const targetDate = new Date(date);

    // Get all schedules
    const schedules = await db.getAllAsync<any>(`
    SELECT * FROM schedules
    ORDER BY start_time ASC
  `);

    const transformed = schedules.map(transformSchedule);

    // Filter schedules that should occur on this date
    const schedulesForDate = transformed.filter(s => shouldOccurOnDate(s, targetDate));

    // Also check for schedules from previous day that cross midnight into this day
    const previousDate = new Date(targetDate);
    previousDate.setDate(previousDate.getDate() - 1);

    const previousDaySchedules = transformed.filter(s => {
        if (!shouldOccurOnDate(s, previousDate)) return false;
        if (!s.end_time) return false;

        // Check if end time is less than start time (crosses midnight)
        const startDate = new Date(s.start_time);
        const endDate = new Date(s.end_time);
        const startHour = startDate.getHours();
        const endHour = endDate.getHours();

        // If end hour < start hour, it crosses midnight
        return endHour < startHour;
    });

    // Combine and deduplicate by ID
    const allSchedules = [...schedulesForDate];
    for (const ps of previousDaySchedules) {
        if (!allSchedules.some(s => s.id === ps.id)) {
            allSchedules.push(ps);
        }
    }

    return allSchedules;
};

export const getUpcomingSchedules = async (days: number = 7): Promise<Schedule[]> => {
    const db = await getDatabase();
    const schedules = await db.getAllAsync<any>(`
    SELECT * FROM schedules
    ORDER BY start_time ASC
  `);

    const transformed = schedules.map(transformSchedule);
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // For non-recurring, check if in range. For recurring, always include.
    return transformed.filter(s => {
        if (s.recurrence_type !== 'none') return true;
        const startTime = new Date(s.start_time);
        return startTime >= today && startTime <= endDate;
    });
};

export const getScheduleById = async (id: number): Promise<Schedule | null> => {
    const db = await getDatabase();
    const schedule = await db.getFirstAsync<any>(
        'SELECT * FROM schedules WHERE id = ?',
        [id]
    );

    if (!schedule) return null;
    return transformSchedule(schedule);
};

export const createSchedule = async (input: CreateScheduleInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(`
    INSERT INTO schedules (
      title, type, custom_type, description, start_time, end_time, 
      day_of_week, is_recurring, recurrence_type, recurrence_interval, 
      recurrence_days, recurrence_end_type, recurrence_end_date, 
      recurrence_end_count, location, color
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
        input.title,
        input.type,
        input.custom_type || null,
        input.description || '',
        input.start_time,
        input.end_time || null,
        input.day_of_week ?? null,
        input.is_recurring ? 1 : 0,
        input.recurrence_type || 'none',
        input.recurrence_interval || 1,
        serializeRecurrenceDays(input.recurrence_days),
        input.recurrence_end_type || 'never',
        input.recurrence_end_date || null,
        input.recurrence_end_count || null,
        input.location || null,
        input.color || '#6366F1'
    ]);

    return result.lastInsertRowId;
};

export const updateSchedule = async (id: number, input: UpdateScheduleInput): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
        updates.push('title = ?');
        values.push(input.title);
    }
    if (input.type !== undefined) {
        updates.push('type = ?');
        values.push(input.type);
    }
    if (input.custom_type !== undefined) {
        updates.push('custom_type = ?');
        values.push(input.custom_type);
    }
    if (input.description !== undefined) {
        updates.push('description = ?');
        values.push(input.description);
    }
    if (input.start_time !== undefined) {
        updates.push('start_time = ?');
        values.push(input.start_time);
    }
    if (input.end_time !== undefined) {
        updates.push('end_time = ?');
        values.push(input.end_time);
    }
    if (input.day_of_week !== undefined) {
        updates.push('day_of_week = ?');
        values.push(input.day_of_week);
    }
    if (input.is_recurring !== undefined) {
        updates.push('is_recurring = ?');
        values.push(input.is_recurring ? 1 : 0);
    }
    if (input.recurrence_type !== undefined) {
        updates.push('recurrence_type = ?');
        values.push(input.recurrence_type);
    }
    if (input.recurrence_interval !== undefined) {
        updates.push('recurrence_interval = ?');
        values.push(input.recurrence_interval);
    }
    if (input.recurrence_days !== undefined) {
        updates.push('recurrence_days = ?');
        values.push(serializeRecurrenceDays(input.recurrence_days));
    }
    if (input.recurrence_end_type !== undefined) {
        updates.push('recurrence_end_type = ?');
        values.push(input.recurrence_end_type);
    }
    if (input.recurrence_end_date !== undefined) {
        updates.push('recurrence_end_date = ?');
        values.push(input.recurrence_end_date);
    }
    if (input.recurrence_end_count !== undefined) {
        updates.push('recurrence_end_count = ?');
        values.push(input.recurrence_end_count);
    }
    if (input.location !== undefined) {
        updates.push('location = ?');
        values.push(input.location);
    }
    if (input.color !== undefined) {
        updates.push('color = ?');
        values.push(input.color);
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.runAsync(
        `UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`,
        values
    );
};

export const deleteSchedule = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM schedules WHERE id = ?', [id]);
};

// Add exception date (delete only this occurrence)
export const addExceptionDate = async (id: number, date: string): Promise<void> => {
    const db = await getDatabase();
    const schedule = await getScheduleById(id);
    if (!schedule) return;

    const currentExceptions = schedule.exception_dates || [];
    if (!currentExceptions.includes(date)) {
        currentExceptions.push(date);
    }

    await db.runAsync(
        'UPDATE schedules SET exception_dates = ? WHERE id = ?',
        [serializeExceptionDates(currentExceptions), id]
    );
};

// Delete this and future occurrences (set recurrence_end_date to day before)
export const deleteRecurringFromDate = async (id: number, date: string): Promise<void> => {
    const db = await getDatabase();

    // Calculate the day before the given date
    const targetDate = new Date(date + 'T12:00:00');
    targetDate.setDate(targetDate.getDate() - 1);
    const endDate = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    await db.runAsync(
        'UPDATE schedules SET recurrence_end_type = ?, recurrence_end_date = ? WHERE id = ?',
        ['date', endDate, id]
    );
};

// Schedule Links CRUD
export const getScheduleLinks = async (scheduleId: number): Promise<ScheduleLink[]> => {
    const db = await getDatabase();
    return db.getAllAsync<ScheduleLink>(
        'SELECT * FROM schedule_links WHERE schedule_id = ?',
        [scheduleId]
    );
};

export const addScheduleLink = async (input: CreateScheduleLinkInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(
        'INSERT INTO schedule_links (schedule_id, url, label) VALUES (?, ?, ?)',
        [input.schedule_id, input.url, input.label || null]
    );
    return result.lastInsertRowId;
};

export const deleteScheduleLink = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM schedule_links WHERE id = ?', [id]);
};
