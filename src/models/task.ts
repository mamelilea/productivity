// Task entity types
export type TaskType = 'KULIAH' | 'NON_KULIAH' | 'CUSTOM';
export type TaskStatus = 'TODO' | 'PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type AssignmentType = 'INDIVIDU' | 'KELOMPOK';

export interface Task {
    id: number;
    title: string;
    description: string | null;
    category_id: number | null;
    type: TaskType;
    custom_type: string | null;
    status: TaskStatus;
    priority: Priority;
    deadline: string | null; // ISO date string
    is_today: boolean;
    created_at: string;
    completed_at: string | null;
}

export interface CourseDetail {
    id: number;
    task_id: number;
    course_name: string;
    assignment_type: AssignmentType;
    notes: string | null;
}

export interface TaskLink {
    id: number;
    task_id: number;
    url: string;
    label: string | null;
}

// Extended task dengan relasi
export interface TaskWithDetails extends Task {
    category_name?: string;
    category_color?: string;
    course_detail?: CourseDetail | null;
    links?: TaskLink[];
    days_remaining?: number | null; // Computed field
}

// Input types untuk create/update
export interface CreateTaskInput {
    title: string;
    description?: string;
    category_id?: number;
    type: TaskType;
    custom_type?: string;
    priority?: Priority;
    deadline?: string;
    is_today?: boolean;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
    status?: TaskStatus;
    completed_at?: string;
}

export interface CreateCourseDetailInput {
    task_id: number;
    course_name: string;
    assignment_type: AssignmentType;
    notes?: string;
}

export interface CreateTaskLinkInput {
    task_id: number;
    url: string;
    label?: string;
}
