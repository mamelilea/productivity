import { useColorScheme } from '@/components/useColorScheme';
import { LoadingSpinner } from '@/src/components';
import { Schedule } from '@/src/models';
import * as scheduleService from '@/src/services/scheduleService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import {
    formatTanggalWaktu,
    getScheduleTypeLabel,
    NAMA_HARI
} from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function ScheduleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { fetchSchedules } = useAppStore();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadSchedule = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await scheduleService.getScheduleById(parseInt(id));
      setSchedule(data);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat jadwal');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadSchedule();
  }, [id]);
  
  const handleDelete = () => {
    Alert.alert(
      'Hapus Jadwal',
      `Apakah Anda yakin ingin menghapus jadwal "${schedule?.title}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            try {
              await scheduleService.deleteSchedule(parseInt(id!));
              await fetchSchedules();
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus jadwal');
            }
          }
        }
      ]
    );
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!schedule) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Jadwal tidak ditemukan
        </Text>
      </View>
    );
  }

  const getTypeIcon = () => {
    switch (schedule.type) {
      case 'KULIAH': return '📚';
      case 'UTS': return '📝';
      case 'UAS': return '📋';
      default: return '📅';
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: schedule.color || colors.info }]}>
        <Text style={styles.typeIcon}>{getTypeIcon()}</Text>
        <Text style={styles.scheduleTitle}>{schedule.title}</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {getScheduleTypeLabel(schedule.type)}
          </Text>
        </View>
      </View>
      
      {/* Details */}
      <View style={[styles.detailsCard, { backgroundColor: colors.surface }]}>
        {/* Recurring info */}
        {schedule.is_recurring && schedule.day_of_week !== null && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="repeat" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Hari
              </Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                Setiap {NAMA_HARI[schedule.day_of_week]}
              </Text>
            </View>
          </View>
        )}
        
        {/* Time */}
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="time" size={20} color={colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Waktu
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {schedule.is_recurring 
                ? `${schedule.start_time}${schedule.end_time ? ` - ${schedule.end_time}` : ''}`
                : formatTanggalWaktu(schedule.start_time)
              }
            </Text>
          </View>
        </View>
        
        {/* Location */}
        {schedule.location && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="location" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Lokasi
              </Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {schedule.location}
              </Text>
            </View>
          </View>
        )}
        
        {/* Created date */}
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          </View>
          <View style={styles.detailContent}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Dibuat
            </Text>
            <Text style={[styles.detailValue, { color: colors.textMuted }]}>
              {formatTanggalWaktu(schedule.created_at)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Delete Button */}
      <TouchableOpacity
        style={[styles.deleteButton, { borderColor: colors.danger }]}
        onPress={handleDelete}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
        <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
          Hapus Jadwal
        </Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  scheduleTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  detailsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
