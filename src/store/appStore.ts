// Global app store with Zustand
import { create } from 'zustand';
import {
    Category,
    NoteWithCategory,
    Schedule,
    TaskStatus,
    TaskType,
    TaskWithDetails
} from '../models';
import * as categoryService from '../services/categoryService';
import * as noteService from '../services/noteService';
import * as scheduleService from '../services/scheduleService';
import * as taskService from '../services/taskService';

interface TaskFilter {
    type: TaskType | 'ALL';
    status: TaskStatus | 'ALL';
    categoryId: number | null;
}

interface AppState {
    // Loading states
    isLoading: boolean;
    isInitialized: boolean;

    // Task state
    tasks: TaskWithDetails[];
    todayTasks: TaskWithDetails[];
    overdueTasks: TaskWithDetails[];
    taskFilter: TaskFilter;
    selectedTask: TaskWithDetails | null;

    // Category state
    categories: Category[];

    // Note state
    notes: NoteWithCategory[];
    selectedNote: NoteWithCategory | null;

    // Schedule state
    schedules: Schedule[];
    selectedDate: string; // YYYY-MM-DD

    // Actions - Tasks
    fetchTasks: () => Promise<void>;
    fetchTodayTasks: () => Promise<void>;
    fetchOverdueTasks: () => Promise<void>;
    setTaskFilter: (filter: Partial<TaskFilter>) => void;
    selectTask: (task: TaskWithDetails | null) => void;
    refreshTaskData: () => Promise<void>;

    // Actions - Categories
    fetchCategories: () => Promise<void>;

    // Actions - Notes
    fetchNotes: () => Promise<void>;
    selectNote: (note: NoteWithCategory | null) => void;

    // Actions - Schedules
    fetchSchedules: () => Promise<void>;
    setSelectedDate: (date: string) => void;

    // Actions - Initialization
    initialize: () => Promise<void>;
}

const getToday = (): string => {
    return new Date().toISOString().split('T')[0];
};

export const useAppStore = create<AppState>((set, get) => ({
    // Initial state
    isLoading: false,
    isInitialized: false,

    tasks: [],
    todayTasks: [],
    overdueTasks: [],
    taskFilter: { type: 'ALL', status: 'ALL', categoryId: null },
    selectedTask: null,

    categories: [],

    notes: [],
    selectedNote: null,

    schedules: [],
    selectedDate: getToday(),

    // Task actions
    fetchTasks: async () => {
        set({ isLoading: true });
        try {
            const { taskFilter } = get();
            let tasks: TaskWithDetails[];

            if (taskFilter.type === 'ALL') {
                tasks = await taskService.getAllTasks();
            } else {
                tasks = await taskService.getTasksByType(taskFilter.type);
            }

            // Apply status filter
            if (taskFilter.status !== 'ALL') {
                tasks = tasks.filter(t => t.status === taskFilter.status);
            }

            // Apply category filter
            if (taskFilter.categoryId !== null) {
                tasks = tasks.filter(t => t.category_id === taskFilter.categoryId);
            }

            set({ tasks });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchTodayTasks: async () => {
        const todayTasks = await taskService.getTodayTasks();
        set({ todayTasks });
    },

    fetchOverdueTasks: async () => {
        const overdueTasks = await taskService.getOverdueTasks();
        set({ overdueTasks });
    },

    setTaskFilter: (filter) => {
        set((state) => ({
            taskFilter: { ...state.taskFilter, ...filter }
        }));
        get().fetchTasks();
    },

    selectTask: (task) => {
        set({ selectedTask: task });
    },

    refreshTaskData: async () => {
        await Promise.all([
            get().fetchTasks(),
            get().fetchTodayTasks(),
            get().fetchOverdueTasks()
        ]);
    },

    // Category actions
    fetchCategories: async () => {
        const categories = await categoryService.getAllCategories();
        set({ categories });
    },

    // Note actions
    fetchNotes: async () => {
        const notes = await noteService.getAllNotes();
        set({ notes });
    },

    selectNote: (note) => {
        set({ selectedNote: note });
    },

    // Schedule actions
    fetchSchedules: async () => {
        const schedules = await scheduleService.getAllSchedules();
        set({ schedules });
    },

    setSelectedDate: (date) => {
        set({ selectedDate: date });
    },

    // Initialize app
    initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });
        try {
            await Promise.all([
                get().fetchCategories(),
                get().refreshTaskData(),
                get().fetchNotes(),
                get().fetchSchedules()
            ]);
            set({ isInitialized: true });
        } finally {
            set({ isLoading: false });
        }
    },
}));
