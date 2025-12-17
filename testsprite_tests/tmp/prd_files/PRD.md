# TaskMaster - Product Requirements Document (PRD)

## 1. Executive Summary

**Nama Produk**: TaskMaster  
**Versi**: 1.0.0  
**Platform**: Mobile (iOS & Android) via React Native/Expo  
**Target Pengguna**: Mahasiswa Indonesia  
**Bahasa Antarmuka**: Bahasa Indonesia

TaskMaster adalah aplikasi manajemen tugas yang dirancang khusus untuk mahasiswa Indonesia. Aplikasi ini membantu mahasiswa mengorganisir tugas kuliah, catatan, dan jadwal akademik dalam satu tempat yang terintegrasi.

---

## 2. Problem Statement

Mahasiswa sering menghadapi kesulitan dalam:
- Melacak berbagai tugas dari berbagai mata kuliah dengan deadline yang berbeda
- Membedakan mana tugas yang urgent dan mana yang bisa ditunda
- Mengingat jadwal kuliah, UTS, dan UAS
- Menyimpan catatan kuliah yang terorganisir
- Mendapatkan reminder tepat waktu untuk deadline tugas

---

## 3. Goals & Objectives

### Primary Goals
1. Menyediakan sistem manajemen tugas yang komprehensif untuk aktivitas akademik
2. Membantu mahasiswa memprioritaskan pekerjaan berdasarkan urgensi dan kepentingan
3. Memberikan reminder otomatis untuk deadline tugas
4. Mengintegrasikan jadwal kuliah dalam satu aplikasi

### Success Metrics
- User dapat membuat dan mengelola tugas dengan < 3 tap
- Notifikasi dikirim tepat waktu sebelum deadline
- Data tersimpan dengan aman secara lokal menggunakan SQLite

---

## 4. Core Features

### 4.1 Task Management (Manajemen Tugas)

#### 4.1.1 Tipe Tugas
| Tipe | Deskripsi |
|------|-----------|
| **KULIAH** | Tugas yang berkaitan dengan mata kuliah, memiliki detail tambahan seperti nama mata kuliah dan tipe pengerjaan |
| **NON_KULIAH** | Tugas umum di luar konteks perkuliahan |

#### 4.1.2 Status Tugas
| Status | Deskripsi |
|--------|-----------|
| **TODO** | Tugas belum dimulai |
| **PROGRESS** | Tugas sedang dikerjakan |
| **DONE** | Tugas sudah selesai |

#### 4.1.3 Prioritas Tugas
| Prioritas | Deskripsi |
|-----------|-----------|
| **LOW** | Prioritas rendah, tidak urgent |
| **MEDIUM** | Prioritas sedang |
| **HIGH** | Prioritas tinggi, perlu dikerjakan segera |

#### 4.1.4 Fitur Detail Tugas Kuliah
- **Nama Mata Kuliah**: Nama kelas/course terkait
- **Tipe Pengerjaan**: INDIVIDU atau KELOMPOK
- **Link Lampiran**: URL referensi atau submission dengan label opsional
- **Catatan Tambahan**: Notes terkait tugas

#### 4.1.5 Atribut Tugas Lainnya
- Judul dan deskripsi tugas
- Deadline dengan format tanggal
- Kategori dengan color coding
- Toggle "Hari Ini" untuk quick filter
- Perhitungan otomatis "days remaining"

---

### 4.2 Note Management (Manajemen Catatan)

#### 4.2.1 Fitur Catatan
- **Judul**: Nama/label catatan
- **Konten**: Isi catatan dalam bentuk teks
- **Kategori**: Pengelompokan catatan dengan warna
- **Timestamp**: Created at dan updated at otomatis

#### 4.2.2 Operasi Catatan
- Create: Tambah catatan baru
- Read: Lihat daftar dan detail catatan
- Update: Edit judul, konten, atau kategori
- Delete: Hapus catatan

---

### 4.3 Schedule Management (Manajemen Jadwal)

#### 4.3.1 Tipe Jadwal
| Tipe | Deskripsi |
|------|-----------|
| **KULIAH** | Jadwal kuliah reguler |
| **UTS** | Jadwal Ujian Tengah Semester |
| **UAS** | Jadwal Ujian Akhir Semester |
| **CUSTOM** | Event kustom lainnya |

#### 4.3.2 Atribut Jadwal
- **Judul**: Nama mata kuliah atau event
- **Waktu Mulai & Selesai**: Rentang waktu jadwal
- **Hari dalam Minggu**: Untuk jadwal recurring (Senin-Minggu dalam Bahasa Indonesia)
- **Recurring**: Flag apakah jadwal berulang setiap minggu
- **Lokasi**: Ruangan atau tempat jadwal
- **Warna**: Untuk visual distinction di kalender

---

### 4.4 Category System (Sistem Kategori)

#### 4.4.1 Tipe Kategori
- **TASK**: Kategori untuk tugas
- **NOTE**: Kategori untuk catatan

#### 4.4.2 Atribut Kategori
- Nama kategori
- Warna kustom (hex color)
- Tipe (TASK/NOTE)

---

### 4.5 Notification System (Sistem Notifikasi)

#### 4.5.1 Jenis Notifikasi
- Reminder sebelum deadline tugas
- Notifikasi jadwal akan dimulai
- Reminder tugas hari ini

