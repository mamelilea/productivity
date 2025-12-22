import DateTimeInput from '@/components/DateTimeInput';
import { useColorScheme } from '@/components/useColorScheme';
import {
    LoadingSpinner,
    RecurrencePickerModal
} from '@/src/components';
import { RecurrenceSettings } from '@/src/components/RecurrencePickerModal';
import { CustomType, RecurrenceType, ScheduleType } from '@/src/models';
import * as customTypeService from '@/src/services/customTypeService';
import * as scheduleService from '@/src/services/scheduleService';
import { useAppStore } from '@/src/store/appStore';
import {
    CATEGORY_COLORS,
    COLORS,
    DARK_COLORS,
    RECURRENCE_TYPE_OPTIONS,
    SCHEDULE_TYPE_OPTIONS
} from '@/src/utils/constants';
import { NAMA_HARI } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function EditScheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { fetchSchedules } = useAppStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ScheduleType>('KULIAH');
  const [customType, setCustomType] = useState('');
  const [savedCustomTypes, setSavedCustomTypes] = useState<CustomType[]>([]);
  const [showNewCustomTypeInput, setShowNewCustomTypeInput] = useState(false);
  const [description, setDescription] = useState('');
  const [startTimeDate, setStartTimeDate] = useState<Date | null>(null);
  const [endTimeDate, setEndTimeDate] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  
  // Links state
  const [links, setLinks] = useState<{id?: number, url: string, label: string}[]>([]);
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
  
  useEffect(() => {
    loadSchedule();
    loadCustomTypes();
  }, [id]);
  
  const loadCustomTypes = async () => {
    const types = await customTypeService.getCustomTypes('SCHEDULE');
    setSavedCustomTypes(types);
  };
  
  const loadSchedule = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const schedule = await scheduleService.getScheduleById(parseInt(id));
      if (schedule) {
        setTitle(schedule.title);
        setType(schedule.type);
        setCustomType(schedule.custom_type || '');
        // Check if custom type is from saved list or a new one
        if (schedule.type === 'CUSTOM' && schedule.custom_type) {
          const types = await customTypeService.getCustomTypes('SCHEDULE');
          const isExistingType = types.some(t => t.name === schedule.custom_type);
          setShowNewCustomTypeInput(!isExistingType);
        }
        setDescription(schedule.description || '');
        setStartTimeDate(new Date(schedule.start_time));
        setEndTimeDate(schedule.end_time ? new Date(schedule.end_time) : null);
        setLocation(schedule.location || '');
        setSelectedColor(schedule.color);
        
        setRecurrenceType(schedule.recurrence_type || 'none');
        setRecurrenceInterval(schedule.recurrence_interval || 1);
        setRecurrenceDays(schedule.recurrence_days || []);
        setRecurrenceEndType(schedule.recurrence_end_type || 'never');
        setRecurrenceEndDate(schedule.recurrence_end_date ? new Date(schedule.recurrence_end_date) : null);
        setRecurrenceEndCount(schedule.recurrence_end_count || null);
        
        const scheduleLinks = await scheduleService.getScheduleLinks(parseInt(id));
        setLinks(scheduleLinks.map(l => ({ id: l.id, url: l.url, label: l.label || '' })));
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat jadwal');
    } finally {
      setIsLoading(false);
    }
  };
  
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
      
      await scheduleService.updateSchedule(parseInt(id!), {
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
      
      // Save new custom type for future reuse
      if (type === 'CUSTOM' && customType.trim() && showNewCustomTypeInput) {
        await customTypeService.addCustomType({
          name: customType.trim(),
          entity_type: 'SCHEDULE',
        });
      }
      
      // Handle links - add new ones
      for (const link of links) {
        if (!link.id) {
          await scheduleService.addScheduleLink({
            schedule_id: parseInt(id!),
            url: link.url,
            label: link.label || undefined,
          });
        }
      }
      
      await fetchSchedules();
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menyimpan jadwal');
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

  const removeLink = async (index: number) => {
    const link = links[index];
    if (link.id) {
      await scheduleService.deleteScheduleLink(link.id);
    }
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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
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
            {/* Standard type options (excluding CUSTOM) */}
            {SCHEDULE_TYPE_OPTIONS.filter(opt => opt.value !== 'CUSTOM').map(opt => 
              renderOptionButton(
                opt.label, 
                opt.value, 
                type === 'CUSTOM' ? '' : type, 
                () => {
                  setType(opt.value as ScheduleType);
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
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
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
              placeholder="Ketik tipe jadwal baru..."
              placeholderTextColor={colors.textMuted}
              value={customType}
              onChangeText={setCustomType}
            />
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
              {getRecurrenceLabel()}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        
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
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Text>
        </TouchableOpacity>
        
        <View style={{ height: 50 }} />

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
    </KeyboardAvoidingView>
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
