import DateTimeInput from '@/components/DateTimeInput';
import { useColorScheme } from '@/components/useColorScheme';
import { AssignmentType, Priority, TaskType } from '@/src/models';
import * as notificationService from '@/src/services/notificationService';
import * as taskService from '@/src/services/taskService';
import { useAppStore } from '@/src/store/appStore';
import {
    ASSIGNMENT_TYPE_OPTIONS,
    COLORS,
    DARK_COLORS,
    PRIORITY_OPTIONS,
    REMINDER_PRESETS,
    TASK_TYPE_OPTIONS
} from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function NewTaskScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { categories, refreshTaskData, fetchCategories } = useAppStore();
  const taskCategories = categories.filter(c => c.type === 'TASK');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('NON_KULIAH');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [isToday, setIsToday] = useState(false);
  
  // Course detail state
  const [courseName, setCourseName] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('INDIVIDU');
  const [courseNotes, setCourseNotes] = useState('');
  
  // Reminder state
  const [enableReminder, setEnableReminder] = useState(false);
  const [reminderOffset, setReminderOffset] = useState(1440); // 1 day default
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    fetchCategories();
  }, []);
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Judul tugas harus diisi');
      return;
    }
    
    if (type === 'KULIAH' && !courseName.trim()) {
      Alert.alert('Error', 'Nama mata kuliah harus diisi untuk tugas kuliah');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create task
      const taskId = await taskService.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        category_id: categoryId || undefined,
        deadline: deadlineDate ? deadlineDate.toISOString() : undefined,
        is_today: isToday,
      });
      
      // Add course detail if kuliah
      if (type === 'KULIAH') {
        await taskService.createCourseDetail({
          task_id: taskId,
          course_name: courseName.trim(),
          assignment_type: assignmentType,
          notes: courseNotes.trim() || undefined,
        });
      }
      
      // Schedule reminder if enabled and has deadline
      if (enableReminder && deadlineDate) {
        await notificationService.createTaskDeadlineReminder(
          taskId,
          title.trim(),
          deadlineDate.toISOString(),
          reminderOffset
        );
      }
      
      await refreshTaskData();
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal membuat tugas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderOptionButton = (
    label: string, 
    value: string, 
    currentValue: string, 
    onPress: () => void,
    color?: string
  ) => {
    const isActive = value === currentValue;
    return (
      <TouchableOpacity
        style={[
          styles.optionButton,
          { 
            backgroundColor: isActive ? (color || colors.primary) : colors.surfaceVariant,
            borderColor: isActive ? (color || colors.primary) : colors.border,
          }
        ]}
        onPress={onPress}
      >
        <Text style={[
          styles.optionButtonText,
          { color: isActive ? colors.textInverse : colors.textSecondary }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Judul Tugas *
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.surface, 
            color: colors.textPrimary,
            borderColor: colors.border 
          }]}
          placeholder="Masukkan judul tugas..."
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
      </View>
      
      {/* Type */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Tipe Tugas
        </Text>
        <View style={styles.optionRow}>
          {TASK_TYPE_OPTIONS.map(opt => 
            renderOptionButton(opt.label, opt.value, type, () => setType(opt.value as TaskType))
          )}
        </View>
      </View>
      
      {/* Course Detail (only for KULIAH) */}
      {type === 'KULIAH' && (
        <View style={[styles.courseSection, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            📚 Detail Tugas Kuliah
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Nama Mata Kuliah *
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.textPrimary,
                borderColor: colors.border 
              }]}
              placeholder="Contoh: Algoritma dan Pemrograman"
              placeholderTextColor={colors.textMuted}
              value={courseName}
              onChangeText={setCourseName}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Jenis Tugas
            </Text>
            <View style={styles.optionRow}>
              {ASSIGNMENT_TYPE_OPTIONS.map(opt => 
                renderOptionButton(opt.label, opt.value, assignmentType, () => setAssignmentType(opt.value as AssignmentType))
              )}
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Catatan Tambahan
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: colors.surface, 
                color: colors.textPrimary,
                borderColor: colors.border 
              }]}
              placeholder="Catatan untuk tugas ini..."
              placeholderTextColor={colors.textMuted}
              value={courseNotes}
              onChangeText={setCourseNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      )}
      
      {/* Priority */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Prioritas
        </Text>
        <View style={styles.optionRow}>
          {PRIORITY_OPTIONS.map(opt => 
            renderOptionButton(opt.label, opt.value, priority, () => setPriority(opt.value as Priority), opt.color)
          )}
        </View>
      </View>
      
      {/* Category */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Kategori
        </Text>
        <View style={styles.optionRow}>
          {renderOptionButton('Tanpa Kategori', '', categoryId?.toString() || '', () => setCategoryId(null))}
          {taskCategories.map(cat => 
            renderOptionButton(
              cat.name, 
              cat.id.toString(), 
              categoryId?.toString() || '', 
              () => setCategoryId(cat.id),
              cat.color
            )
          )}
        </View>
      </View>
      
      {/* Deadline */}
      <DateTimeInput
        label="Deadline"
        value={deadlineDate}
        onChange={setDeadlineDate}
        mode="datetime"
        placeholder="Pilih tanggal dan waktu deadline"
        minDate={new Date()}
      />
      
      {/* Reminder */}
      {deadlineDate && (
        <View style={styles.formGroup}>
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Aktifkan Pengingat
            </Text>
            <Switch
              value={enableReminder}
              onValueChange={setEnableReminder}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          
          {enableReminder && (
            <View style={styles.optionRow}>
              {REMINDER_PRESETS.slice(0, 6).map(preset => 
                renderOptionButton(
                  preset.label, 
                  preset.value.toString(), 
                  reminderOffset.toString(), 
                  () => setReminderOffset(preset.value)
                )
              )}
            </View>
          )}
        </View>
      )}
      
      {/* Is Today */}
      <View style={styles.formGroup}>
        <View style={styles.switchRow}>
          <View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Tandai untuk Hari Ini
            </Text>
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              Tampilkan di halaman "Hari Ini"
            </Text>
          </View>
          <Switch
            value={isToday}
            onValueChange={setIsToday}
            trackColor={{ false: colors.border, true: colors.warning }}
          />
        </View>
      </View>
      
      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Deskripsi
        </Text>
        <TextInput
          style={[styles.input, styles.textArea, { 
            backgroundColor: colors.surface, 
            color: colors.textPrimary,
            borderColor: colors.border 
          }]}
          placeholder="Deskripsi tambahan (opsional)..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      </View>
      
      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton, 
          { backgroundColor: colors.primary },
          isSubmitting && { opacity: 0.6 }
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Ionicons name="checkmark" size={20} color={colors.textInverse} />
        <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
          {isSubmitting ? 'Menyimpan...' : 'Simpan Tugas'}
        </Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  courseSection: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
