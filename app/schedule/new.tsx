import DateTimeInput from '@/components/DateTimeInput';
import { useColorScheme } from '@/components/useColorScheme';
import { ScheduleType } from '@/src/models';
import * as notificationService from '@/src/services/notificationService';
import * as scheduleService from '@/src/services/scheduleService';
import { useAppStore } from '@/src/store/appStore';
import {
    CATEGORY_COLORS,
    COLORS,
    DARK_COLORS,
    REMINDER_PRESETS,
    SCHEDULE_TYPE_OPTIONS
} from '@/src/utils/constants';
import { NAMA_HARI } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

export default function NewScheduleScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { fetchSchedules } = useAppStore();
  
  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ScheduleType>('KULIAH');
  const [startTimeDate, setStartTimeDate] = useState<Date | null>(null);
  const [endTimeDate, setEndTimeDate] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Senin
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  
  // Reminder state
  const [enableReminder, setEnableReminder] = useState(false);
  const [reminderOffset, setReminderOffset] = useState(30); // 30 minutes
  
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
      const scheduleId = await scheduleService.createSchedule({
        title: title.trim(),
        type,
        start_time: startTimeDate.toISOString(),
        end_time: endTimeDate ? endTimeDate.toISOString() : undefined,
        location: location.trim() || undefined,
        is_recurring: isRecurring,
        day_of_week: isRecurring ? dayOfWeek : undefined,
        color: selectedColor,
      });
      
      // Schedule reminder if enabled
      if (enableReminder && startTimeDate) {
        await notificationService.createScheduleReminder(
          scheduleId,
          title.trim(),
          startTimeDate.toISOString(),
          reminderOffset
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

  const renderOptionButton = (
    label: string, 
    value: string, 
    currentValue: string, 
    onPress: () => void
  ) => {
    const isActive = value === currentValue;
    return (
      <TouchableOpacity
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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
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
      </View>
      
      {/* Recurring Toggle */}
      <View style={styles.formGroup}>
        <View style={styles.switchRow}>
          <View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Jadwal Berulang
            </Text>
            <Text style={[styles.helperText, { color: colors.textMuted }]}>
              Aktifkan untuk jadwal mingguan
            </Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>
      
      {/* Day of Week (for recurring) */}
      {isRecurring && (
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
                    backgroundColor: dayOfWeek === index ? colors.primary : colors.surfaceVariant,
                  }
                ]}
                onPress={() => setDayOfWeek(index)}
              >
                <Text style={[
                  styles.dayButtonText,
                  { color: dayOfWeek === index ? colors.textInverse : colors.textSecondary }
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
          <View style={[styles.optionRow, { marginTop: 12 }]}>
            {REMINDER_PRESETS.slice(0, 4).map(preset => 
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
