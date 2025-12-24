import { useColorScheme } from '@/components/useColorScheme';
import { Schedule } from '@/src/models';
import { getSchedulesForDate } from '@/src/services/scheduleService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { formatTanggal, getLocalDateString, NAMA_HARI } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    PanResponder,
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
  const isToday = getLocalDateString(new Date()) === date;
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  
  // Swipe navigation helpers
  const getAdjacentDate = (offset: number): string => {
    const d = new Date(date + 'T12:00:00'); // Use noon to avoid timezone edge cases
    d.setDate(d.getDate() + offset);
    // Format as YYYY-MM-DD using local date components
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const navigateToDate = (newDate: string) => {
    router.replace(`/calendar/${newDate}`);
  };
  
  const goToPreviousDay = () => navigateToDate(getAdjacentDate(-1));
  const goToNextDay = () => navigateToDate(getAdjacentDate(1));
  
  // Track if navigation is in progress to prevent double navigation
  const isNavigating = useRef(false);
  
  // Simple swipe gesture handler (no animation, just navigation)
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only respond to horizontal swipes with significant movement
      const isHorizontalSwipe = Math.abs(gestureState.dx) > 50 && 
                                 Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
      return isHorizontalSwipe;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (isNavigating.current) return;
      
      const swipeThreshold = 100;
      
      if (gestureState.dx > swipeThreshold) {
        // Swipe RIGHT = go to PREVIOUS day (like flipping calendar pages backward)
        isNavigating.current = true;
        goToPreviousDay();
        setTimeout(() => { isNavigating.current = false; }, 500);
      } else if (gestureState.dx < -swipeThreshold) {
        // Swipe LEFT = go to NEXT day (like flipping calendar pages forward)
        isNavigating.current = true;
        goToNextDay();
        setTimeout(() => { isNavigating.current = false; }, 500);
      }
    },
  }), [date]);
  
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
  
  // Convert time to minutes from midnight for easier comparison
  const timeToMinutes = (schedule: Schedule): { start: number; end: number } => {
    const start = parseTime(schedule.start_time);
    const end = schedule.end_time ? parseTime(schedule.end_time) : { hour: start.hour + 1, minute: start.minute };
    return {
      start: start.hour * 60 + start.minute,
      end: end.hour * 60 + end.minute
    };
  };
  
  // Check if two schedules overlap
  const schedulesOverlap = (a: Schedule, b: Schedule): boolean => {
    const timeA = timeToMinutes(a);
    const timeB = timeToMinutes(b);
    return timeA.start < timeB.end && timeB.start < timeA.end;
  };
  
  // Calculate column layout for overlapping schedules
  const getScheduleLayout = (schedules: Schedule[]): Map<number, { columnIndex: number; totalColumns: number }> => {
    const layout = new Map<number, { columnIndex: number; totalColumns: number }>();
    
    // Sort schedules by start time
    const sorted = [...schedules].sort((a, b) => {
      const timeA = timeToMinutes(a);
      const timeB = timeToMinutes(b);
      return timeA.start - timeB.start;
    });
    
    // Group overlapping schedules
    const groups: Schedule[][] = [];
    
    for (const schedule of sorted) {
      // Find a group this schedule overlaps with
      let foundGroup = false;
      for (const group of groups) {
        if (group.some(s => schedulesOverlap(s, schedule))) {
          group.push(schedule);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        groups.push([schedule]);
      }
    }
    
    // Merge overlapping groups
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (groups[i].some(a => groups[j].some(b => schedulesOverlap(a, b)))) {
          groups[i] = [...groups[i], ...groups[j]];
          groups.splice(j, 1);
          j--;
        }
      }
    }
    
    // Assign columns within each group
    for (const group of groups) {
      const columns: Schedule[][] = [];
      
      for (const schedule of group) {
        // Find first column where this schedule doesn't overlap with existing
        let placed = false;
        for (let col = 0; col < columns.length; col++) {
          const canPlace = !columns[col].some(s => schedulesOverlap(s, schedule));
          if (canPlace) {
            columns[col].push(schedule);
            layout.set(schedule.id, { columnIndex: col, totalColumns: 0 });
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([schedule]);
          layout.set(schedule.id, { columnIndex: columns.length - 1, totalColumns: 0 });
        }
      }
      
      // Update total columns for all schedules in group
      const totalCols = columns.length;
      for (const schedule of group) {
        const existing = layout.get(schedule.id);
        if (existing) {
          layout.set(schedule.id, { ...existing, totalColumns: totalCols });
        }
      }
    }
    
    return layout;
  };
  
  // Memoize layout calculation
  const scheduleLayoutMap = getScheduleLayout(daySchedules);
  
  // Calculate position and height for schedule block
  // Handles cross-day schedules (e.g., 23:00-01:00)
  const getScheduleStyle = (schedule: Schedule) => {
    const start = parseTime(schedule.start_time);
    const end = schedule.end_time ? parseTime(schedule.end_time) : { hour: start.hour + 1, minute: start.minute };
    
    // Check if this is a cross-day schedule (end time before start time)
    const isCrossDay = schedule.end_time && (end.hour < start.hour || (end.hour === start.hour && end.minute < start.minute));
    
    // Check if this schedule is a cross-midnight continuation from yesterday
    // For recurring schedules, we should NOT compare the original start_time date
    // because the schedule repeats on different days. We only consider it "from previous day"
    // if it's a cross-midnight schedule that starts the previous day and ends today.
    // 
    // The scheduleService already handles fetching cross-midnight schedules from yesterday,
    // and we can detect those by checking if:
    // 1. It's a cross-day schedule (end time < start time)
    // 2. AND the start time would be for the previous day in the context of the viewed date
    //
    // For recurring schedules shown on this date, they always start at their scheduled time.
    // The isFromPreviousDay should only be true for cross-midnight schedules from yesterday.
    
    let isFromPreviousDay = false;
    
    // Only non-recurring schedules can be "from previous day" based on their actual date
    // Recurring schedules are always considered as "for this day" when shown on a specific date
    if (schedule.recurrence_type === 'none') {
      const scheduleStartDate = new Date(schedule.start_time);
      const scheduleLocalDate = `${scheduleStartDate.getFullYear()}-${String(scheduleStartDate.getMonth() + 1).padStart(2, '0')}-${String(scheduleStartDate.getDate()).padStart(2, '0')}`;
      isFromPreviousDay = scheduleLocalDate !== date;
    }
    
    let effectiveStartHour = start.hour;
    let effectiveStartMinute = start.minute;
    let effectiveEndHour = end.hour;
    let effectiveEndMinute = end.minute;
    
    if (isFromPreviousDay) {
      // Schedule from previous day - show from 00:00 to end time
      effectiveStartHour = 0;
      effectiveStartMinute = 0;
    } else if (isCrossDay) {
      // Schedule starts today and crosses midnight - show from start to 24:00
      effectiveEndHour = 24;
      effectiveEndMinute = 0;
    }
    
    const topOffset = (effectiveStartHour * HOUR_HEIGHT) + (effectiveStartMinute / 60) * HOUR_HEIGHT;
    const duration = (effectiveEndHour - effectiveStartHour) + (effectiveEndMinute - effectiveStartMinute) / 60;
    const height = Math.max(duration * HOUR_HEIGHT, 30); // Minimum 30px height
    
    // Get column layout for side-by-side display
    const layoutInfo = scheduleLayoutMap.get(schedule.id) || { columnIndex: 0, totalColumns: 1 };
    const widthPercent = 100 / layoutInfo.totalColumns;
    const leftPercent = layoutInfo.columnIndex * widthPercent;
    
    return {
      top: topOffset,
      height,
      backgroundColor: schedule.color || colors.info,
      width: `${widthPercent - 1}%` as any, // -1% for gap between columns
      left: `${leftPercent}%` as any,
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
          <View style={styles.dayNavigation}>
            <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.dayInfo}>
              <Text style={[styles.dayName, { color: colors.textPrimary }]}>
                {NAMA_HARI[dayOfWeek]}
              </Text>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatTanggal(date + 'T00:00:00')}
              </Text>
            </View>
            <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
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
                    {(() => {
                      const deadlineDate = new Date(task.deadline);
                      return `${String(deadlineDate.getHours()).padStart(2, '0')}:${String(deadlineDate.getMinutes()).padStart(2, '0')}`;
                    })() || 'Seharian'}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Timeline - with swipe gesture handler */}
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
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
                  onPress={() => router.push(`/schedule/${schedule.id}?contextDate=${date}`)}
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
      </View>
      
      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.info }]}
        onPress={() => router.push(`/schedule/new?date=${date}`)}
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
  dayNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navButton: {
    padding: 8,
  },
  dayInfo: {
    alignItems: 'center',
    minWidth: 150,
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
