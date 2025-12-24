import DateTimeInput from '@/components/DateTimeInput';
import { useColorScheme } from '@/components/useColorScheme';
import { CustomReminderInput, RecurrencePickerModal } from '@/src/components';
import { RecurrenceSettings } from '@/src/components/RecurrencePickerModal';
import { CustomType, RecurrenceType, ScheduleType } from '@/src/models';
import * as customTypeService from '@/src/services/customTypeService';
import * as notificationService from '@/src/services/notificationService';
import * as scheduleService from '@/src/services/scheduleService';
import { useAppStore } from '@/src/store/appStore';
import {
    CATEGORY_COLORS,
    COLORS,
    DARK_COLORS,
    RECURRENCE_TYPE_OPTIONS,
    REMINDER_PRESETS,
    SCHEDULE_TYPE_OPTIONS
} from '@/src/utils/constants';
import { NAMA_HARI } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function NewScheduleScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { fetchSchedules } = useAppStore();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Keyboard listener untuk mengatasi scroll bug
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
  
  // Load saved custom types
  useEffect(() => {
    const loadCustomTypes = async () => {
      const types = await customTypeService.getCustomTypes('SCHEDULE');
      setSavedCustomTypes(types);
    };
    loadCustomTypes();
  }, []);
  
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };
  
  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ScheduleType>('KULIAH');
  const [customType, setCustomType] = useState('');
  const [savedCustomTypes, setSavedCustomTypes] = useState<CustomType[]>([]);
  const [showNewCustomTypeInput, setShowNewCustomTypeInput] = useState(false);
  const [description, setDescription] = useState('');
  // Initialize startTimeDate based on passed date parameter or today
  const getDefaultStartTime = (): Date | null => {
    if (date) {
      // From calendar detail - set to the selected date at current time
      const defaultDate = new Date(date + 'T00:00:00');
      const now = new Date();
      // Round to next hour
      defaultDate.setHours(now.getHours() + 1, 0, 0, 0);
      return defaultDate;
    }
    // From home or no date - default to today at next hour
    const today = new Date();
    today.setHours(today.getHours() + 1, 0, 0, 0);
    return today;
  };
  const [startTimeDate, setStartTimeDate] = useState<Date | null>(getDefaultStartTime());
  const [endTimeDate, setEndTimeDate] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  
  // Links state
  const [links, setLinks] = useState<{url: string, label: string}[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  
  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date' | 'count'>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [recurrenceEndCount, setRecurrenceEndCount] = useState<number | null>(null);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  
  // Reminder state
  const [enableReminder, setEnableReminder] = useState(false);
  const [reminderOffset, setReminderOffset] = useState(30); // 30 minutes
  const [useCustomReminder, setUseCustomReminder] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Judul jadwal harus diisi');
      return;
    }
    
    if (!startTimeDate) {
      Alert.alert('Error', 'Waktu mulai harus diisi');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const isRecurring = recurrenceType !== 'none';
      const dayOfWeek = isRecurring && recurrenceType === 'weekly' && recurrenceDays.length > 0
        ? recurrenceDays[0]
        : startTimeDate.getDay();
      
      const scheduleId = await scheduleService.createSchedule({
        title: title.trim(),
        type,
        custom_type: type === 'CUSTOM' ? customType.trim() : undefined,
        description: description.trim() || undefined,
        start_time: startTimeDate.toISOString(),
        end_time: endTimeDate ? endTimeDate.toISOString() : undefined,
        location: location.trim() || undefined,
        is_recurring: isRecurring,
        day_of_week: dayOfWeek,
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceInterval,
        recurrence_days: recurrenceDays.length > 0 ? recurrenceDays : undefined,
        recurrence_end_type: recurrenceEndType,
        recurrence_end_date: recurrenceEndDate?.toISOString() || undefined,
        recurrence_end_count: recurrenceEndCount || undefined,
        color: selectedColor,
      });
      
      // Add links
      for (const link of links) {
        await scheduleService.addScheduleLink({
          schedule_id: scheduleId,
          url: link.url,
          label: link.label || undefined,
        });
      }
      
      // Save new custom type for future reuse
      if (type === 'CUSTOM' && customType.trim() && showNewCustomTypeInput) {
        await customTypeService.addCustomType({
          name: customType.trim(),
          entity_type: 'SCHEDULE',
        });
      }
      
      // Schedule reminder if enabled
      if (enableReminder && startTimeDate) {
        await notificationService.createScheduleReminder(
          scheduleId,
          title.trim(),
          startTimeDate.toISOString(),
          reminderOffset
        );
        // Also schedule notification at exact start time
        await notificationService.createScheduleStartNotification(
          scheduleId,
          title.trim(),
          startTimeDate.toISOString()
        );
      }
      
      await fetchSchedules();
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal membuat jadwal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecurrenceSave = (settings: RecurrenceSettings) => {
    setRecurrenceType(settings.recurrenceType);
    setRecurrenceInterval(settings.interval);
    setRecurrenceDays(settings.selectedDays);
    setRecurrenceEndType(settings.endType);
    setRecurrenceEndDate(settings.endDate);
    setRecurrenceEndCount(settings.endCount);
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

  const getRecurrenceLabel = () => {
    if (recurrenceType === 'none') return 'Tidak Berulang';
    const option = RECURRENCE_TYPE_OPTIONS.find(o => o.value === recurrenceType);
    if (recurrenceType === 'custom' || recurrenceType === 'weekly') {
      if (recurrenceDays.length > 0) {
        const dayLabels = recurrenceDays.map(d => NAMA_HARI[d].substring(0, 3)).join(', ');
        return `Setiap ${recurrenceInterval > 1 ? recurrenceInterval + ' ' : ''}minggu (${dayLabels})`;
      }
    }
    if (recurrenceInterval > 1) {
      const unitLabel = recurrenceType === 'daily' ? 'hari' 
        : recurrenceType === 'weekly' ? 'minggu'
        : recurrenceType === 'monthly' ? 'bulan' : 'tahun';
      return `Setiap ${recurrenceInterval} ${unitLabel}`;
    }
    return option?.label || 'Berulang';
  };

  const renderOptionButton = (
    label: string, 
    value: string, 
    currentValue: string, 
    onPress: () => void
  ) => {
    const isActive = value === currentValue;
    return (
      <TouchableOpacity
        key={value}
        style={[
          styles.optionButton,
          { 
            backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
            borderColor: isActive ? colors.primary : colors.border,
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

  const isRecurring = recurrenceType !== 'none';

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
          Judul Jadwal *
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.surface, 
            color: colors.textPrimary,
            borderColor: colors.border 
          }]}
          placeholder="Contoh: Algoritma dan Pemrograman"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
      </View>
      
      {/* Type */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Tipe Jadwal
        </Text>
        <View style={styles.optionRow}>
          {SCHEDULE_TYPE_OPTIONS.map(opt => 
            renderOptionButton(opt.label, opt.value, type, () => setType(opt.value as ScheduleType))
          )}
        </View>
        
        {/* Custom Type Input */}
        {type === 'CUSTOM' && (
          <View style={{ marginTop: 12 }}>
            {/* Saved Custom Types as chips */}
            {savedCustomTypes.length > 0 && (
              <View style={styles.optionRow}>
                {savedCustomTypes.map(ct => (
                  <TouchableOpacity
                    key={ct.id}
                    style={[
                      styles.optionButton,
                      { 
                        backgroundColor: customType === ct.name && !showNewCustomTypeInput 
                          ? colors.secondary 
                          : colors.surfaceVariant,
                        borderColor: customType === ct.name && !showNewCustomTypeInput 
                          ? colors.secondary 
                          : colors.border,
                      }
                    ]}
                    onPress={() => {
                      setCustomType(ct.name);
                      setShowNewCustomTypeInput(false);
                    }}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      { color: customType === ct.name && !showNewCustomTypeInput 
                        ? colors.textInverse 
                        : colors.textSecondary }
                    ]}>
                      {ct.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {/* Add new button */}
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: showNewCustomTypeInput ? colors.accent : colors.surfaceVariant,
                      borderColor: showNewCustomTypeInput ? colors.accent : colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }
                  ]}
                  onPress={() => {
                    setShowNewCustomTypeInput(true);
                    setCustomType('');
                  }}
                >
                  <Ionicons 
                    name="add" 
                    size={14} 
                    color={showNewCustomTypeInput ? colors.textInverse : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.optionButtonText,
                    { color: showNewCustomTypeInput ? colors.textInverse : colors.textSecondary }
                  ]}>
                    Baru
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Text input for new custom type */}
            {(savedCustomTypes.length === 0 || showNewCustomTypeInput) && (
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  marginTop: savedCustomTypes.length > 0 ? 12 : 0,
                }]}
                placeholder="Ketik tipe jadwal baru..."
                placeholderTextColor={colors.textMuted}
                value={customType}
                onChangeText={setCustomType}
              />
            )}
          </View>
        )}
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
          placeholder="Tambahkan deskripsi jadwal..."
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
      
      {/* Recurrence Type */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Pengulangan
        </Text>
        <View style={styles.optionRow}>
          {RECURRENCE_TYPE_OPTIONS.slice(0, 4).map(opt => 
            renderOptionButton(
              opt.label, 
              opt.value, 
              recurrenceType, 
              () => {
                setRecurrenceType(opt.value as RecurrenceType);
                if (opt.value !== 'none') {
                  setRecurrenceInterval(1);
                }
              }
            )
          )}
        </View>
        <TouchableOpacity
          style={[styles.customRecurrenceButton, { 
            backgroundColor: colors.surfaceVariant,
            borderColor: colors.border,
          }]}
          onPress={() => setShowRecurrenceModal(true)}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.customRecurrenceText, { color: colors.textSecondary }]}>
            {recurrenceType === 'custom' || recurrenceDays.length > 0
              ? getRecurrenceLabel()
              : 'Pengulangan Khusus...'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      
      {/* Day of Week (for weekly without custom days) */}
      {isRecurring && recurrenceType === 'weekly' && recurrenceDays.length === 0 && (
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Hari
          </Text>
          <View style={styles.dayRow}>
            {NAMA_HARI.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  { 
                    backgroundColor: recurrenceDays.includes(index) || (recurrenceDays.length === 0 && startTimeDate?.getDay() === index)
                      ? colors.primary 
                      : colors.surfaceVariant,
                  }
                ]}
                onPress={() => {
                  if (recurrenceDays.includes(index)) {
                    setRecurrenceDays(recurrenceDays.filter(d => d !== index));
                  } else {
                    setRecurrenceDays([...recurrenceDays, index].sort());
                  }
                }}
              >
                <Text style={[
                  styles.dayButtonText,
                  { color: recurrenceDays.includes(index) 
                    ? colors.textInverse 
                    : colors.textSecondary }
                ]}>
                  {day.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      {/* Start Time */}
      <DateTimeInput
        label="Waktu Mulai"
        value={startTimeDate}
        onChange={setStartTimeDate}
        mode={isRecurring ? "time" : "datetime"}
        placeholder="Pilih waktu mulai"
        required
      />
      
      {/* End Time */}
      <DateTimeInput
        label="Waktu Selesai"
        value={endTimeDate}
        onChange={setEndTimeDate}
        mode={isRecurring ? "time" : "datetime"}
        placeholder="Pilih waktu selesai (opsional)"
      />
      
      {/* Location */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Lokasi
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.surface, 
            color: colors.textPrimary,
            borderColor: colors.border 
          }]}
          placeholder="Contoh: Ruang IF-101"
          placeholderTextColor={colors.textMuted}
          value={location}
          onChangeText={setLocation}
        />
      </View>

      {/* Links */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Link
        </Text>
        
        {/* Existing Links */}
        {links.map((link, index) => (
          <View key={index} style={[styles.linkItem, { backgroundColor: colors.surfaceVariant }]}>
            <View style={styles.linkContent}>
              <Text style={[styles.linkLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                {link.label || link.url}
              </Text>
              <Text style={[styles.linkUrl, { color: colors.textMuted }]} numberOfLines={1}>
                {link.url}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeLink(index)}>
              <Ionicons name="close-circle" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
        
        {/* Add Link Form */}
        <View style={styles.addLinkForm}>
          <TextInput
            style={[styles.input, styles.linkInput, { 
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
            style={[styles.input, styles.linkInput, { 
              backgroundColor: colors.surface, 
              color: colors.textPrimary,
              borderColor: colors.border 
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
      
      {/* Color */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Warna
        </Text>
        <View style={styles.colorRow}>
          {CATEGORY_COLORS.map((color, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                selectedColor === color && styles.colorButtonSelected
              ]}
              onPress={() => setSelectedColor(color)}
            >
              {selectedColor === color && (
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Reminder */}
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
            <View style={[styles.optionRow, { marginTop: 12 }]}>
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
      
      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton, 
          { backgroundColor: colors.info },
          isSubmitting && { opacity: 0.6 }
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Ionicons name="checkmark" size={20} color={colors.textInverse} />
        <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
          {isSubmitting ? 'Menyimpan...' : 'Simpan Jadwal'}
        </Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />

      {/* Recurrence Modal */}
      <RecurrencePickerModal
        visible={showRecurrenceModal}
        onClose={() => setShowRecurrenceModal(false)}
        onSave={handleRecurrenceSave}
        initialSettings={{
          recurrenceType,
          interval: recurrenceInterval,
          selectedDays: recurrenceDays,
          endType: recurrenceEndType,
          endDate: recurrenceEndDate,
          endCount: recurrenceEndCount,
        }}
      />
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
  customRecurrenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 10,
  },
  customRecurrenceText: {
    flex: 1,
    fontSize: 14,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  linkUrl: {
    fontSize: 12,
    marginTop: 2,
  },
  addLinkForm: {
    gap: 8,
  },
  linkInput: {
    marginBottom: 0,
  },
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
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
