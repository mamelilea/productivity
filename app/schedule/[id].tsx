import { useColorScheme } from '@/components/useColorScheme';
import { LoadingSpinner } from '@/src/components';
import { Schedule, ScheduleLink } from '@/src/models';
import * as scheduleService from '@/src/services/scheduleService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS, RECURRENCE_TYPE_OPTIONS } from '@/src/utils/constants';
import {
    formatTanggalWaktu,
    formatWaktu,
    getScheduleTypeLabel,
    NAMA_HARI
} from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
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
  const { id, contextDate } = useLocalSearchParams<{ id: string; contextDate?: string }>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { fetchSchedules } = useAppStore();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [links, setLinks] = useState<ScheduleLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadSchedule = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await scheduleService.getScheduleById(parseInt(id));
      setSchedule(data);
      if (data) {
        const scheduleLinks = await scheduleService.getScheduleLinks(parseInt(id));
        setLinks(scheduleLinks);
      }
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
    if (!schedule) return;
    
    // Check if this is a recurring schedule
    const isRecurring = schedule.recurrence_type !== 'none';
    
    if (isRecurring) {
      // Show 3 options for recurring schedules
      Alert.alert(
        'Hapus Jadwal Berulang',
        `Pilih opsi hapus untuk "${schedule.title}"`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Jadwal ini saja',
            onPress: async () => {
              try {
                // Use contextDate if available (from calendar), otherwise today
                let dateStr: string;
                if (contextDate) {
                  dateStr = contextDate;
                } else {
                  const today = new Date();
                  dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                }
                await scheduleService.addExceptionDate(parseInt(id!), dateStr);
                await fetchSchedules();
                router.back();
              } catch (error) {
                Alert.alert('Error', 'Gagal menghapus jadwal');
              }
            }
          },
          {
            text: 'Jadwal ini & berikutnya',
            onPress: async () => {
              try {
                let dateStr: string;
                if (contextDate) {
                  dateStr = contextDate;
                } else {
                  const today = new Date();
                  dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                }
                await scheduleService.deleteRecurringFromDate(parseInt(id!), dateStr);
                await fetchSchedules();
                router.back();
              } catch (error) {
                Alert.alert('Error', 'Gagal menghapus jadwal');
              }
            }
          },
          {
            text: 'Semua jadwal',
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
    } else {
      // Non-recurring: simple delete confirmation
      Alert.alert(
        'Hapus Jadwal',
        `Apakah Anda yakin ingin menghapus jadwal "${schedule.title}"?`,
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
    }
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Tidak dapat membuka link ini');
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal membuka link');
    }
  };

  const getRecurrenceText = () => {
    if (!schedule) return '';
    
    if (schedule.recurrence_type === 'none') {
      return 'Tidak Berulang';
    }
    
    const option = RECURRENCE_TYPE_OPTIONS.find(o => o.value === schedule.recurrence_type);
    let text = option?.label || 'Berulang';
    
    if (schedule.recurrence_interval > 1) {
      const unitLabel = schedule.recurrence_type === 'daily' ? 'hari' 
        : schedule.recurrence_type === 'weekly' || schedule.recurrence_type === 'custom' ? 'minggu'
        : schedule.recurrence_type === 'monthly' ? 'bulan' : 'tahun';
      text = `Setiap ${schedule.recurrence_interval} ${unitLabel}`;
    }
    
    if ((schedule.recurrence_type === 'weekly' || schedule.recurrence_type === 'custom') 
        && schedule.recurrence_days && schedule.recurrence_days.length > 0) {
      const dayLabels = schedule.recurrence_days.map(d => NAMA_HARI[d]).join(', ');
      text += ` (${dayLabels})`;
    }
    
    if (schedule.recurrence_end_type === 'date' && schedule.recurrence_end_date) {
      text += ` sampai ${new Date(schedule.recurrence_end_date).toLocaleDateString('id-ID')}`;
    } else if (schedule.recurrence_end_type === 'count' && schedule.recurrence_end_count) {
      text += ` (${schedule.recurrence_end_count} kali)`;
    }
    
    return text;
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

  const displayType = schedule.type === 'CUSTOM' && schedule.custom_type 
    ? schedule.custom_type 
    : getScheduleTypeLabel(schedule.type);

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
          <Text style={styles.headerBadgeText}>{displayType}</Text>
        </View>
      </View>
      
      {/* Details */}
      <View style={[styles.detailsCard, { backgroundColor: colors.surface }]}>
        {/* Description */}
        {schedule.description && (
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Deskripsi
              </Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {schedule.description}
              </Text>
            </View>
          </View>
        )}
        
        {/* Recurrence info */}
        <View style={styles.detailRow}>
          <View style={[styles.detailIcon, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="repeat" size={20} color={colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Pengulangan
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {getRecurrenceText()}
            </Text>
          </View>
        </View>
        
        {/* Time */}
        <View style={styles.detailRow}>
          <View style={[styles.detailIcon, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="time" size={20} color={colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Waktu
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {schedule.recurrence_type !== 'none'
                ? `${formatWaktu(schedule.start_time)}${schedule.end_time ? ` - ${formatWaktu(schedule.end_time)}` : ''}`
                : formatTanggalWaktu(schedule.start_time)
              }
            </Text>
          </View>
        </View>
        
        {/* Location */}
        {schedule.location && (
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.surfaceVariant }]}>
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
        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.detailIcon, { backgroundColor: colors.surfaceVariant }]}>
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

      {/* Links Section */}
      {links.length > 0 && (
        <View style={[styles.linksCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            <Ionicons name="link" size={16} color={colors.primary} /> Link
          </Text>
          {links.map((link) => (
            <TouchableOpacity
              key={link.id}
              style={[styles.linkItem, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => openLink(link.url)}
            >
              <Ionicons name="open-outline" size={18} color={colors.primary} />
              <View style={styles.linkContent}>
                <Text style={[styles.linkLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                  {link.label || link.url}
                </Text>
                {link.label && (
                  <Text style={[styles.linkUrl, { color: colors.textMuted }]} numberOfLines={1}>
                    {link.url}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/schedule/edit/${id}`)}
        >
          <Ionicons name="create-outline" size={20} color={colors.textInverse} />
          <Text style={[styles.editButtonText, { color: colors.textInverse }]}>
            Edit Jadwal
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.danger }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
            Hapus
          </Text>
        </TouchableOpacity>
      </View>
      
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
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
  linksCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
