// Task service - CRUD operations
import { getDatabase } from '../db/database';
import {
    CourseDetail,
    CreateCourseDetailInput,
    CreateTaskInput,
    CreateTaskLinkInput,
    TaskLink,
    TaskWithDetails,
    UpdateTaskInput
} from '../models';

// =====================
// TASK CRUD
// =====================

export const getAllTasks = async (): Promise<TaskWithDetails[]> => {
    const db = await getDatabase();
    const tasks = await db.getAllAsync<TaskWithDetails>(`
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY 
      CASE t.status 
        WHEN 'TODO' THEN 1 
        WHEN 'PROGRESS' THEN 2 
        WHEN 'DONE' THEN 3 
      END,
      t.deadline ASC NULLS LAST,
      t.priority DESC
  `);

    return tasks.map(t => ({
        ...t,
        is_today: Boolean(t.is_today)
    }));
};

export const getTodayTasks = async (): Promise<TaskWithDetails[]> => {
    const db = await getDatabase();
    const tasks = await db.getAllAsync<TaskWithDetails>(`
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.is_today = 1 AND t.status != 'DONE'
    ORDER BY 
      t.priority DESC,
      t.deadline ASC NULLS LAST
  `);

    return tasks.map(t => ({
        ...t,
        is_today: true
    }));
};

export const getOverdueTasks = async (): Promise<TaskWithDetails[]> => {
    const db = await getDatabase();
    const tasks = await db.getAllAsync<TaskWithDetails>(`
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.deadline < datetime('now', 'localtime')
      AND t.status != 'DONE'
    ORDER BY t.deadline ASC
  `);

    return tasks.map(t => ({
        ...t,
        is_today: Boolean(t.is_today)
    }));
};

export const getTasksByType = async (type: 'KULIAH' | 'NON_KULIAH'): Promise<TaskWithDetails[]> => {
    const db = await getDatabase();
    const tasks = await db.getAllAsync<TaskWithDetails>(`
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.type = ?
    ORDER BY 
      CASE t.status 
        WHEN 'TODO' THEN 1 
        WHEN 'PROGRESS' THEN 2 
        WHEN 'DONE' THEN 3 
      END,
      t.deadline ASC NULLS LAST
  `, [type]);

    return tasks.map(t => ({
        ...t,
        is_today: Boolean(t.is_today)
    }));
};

export const getTaskById = async (id: number): Promise<TaskWithDetails | null> => {
    const db = await getDatabase();
    const task = await db.getFirstAsync<TaskWithDetails>(`
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ?
  `, [id]);

    if (!task) return null;

    // Get course detail if exists
    const courseDetail = await db.getFirstAsync<CourseDetail>(
        'SELECT * FROM course_details WHERE task_id = ?',
        [id]
    );

    // Get links
    const links = await db.getAllAsync<TaskLink>(
        'SELECT * FROM task_links WHERE task_id = ?',
        [id]
    );

    return {
        ...task,
        is_today: Boolean(task.is_today),
        course_detail: courseDetail || null,
        links: links
    };
};

export const createTask = async (input: CreateTaskInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(`
    INSERT INTO tasks (title, description, category_id, type, priority, deadline, is_today)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
        input.title,
        input.description || null,
        input.category_id || null,
        input.type,
        input.priority || 'MEDIUM',
        input.deadline || null,
        input.is_today ? 1 : 0
    ]);

    return result.lastInsertRowId;
};

export const updateTask = async (id: number, input: UpdateTaskInput): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
        updates.push('title = ?');
        values.push(input.title);
    }
    if (input.description !== undefined) {
        updates.push('description = ?');
        values.push(input.description);
    }
    if (input.category_id !== undefined) {
        updates.push('category_id = ?');
        values.push(input.category_id);
    }
    if (input.type !== undefined) {
        updates.push('type = ?');
        values.push(input.type);
    }
    if (input.status !== undefined) {
        updates.push('status = ?');
        values.push(input.status);
        if (input.status === 'DONE') {
            updates.push("completed_at = datetime('now', 'localtime')");
        }
    }
    if (input.priority !== undefined) {
        updates.push('priority = ?');
        values.push(input.priority);
    }
    if (input.deadline !== undefined) {
        updates.push('deadline = ?');
        values.push(input.deadline);
    }
    if (input.is_today !== undefined) {
        updates.push('is_today = ?');
        values.push(input.is_today ? 1 : 0);
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.runAsync(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        values
    );
};

export const deleteTask = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
};

export const toggleTaskToday = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(
        'UPDATE tasks SET is_today = NOT is_today WHERE id = ?',
        [id]
    );
};

export const markTaskComplete = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(`
    UPDATE tasks 
    SET status = 'DONE', completed_at = datetime('now', 'localtime') 
    WHERE id = ?
  `, [id]);
};

// =====================
// COURSE DETAIL CRUD
// =====================

export const createCourseDetail = async (input: CreateCourseDetailInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(`
    INSERT INTO course_details (task_id, course_name, assignment_type, notes)
    VALUES (?, ?, ?, ?)
  `, [input.task_id, input.course_name, input.assignment_type, input.notes || null]);

    return result.lastInsertRowId;
};

export const updateCourseDetail = async (
    taskId: number,
    input: Partial<Omit<CreateCourseDetailInput, 'task_id'>>
): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (input.course_name !== undefined) {
        updates.push('course_name = ?');
        values.push(input.course_name);
    }
    if (input.assignment_type !== undefined) {
        updates.push('assignment_type = ?');
        values.push(input.assignment_type);
    }
    if (input.notes !== undefined) {
        updates.push('notes = ?');
        values.push(input.notes);
    }

    if (updates.length === 0) return;

    values.push(taskId);
    await db.runAsync(
        `UPDATE course_details SET ${updates.join(', ')} WHERE task_id = ?`,
        values
    );
};

// =====================
// TASK LINKS CRUD
// =====================

export const addTaskLink = async (input: CreateTaskLinkInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(`
    INSERT INTO task_links (task_id, url, label)
    VALUES (?, ?, ?)
  `, [input.task_id, input.url, input.label || null]);

    return result.lastInsertRowId;
};

export const deleteTaskLink = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM task_links WHERE id = ?', [id]);
};

export const getTaskLinks = async (taskId: number): Promise<TaskLink[]> => {
    const db = await getDatabase();
    return db.getAllAsync<TaskLink>(
        'SELECT * FROM task_links WHERE task_id = ?',
        [taskId]
    );
};
