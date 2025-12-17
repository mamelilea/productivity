import { useColorScheme } from '@/components/useColorScheme';
import { Schedule } from '@/src/models';
import { getSchedulesForDate } from '@/src/services/scheduleService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { formatTanggal, NAMA_HARI } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const HOUR_HEIGHT = 60; // Height per hour in pixels
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarDayDetailScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { tasks } = useAppStore();
  const [daySchedules, setDaySchedules] = useState<Schedule[]>([]);
  
  // Parse date
  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();
  const isToday = new Date().toISOString().split('T')[0] === date;
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  
  // Auto-refresh when screen comes into focus (e.g., after editing/deleting)
  useFocusEffect(
    useCallback(() => {
      const loadDaySchedules = async () => {
        if (date) {
          const schedules = await getSchedulesForDate(date);
          setDaySchedules(schedules);
        }
      };
      loadDaySchedules();
    }, [date])
  );
  
  // Get tasks with deadline on this date
  const tasksOnDate = tasks.filter(t => {
    if (!t.deadline) return false;
    return t.deadline.split('T')[0] === date;
  });
  
  // Parse time from ISO string to hours/minutes (using local time)
  const parseTime = (timeStr: string): { hour: number; minute: number } => {
    if (!timeStr) return { hour: 0, minute: 0 };
    const dateObj = new Date(timeStr);
    return { 
      hour: dateObj.getHours(), 
      minute: dateObj.getMinutes() 
    };
  };
  
  // Calculate position and height for schedule block
  const getScheduleStyle = (schedule: Schedule) => {
    const start = parseTime(schedule.start_time);
    const end = schedule.end_time ? parseTime(schedule.end_time) : { hour: start.hour + 1, minute: start.minute };
    
    const topOffset = (start.hour * HOUR_HEIGHT) + (start.minute / 60) * HOUR_HEIGHT;
    const duration = (end.hour - start.hour) + (end.minute - start.minute) / 60;
    const height = Math.max(duration * HOUR_HEIGHT, 30); // Minimum 30px height
    
    return {
      top: topOffset,
      height,
      backgroundColor: schedule.color || colors.info,
    };
  };
  
  // Format time for display
  const formatTimeRange = (schedule: Schedule): string => {
    const start = parseTime(schedule.start_time);
    const startStr = `${String(start.hour).padStart(2, '0')}:${String(start.minute).padStart(2, '0')}`;
    
    if (schedule.end_time) {
      const end = parseTime(schedule.end_time);
      const endStr = `${String(end.hour).padStart(2, '0')}:${String(end.minute).padStart(2, '0')}`;
      return `${startStr} - ${endStr}`;
    }
    return startStr;
  };
  
  // Get schedule type label
  const getTypeLabel = (schedule: Schedule): string => {
    if (schedule.type === 'CUSTOM' && schedule.custom_type) {
      return schedule.custom_type;
    }
    switch (schedule.type) {
      case 'KULIAH': return 'Kuliah';
      case 'UTS': return 'UTS';
      case 'UAS': return 'UAS';
      default: return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.dayName, { color: colors.textPrimary }]}>
            {NAMA_HARI[dayOfWeek]}
          </Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {formatTanggal(date + 'T00:00:00')}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Tasks with deadline section */}
      {tasksOnDate.length > 0 && (
        <View style={[styles.deadlineSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            📋 Deadline Tugas ({tasksOnDate.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deadlineScroll}>
            {tasksOnDate.map(task => (
              <TouchableOpacity
                key={task.id}
                style={[styles.deadlineCard, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}
                onPress={() => router.push(`/task/${task.id}`)}
              >
                <View style={[styles.deadlineDot, { backgroundColor: colors.danger }]} />
                <Text style={[styles.deadlineTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {task.title}
                </Text>
                {task.deadline && (
                  <Text style={[styles.deadlineTime, { color: colors.textMuted }]}>
                    {task.deadline.split('T')[1]?.substring(0, 5) || 'Seharian'}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Timeline */}
      <ScrollView style={styles.timelineContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.timeline}>
          {/* Hour labels and lines */}
          {HOURS.map(hour => (
            <View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
              <Text style={[styles.hourLabel, { color: colors.textMuted }]}>
                {String(hour).padStart(2, '0')}.00
              </Text>
              <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
            </View>
          ))}
          
          {/* Current time indicator */}
          {isToday && (
            <View 
              style={[
                styles.currentTimeIndicator, 
                { 
                  top: (currentHour * HOUR_HEIGHT) + (currentMinute / 60) * HOUR_HEIGHT,
                }
              ]}
            >
              <View style={[styles.currentTimeDot, { backgroundColor: colors.danger }]} />
              <View style={[styles.currentTimeLine, { backgroundColor: colors.danger }]} />
            </View>
          )}
          
          {/* Schedule blocks */}
          <View style={styles.eventsContainer}>
            {daySchedules.map(schedule => {
              const scheduleStyle = getScheduleStyle(schedule);
              const isCompact = scheduleStyle.height < 45; // Compact mode for short events
              return (
                <TouchableOpacity
                  key={schedule.id}
                  style={[styles.scheduleBlock, scheduleStyle]}
                  onPress={() => router.push(`/schedule/${schedule.id}`)}
                  activeOpacity={0.8}
                >
                  {isCompact ? (
                    // Compact single-line layout for short events
                    <View style={styles.scheduleBlockCompact}>
                      <Ionicons name="checkmark-circle" size={12} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.scheduleTitleCompact} numberOfLines={1}>
                        {schedule.title}
                      </Text>
                      <Text style={styles.scheduleTimeCompact}>
                        {formatTimeRange(schedule)}
                      </Text>
                    </View>
                  ) : (
                    // Normal multi-line layout
                    <>
                      <View style={styles.scheduleBlockContent}>
                        <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.scheduleTitle} numberOfLines={1}>
                          {schedule.title}
                        </Text>
                      </View>
                      <Text style={styles.scheduleTime}>
                        {formatTimeRange(schedule)}
                      </Text>
                      {getTypeLabel(schedule) && (
                        <Text style={styles.scheduleType}>
                          {getTypeLabel(schedule)}
                        </Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.info }]}
        onPress={() => router.push('/schedule/new')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 20,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 14,
    marginTop: 2,
  },
  deadlineSection: {
    padding: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  deadlineScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
    minWidth: 150,
    maxWidth: 200,
    gap: 8,
  },
  deadlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deadlineTitle: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  deadlineTime: {
    fontSize: 11,
  },
  timelineContainer: {
    flex: 1,
  },
  timeline: {
    position: 'relative',
    marginLeft: 50,
    marginRight: 16,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    position: 'absolute',
    left: -46,
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  hourLine: {
    flex: 1,
    height: 1,
    marginTop: 0,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: -10,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  currentTimeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
  },
  eventsContainer: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 0,
  },
  scheduleBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    padding: 8,
    overflow: 'hidden',
  },
  scheduleBlockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  scheduleTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  scheduleType: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 2,
  },
  // Compact styles for short events
  scheduleBlockCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  scheduleTitleCompact: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  scheduleTimeCompact: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
