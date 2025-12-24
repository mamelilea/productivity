// Date utility functions - Bahasa Indonesia
import {
    differenceInDays,
    format,
    isPast,
    isToday,
    isTomorrow,
    isYesterday,
    parseISO,
    startOfDay
} from 'date-fns';
import { id } from 'date-fns/locale';

// Format date ke Bahasa Indonesia
export const formatTanggal = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, 'd MMMM yyyy', { locale: id });
};

export const formatTanggalPendek = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, 'd MMM yyyy', { locale: id });
};

export const formatWaktu = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, 'HH:mm', { locale: id });
};

export const formatTanggalWaktu = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, 'd MMM yyyy, HH:mm', { locale: id });
};

export const formatHari = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, 'EEEE', { locale: id });
};

// Label deadline relatif
export const getDeadlineLabel = (deadlineString: string | null): string => {
    if (!deadlineString) return 'Tanpa Deadline';

    const deadline = parseISO(deadlineString);
    const today = startOfDay(new Date());
    const deadlineDay = startOfDay(deadline);
    const daysRemaining = differenceInDays(deadlineDay, today);

    if (isToday(deadline)) {
        return 'Hari Ini';
    } else if (isTomorrow(deadline)) {
        return 'Besok';
    } else if (isYesterday(deadline)) {
        return 'Kemarin (Terlambat!)';
    } else if (daysRemaining < 0) {
        return `Terlambat ${Math.abs(daysRemaining)} hari`;
    } else if (daysRemaining <= 7) {
        return `${daysRemaining} hari lagi`;
    } else {
        return formatTanggalPendek(deadlineString);
    }
};

// Hitung sisa hari
export const hitungSisaHari = (deadlineString: string | null): number | null => {
    if (!deadlineString) return null;

    const deadline = parseISO(deadlineString);
    const today = startOfDay(new Date());
    return differenceInDays(startOfDay(deadline), today);
};

// Cek apakah deadline sudah lewat
export const isLewatDeadline = (deadlineString: string | null): boolean => {
    if (!deadlineString) return false;
    return isPast(parseISO(deadlineString));
};

// Label untuk status
export const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'TODO': return 'Belum Dikerjakan';
        case 'PROGRESS': return 'Sedang Dikerjakan';
        case 'DONE': return 'Selesai';
        default: return status;
    }
};

// Label untuk prioritas
export const getPriorityLabel = (priority: string): string => {
    switch (priority) {
        case 'LOW': return 'Rendah';
        case 'MEDIUM': return 'Sedang';
        case 'HIGH': return 'Tinggi';
        default: return priority;
    }
};

// Label untuk tipe task
export const getTypeLabel = (type: string): string => {
    switch (type) {
        case 'KULIAH': return 'Tugas Kuliah';
        case 'NON_KULIAH': return 'Tugas Non-Kuliah';
        default: return type;
    }
};

// Label untuk tipe jadwal
export const getScheduleTypeLabel = (type: string): string => {
    switch (type) {
        case 'KULIAH': return 'Jadwal Kuliah';
        case 'UTS': return 'Ujian Tengah Semester';
        case 'UAS': return 'Ujian Akhir Semester';
        case 'CUSTOM': return 'Jadwal Lainnya';
        default: return type;
    }
};

// Label untuk jenis tugas
export const getAssignmentTypeLabel = (type: string): string => {
    switch (type) {
        case 'INDIVIDU': return 'Individu';
        case 'KELOMPOK': return 'Kelompok';
        default: return type;
    }
};

// Nama hari dalam Bahasa Indonesia
export const NAMA_HARI = [
    'Minggu',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu'
];

// Nama bulan dalam Bahasa Indonesia
export const NAMA_BULAN = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember'
];

// Get date as YYYY-MM-DD string in LOCAL timezone (NOT UTC)
// This is important for timezones like Indonesia (+07:00) where UTC conversion
// would shift the date back by one day for early morning times
export const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Get current date as YYYY-MM-DD string in local timezone
export const getTodayISO = (): string => {
    return getLocalDateString(new Date());
};

// Format for date input
export const formatForInput = (date: Date): string => {
    return format(date, "yyyy-MM-dd'T'HH:mm");
};