#### 4.5.2 Implementasi
- Push notification menggunakan Expo Notifications
- Scheduling berdasarkan deadline dan jadwal
- Permission handling untuk iOS dan Android

---

### 4.6 Export & Sharing

#### 4.6.1 Fitur Export
- Export data tugas dan jadwal
- Format file yang dapat dibagikan
- Integrasi dengan share sheet native

---

### 4.7 Home Dashboard

#### 4.7.1 Konten Dashboard
- Ringkasan tugas hari ini
- Tugas dengan deadline terdekat
- Quick actions untuk tambah tugas baru
- Statistik tugas (TODO/PROGRESS/DONE)

---

### 4.8 Settings (Pengaturan)

#### 4.8.1 Opsi Pengaturan
- Preferensi notifikasi
- Theme preferences (jika ada)
- Manajemen data
- About/Info aplikasi

---

## 5. Technical Architecture

### 5.1 Tech Stack
| Layer | Technology |
|-------|------------|
| **Framework** | React Native 0.81.5 |
| **Platform** | Expo SDK 54 |
| **Navigation** | Expo Router 6.x |
| **Database** | Expo SQLite (Local) |
| **State Management** | Zustand 5.x |
| **Date Handling** | date-fns 4.x |
| **Notifications** | Expo Notifications |
| **File System** | Expo File System + Sharing |

### 5.2 Data Models

```typescript
// Task Model
interface Task {
  id: number;
  title: string;
  description: string | null;
  category_id: number | null;
  type: 'KULIAH' | 'NON_KULIAH';
  status: 'TODO' | 'PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  deadline: string | null;
  is_today: boolean;
  created_at: string;
  completed_at: string | null;
}

// Note Model
interface Note {
  id: number;
  title: string;
  content: string;
  category_id: number | null;
  created_at: string;
  updated_at: string;
}

// Schedule Model
interface Schedule {
  id: number;
  title: string;
  type: 'KULIAH' | 'UTS' | 'UAS' | 'CUSTOM';
  start_time: string;
  end_time: string | null;
  day_of_week: number | null;
  is_recurring: boolean;
  location: string | null;
  color: string;
  created_at: string;
}

// Category Model
interface Category {
  id: number;
  name: string;
  type: 'TASK' | 'NOTE';
  color: string;
  created_at: string;
}
```

---

## 6. User Flows

### 6.1 Add New Task Flow
1. User tap tombol "+" atau "Tambah Tugas"
2. Pilih tipe tugas (Kuliah/Non-Kuliah)
3. Isi form: judul, deskripsi, prioritas, deadline
4. (Jika Kuliah) Isi detail mata kuliah
5. Pilih kategori (opsional)
6. Tap "Simpan"
7. Tugas muncul di daftar

### 6.2 Complete Task Flow
1. User lihat daftar tugas
2. Tap/swipe task untuk ubah status
3. Status berubah: TODO → PROGRESS → DONE
4. Timestamp completed_at tercatat

### 6.3 View Calendar Flow
1. User navigasi ke tab Kalender
2. Lihat jadwal mingguan/bulanan
3. Tap tanggal untuk lihat detail
4. Lihat semua event di tanggal tersebut

---

## 7. Screen Structure

```
├── Home (index.tsx)
│   └── Dashboard dengan ringkasan tugas hari ini
├── Tasks (tasks.tsx)
│   ├── Add Task (task/add.tsx)
│   └── Edit Task (task/edit.tsx)
├── Notes (notes.tsx)
│   ├── Add Note (note/add.tsx)
│   └── Edit Note (note/edit.tsx)
├── Calendar (calendar.tsx)
│   ├── Add Schedule (schedule/add.tsx)
│   └── Edit Schedule (schedule/edit.tsx)
└── Settings (settings.tsx)
```

---

## 8. Non-Functional Requirements

### 8.1 Performance
- App launch time < 2 seconds
- Smooth 60fps scrolling
- SQLite queries optimized untuk dataset besar

### 8.2 Data Persistence
- Semua data tersimpan lokal di SQLite
- No data loss saat app crash
- Support offline usage (100% offline-first)

### 8.3 Compatibility
- iOS 13+ 
- Android 8.0+
- Expo Go compatible untuk development

### 8.4 Localization
- UI dalam Bahasa Indonesia
- Nama hari dalam Bahasa Indonesia
- Format tanggal sesuai standar Indonesia

---

## 9. Future Considerations (Out of Scope v1.0)

- Cloud sync dan backup
- Multi-device synchronization  
- Collaboration/sharing tugas kelompok
- Dark mode
- Widget untuk home screen
- Export ke format lain (PDF, Excel)
- Integration dengan calendar apps (Google Calendar)
- Pomodoro timer terintegrasi

---

## 10. Testing Requirements

### 10.1 Unit Testing
- Test service layer (taskService, noteService, scheduleService)
- Test utility functions
- Test Zustand store actions

### 10.2 Integration Testing
- Database operations (CRUD)
- Navigation flows
- Notification scheduling

### 10.3 E2E Testing (Frontend)
- Tambah, edit, delete tugas
- Navigasi antar tab
- Form validation
- Status update flow

---

## Document Info

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Last Updated** | December 17, 2024 |
| **Status** | Draft |
| **Author** | Auto-generated |
