import DateTimeInput from '@/components/DateTimeInput';
import { useColorScheme } from '@/components/useColorScheme';
import { CustomReminderInput, SimpleMarkdownInput } from '@/src/components';
import { AssignmentType, CustomType, Priority, TaskType } from '@/src/models';
import * as customTypeService from '@/src/services/customTypeService';
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
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Keyboard,
    Platform,
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
  const scrollViewRef = useRef<ScrollView>(null);
  
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };
  
  const { categories, refreshTaskData, fetchCategories } = useAppStore();
  const taskCategories = categories.filter(c => c.type === 'TASK');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TaskType>('NON_KULIAH');
  const [customType, setCustomType] = useState('');
  const [savedCustomTypes, setSavedCustomTypes] = useState<CustomType[]>([]);
  const [showNewCustomTypeInput, setShowNewCustomTypeInput] = useState(false);
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [isToday, setIsToday] = useState(false);
  
  // Course detail state
  const [courseName, setCourseName] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('INDIVIDU');
  const [courseNotes, setCourseNotes] = useState('');
  
  // Links state
  const [links, setLinks] = useState<{url: string, label: string}[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  
  // Reminder state
  const [enableReminder, setEnableReminder] = useState(false);
  const [reminderOffset, setReminderOffset] = useState(1440); // 1 day default
  const [useCustomReminder, setUseCustomReminder] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  useEffect(() => {
    fetchCategories();
    loadSavedCustomTypes();
  }, []);
  
  const loadSavedCustomTypes = async () => {
    const customTypes = await customTypeService.getCustomTypes('TASK');
    setSavedCustomTypes(customTypes);
  };
  
  // Keyboard listener untuk Android
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
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
        custom_type: type === 'CUSTOM' ? customType.trim() : undefined,
        priority,
        category_id: categoryId || undefined,
        deadline: deadlineDate ? deadlineDate.toISOString() : undefined,
        is_today: isToday,
      });
      
      // Save new custom type for future reuse
      if (type === 'CUSTOM' && customType.trim() && showNewCustomTypeInput) {
        await customTypeService.addCustomType({
          name: customType.trim(),
          entity_type: 'TASK',
        });
      }
      
      // Add course detail if kuliah
      if (type === 'KULIAH') {
        await taskService.createCourseDetail({
          task_id: taskId,
          course_name: courseName.trim(),
          assignment_type: assignmentType,
          notes: courseNotes.trim() || undefined,
        });
      }
      
      // Add links
      for (const link of links) {
        await taskService.addTaskLink({
          task_id: taskId,
          url: link.url,
          label: link.label || undefined,
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
        // Also schedule notification at exact deadline time
        await notificationService.createTaskDeadlineNotification(
          taskId,
          title.trim(),
          deadlineDate.toISOString()
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

  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    setLinks([...links, { url: newLinkUrl.trim(), label: newLinkLabel.trim() }]);
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
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
        key={value}
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
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 50 : 50 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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
            {/* Standard type options (KULIAH and NON_KULIAH only) */}
            {TASK_TYPE_OPTIONS.filter(opt => opt.value !== 'CUSTOM').map(opt => 
              renderOptionButton(
                opt.label, 
                opt.value, 
                type === 'CUSTOM' ? '' : type, 
                () => {
                  setType(opt.value as TaskType);
                  setCustomType('');
                  setShowNewCustomTypeInput(false);
                }
              )
            )}
            
            {/* Saved custom types as primary chips */}
            {savedCustomTypes.map(ct => {
              const isActive = type === 'CUSTOM' && customType === ct.name && !showNewCustomTypeInput;
              return (
                <TouchableOpacity
                  key={ct.id}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: isActive ? colors.secondary : colors.surfaceVariant,
                      borderColor: isActive ? colors.secondary : colors.border,
                    }
                  ]}
                  onPress={() => {
                    setType('CUSTOM');
                    setCustomType(ct.name);
                    setShowNewCustomTypeInput(false);
                  }}
                >
                  <Text style={[
                    styles.optionButtonText,
                    { color: isActive ? colors.textInverse : colors.textSecondary }
                  ]}>
                    {ct.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            
            {/* "Tipe Lainnya" button for adding new custom type */}
            <TouchableOpacity
              style={[
                styles.optionButton,
                { 
                  backgroundColor: (type === 'CUSTOM' && showNewCustomTypeInput) ? colors.primary : colors.surfaceVariant,
                  borderColor: (type === 'CUSTOM' && showNewCustomTypeInput) ? colors.primary : colors.border,
                }
              ]}
              onPress={() => {
                setType('CUSTOM');
                setCustomType('');
                setShowNewCustomTypeInput(true);
              }}
            >
              <Ionicons 
                name="add" 
                size={14} 
                color={(type === 'CUSTOM' && showNewCustomTypeInput) ? colors.textInverse : colors.textSecondary} 
              />
              <Text style={[
                styles.optionButtonText,
                { color: (type === 'CUSTOM' && showNewCustomTypeInput) ? colors.textInverse : colors.textSecondary }
              ]}>
                Tipe Lainnya
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Text input for new custom type (show only when adding new) */}
          {type === 'CUSTOM' && showNewCustomTypeInput && (
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.textPrimary,
                borderColor: colors.border,
                marginTop: 12,
              }]}
              placeholder="Ketik tipe tugas baru..."
              placeholderTextColor={colors.textMuted}
              value={customType}
              onChangeText={setCustomType}
            />
          )}
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
              <>
                <View style={styles.optionRow}>
                  {REMINDER_PRESETS.slice(0, 4).map(preset => 
                    renderOptionButton(
                      preset.label, 
                      preset.value.toString(), 
                      useCustomReminder ? '' : reminderOffset.toString(), 
                      () => {
                        setReminderOffset(preset.value);
                        setUseCustomReminder(false);
                      }
                    )
                  )}
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      { 
                        backgroundColor: useCustomReminder ? colors.primary : colors.surfaceVariant,
                        borderColor: useCustomReminder ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setUseCustomReminder(true)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      { color: useCustomReminder ? colors.textInverse : colors.textSecondary }
                    ]}>
                      Kustom
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {useCustomReminder && (
                  <CustomReminderInput
                    value={reminderOffset}
                    onChange={setReminderOffset}
                    enabled={useCustomReminder}
                  />
                )}
              </>
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
          <SimpleMarkdownInput
            value={description}
            onChangeText={setDescription}
            placeholder="Deskripsi tugas (gunakan - untuk list, **text** untuk bold)"
          />
        </View>

        {/* Links */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Link Pendukung
          </Text>
          
          {links.map((link, index) => (
            <View key={index} style={[styles.linkItem, { backgroundColor: colors.surfaceVariant }]}>
              <View style={styles.linkContent}>
                <Text style={[styles.linkLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                  {link.label || link.url}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeLink(index)}>
                <Ionicons name="close-circle" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          
          <View style={styles.addLinkForm}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.textPrimary,
                borderColor: colors.border 
              }]}
              placeholder="URL (contoh: https://...)"
              placeholderTextColor={colors.textMuted}
              value={newLinkUrl}
              onChangeText={setNewLinkUrl}
              autoCapitalize="none"
              keyboardType="url"
              onFocus={scrollToBottom}
            />
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.textPrimary,
                borderColor: colors.border,
                marginTop: 8,
              }]}
              placeholder="Label (opsional)"
              placeholderTextColor={colors.textMuted}
              value={newLinkLabel}
              onChangeText={setNewLinkLabel}
              onFocus={scrollToBottom}
            />
            <TouchableOpacity
              style={[styles.addLinkButton, { backgroundColor: colors.primary }]}
              onPress={addLink}
            >
              <Ionicons name="add" size={20} color={colors.textInverse} />
              <Text style={[styles.addLinkButtonText, { color: colors.textInverse }]}>
                Tambah Link
              </Text>
            </TouchableOpacity>
          </View>
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
        
        <View style={{ height: 50 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  linkContent: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  addLinkForm: {
    marginTop: 8,
  },
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  addLinkButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
