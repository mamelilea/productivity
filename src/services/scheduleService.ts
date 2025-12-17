// Schedule service - CRUD operations
import { getDatabase } from '../db/database';
import { CreateScheduleInput, Schedule, ScheduleType, UpdateScheduleInput } from '../models';

export const getAllSchedules = async (): Promise<Schedule[]> => {
    const db = await getDatabase();
    const schedules = await db.getAllAsync<Schedule>(`
    SELECT * FROM schedules
    ORDER BY start_time ASC
  `);

    return schedules.map(s => ({
        ...s,
        is_recurring: Boolean(s.is_recurring)
    }));
};

export const getSchedulesByType = async (type: ScheduleType): Promise<Schedule[]> => {
    const db = await getDatabase();
    const schedules = await db.getAllAsync<Schedule>(`
    SELECT * FROM schedules
    WHERE type = ?
    ORDER BY start_time ASC
  `, [type]);

    return schedules.map(s => ({
        ...s,
        is_recurring: Boolean(s.is_recurring)
    }));
};

export const getSchedulesByDay = async (dayOfWeek: number): Promise<Schedule[]> => {
    const db = await getDatabase();
    const schedules = await db.getAllAsync<Schedule>(`
    SELECT * FROM schedules
    WHERE day_of_week = ? AND is_recurring = 1
    ORDER BY start_time ASC
  `, [dayOfWeek]);

    return schedules.map(s => ({
        ...s,
        is_recurring: true
    }));
};

export const getSchedulesForDate = async (date: string): Promise<Schedule[]> => {
    const db = await getDatabase();
    // date format: YYYY-MM-DD
    const dayOfWeek = new Date(date).getDay();

    const schedules = await db.getAllAsync<Schedule>(`
    SELECT * FROM schedules
    WHERE 
      (is_recurring = 1 AND day_of_week = ?)
      OR (is_recurring = 0 AND date(start_time) = ?)
    ORDER BY start_time ASC
  `, [dayOfWeek, date]);

    return schedules.map(s => ({
        ...s,
        is_recurring: Boolean(s.is_recurring)
    }));
};

export const getUpcomingSchedules = async (days: number = 7): Promise<Schedule[]> => {
    const db = await getDatabase();
    const schedules = await db.getAllAsync<Schedule>(`
    SELECT * FROM schedules
    WHERE 
      (is_recurring = 0 AND start_time >= datetime('now', 'localtime') 
       AND start_time <= datetime('now', 'localtime', '+${days} days'))
      OR is_recurring = 1
    ORDER BY start_time ASC
  `);

    return schedules.map(s => ({
        ...s,
        is_recurring: Boolean(s.is_recurring)
    }));
};

export const getScheduleById = async (id: number): Promise<Schedule | null> => {
    const db = await getDatabase();
    const schedule = await db.getFirstAsync<Schedule>(
        'SELECT * FROM schedules WHERE id = ?',
        [id]
    );

    if (!schedule) return null;

    return {
        ...schedule,
        is_recurring: Boolean(schedule.is_recurring)
    };
};

export const createSchedule = async (input: CreateScheduleInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(`
    INSERT INTO schedules (title, type, start_time, end_time, day_of_week, is_recurring, location, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
        input.title,
        input.type,
        input.start_time,
        input.end_time || null,
        input.day_of_week ?? null,
        input.is_recurring ? 1 : 0,
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
