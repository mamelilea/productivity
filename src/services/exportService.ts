// Export service - Export data to JSON/CSV
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getDatabase } from '../db/database';
import { getLocalDateString } from '../utils/dateUtils';

// Get document directory (fallback untuk web)
const getDocumentDirectory = (): string => {
    if (Platform.OS === 'web') {
        return '';
    }
    // Type cast untuk menghindari error karena types expo-file-system tidak lengkap di web
    return (FileSystem as any).documentDirectory || '';
};

export interface ExportData {
    exportedAt: string;
    version: string;
    data: {
        categories: any[];
        tasks: any[];
        courseDetails: any[];
        taskLinks: any[];
        notes: any[];
        schedules: any[];
    };
}

// Export all data to JSON
export const exportToJson = async (): Promise<string> => {
    const db = await getDatabase();

    const categories = await db.getAllAsync('SELECT * FROM categories');
    const tasks = await db.getAllAsync('SELECT * FROM tasks');
    const courseDetails = await db.getAllAsync('SELECT * FROM course_details');
    const taskLinks = await db.getAllAsync('SELECT * FROM task_links');
    const notes = await db.getAllAsync('SELECT * FROM notes');
    const schedules = await db.getAllAsync('SELECT * FROM schedules');

    const exportData: ExportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        data: {
            categories,
            tasks,
            courseDetails,
            taskLinks,
            notes,
            schedules,
        },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `taskmaster_backup_${formatDateForFile(new Date())}.json`;
    const filePath = `${getDocumentDirectory()}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, jsonString);

    return filePath;
};

// Export tasks to CSV
export const exportTasksToCsv = async (): Promise<string> => {
    const db = await getDatabase();

    const tasks = await db.getAllAsync<any>(`
    SELECT t.*, c.name as category_name, cd.course_name, cd.assignment_type
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN course_details cd ON t.id = cd.task_id
    ORDER BY t.deadline ASC
  `);

    // CSV Header
    const headers = [
        'ID',
        'Judul',
        'Deskripsi',
        'Kategori',
        'Tipe',
        'Status',
        'Prioritas',
        'Deadline',
        'Mata Kuliah',
        'Jenis Tugas',
        'Dibuat',
        'Selesai'
    ];

    // CSV Rows
    const rows = tasks.map(task => [
        task.id,
        escapeCsvField(task.title),
        escapeCsvField(task.description || ''),
        escapeCsvField(task.category_name || ''),
        task.type,
        getStatusLabel(task.status),
        getPriorityLabel(task.priority),
        task.deadline || '',
        escapeCsvField(task.course_name || ''),
        task.assignment_type ? (task.assignment_type === 'INDIVIDU' ? 'Individu' : 'Kelompok') : '',
        task.created_at,
        task.completed_at || ''
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const fileName = `tasks_export_${formatDateForFile(new Date())}.csv`;
    const filePath = `${getDocumentDirectory()}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, csvContent);

    return filePath;
};

// Export notes to CSV
export const exportNotesToCsv = async (): Promise<string> => {
    const db = await getDatabase();

    const notes = await db.getAllAsync<any>(`
    SELECT n.*, c.name as category_name
    FROM notes n
    LEFT JOIN categories c ON n.category_id = c.id
    ORDER BY n.updated_at DESC
  `);

    const headers = ['ID', 'Judul', 'Isi', 'Kategori', 'Dibuat', 'Diperbarui'];

    const rows = notes.map(note => [
        note.id,
        escapeCsvField(note.title),
        escapeCsvField(note.content || ''),
        escapeCsvField(note.category_name || ''),
        note.created_at,
        note.updated_at
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const fileName = `notes_export_${formatDateForFile(new Date())}.csv`;
    const filePath = `${getDocumentDirectory()}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, csvContent);

    return filePath;
};

// Share exported file
export const shareExportedFile = async (filePath: string): Promise<void> => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
        await Sharing.shareAsync(filePath);
    } else {
        throw new Error('Sharing tidak tersedia di perangkat ini');
    }
};

// Helper functions
const formatDateForFile = (date: Date): string => {
    return getLocalDateString(date).replace(/-/g, '');
};

const escapeCsvField = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'TODO': return 'Belum Dikerjakan';
        case 'PROGRESS': return 'Sedang Dikerjakan';
        case 'DONE': return 'Selesai';
        default: return status;
    }
};

const getPriorityLabel = (priority: string): string => {
    switch (priority) {
        case 'LOW': return 'Rendah';
        case 'MEDIUM': return 'Sedang';
        case 'HIGH': return 'Tinggi';
        default: return priority;
    }
};
