import { useColorScheme } from '@/components/useColorScheme';
import { Schedule } from '@/src/models';
import { getSchedulesForDate } from '@/src/services/scheduleService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import {
    formatTanggal,
    formatWaktu,
    NAMA_BULAN,
    NAMA_HARI
} from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function CalendarScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { tasks, schedules, selectedDate, setSelectedDate, fetchSchedules } = useAppStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [daySchedules, setDaySchedules] = useState<Schedule[]>([]);
  
  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchSchedules();
    }, [])
  );
  
  useFocusEffect(
    useCallback(() => {
      const loadDaySchedules = async () => {
        const schedules = await getSchedulesForDate(selectedDate);
        setDaySchedules(schedules);
      };
      loadDaySchedules();
    }, [selectedDate])
  );
  
  // Get tasks with deadline on selected date
  const tasksOnDate = tasks.filter(t => {
    if (!t.deadline) return false;
    return t.deadline.split('T')[0] === selectedDate;
  });
  
  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days: (number | null)[] = [];
    
    // Add empty slots for days before first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };
  
  const getDateString = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-${String(day).padStart(2, '0')}`;
  };
  
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };
  
  const isSelected = (day: number) => {
    return getDateString(day) === selectedDate;
  };
  
  const hasDeadline = (day: number) => {
    const dateStr = getDateString(day);
    return tasks.some(t => t.deadline?.split('T')[0] === dateStr);
  };
  
  // Helper to check if a schedule should occur on a specific date (full recurrence logic)
  const shouldOccurOnDate = (schedule: Schedule, targetDate: Date): boolean => {
    const startDate = new Date(schedule.start_time);
    const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    // Check end conditions
    if (schedule.recurrence_end_type === 'date' && schedule.recurrence_end_date) {
      const endDate = new Date(schedule.recurrence_end_date);
      if (targetDateOnly > endDate) return false;
    }

    // Can't occur before start date
    if (targetDateOnly < startDateOnly) return false;

    const dayOfWeek = targetDate.getDay();
    const interval = schedule.recurrence_interval || 1;
    const recurrenceType = schedule.recurrence_type || 'none';

    switch (recurrenceType) {
      case 'none':
        // Non-recurring: only on exact start date
        return targetDateOnly.getTime() === startDateOnly.getTime();

      case 'daily':
        const daysDiff = Math.floor((targetDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff % interval === 0;

      case 'weekly':
      case 'custom':
        // Check if it's been the right number of weeks
        const weeksDiff = Math.floor((targetDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24 * 7));
        const isRightWeek = weeksDiff % interval === 0;
        // Check if it's on one of the selected days
        const recurrenceDays = schedule.recurrence_days || [startDate.getDay()];
        const isRightDay = recurrenceDays.includes(dayOfWeek);
        return isRightWeek && isRightDay;

      case 'monthly':
        const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
          (targetDate.getMonth() - startDate.getMonth());
        if (monthsDiff % interval !== 0) return false;
        return targetDate.getDate() === startDate.getDate();

      case 'yearly':
        const yearsDiff = targetDate.getFullYear() - startDate.getFullYear();
        if (yearsDiff % interval !== 0) return false;
        return targetDate.getMonth() === startDate.getMonth() &&
          targetDate.getDate() === startDate.getDate();

      default:
        return false;
    }
  };
  
  const hasSchedule = (day: number): boolean => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return schedules.some(s => shouldOccurOnDate(s, date));
  };
  
  // Get count of schedules on a specific day (for multiple indicator dots)
  const getScheduleCount = (day: number): number => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return schedules.filter(s => shouldOccurOnDate(s, date)).length;
  };
  
  const navigateMonth = (direction: number) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };
  
  const days = getDaysInMonth(currentMonth);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Month Navigator */}
      <View style={[styles.monthNav, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
          {NAMA_BULAN[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      
      {/* Day Headers */}
      <View style={[styles.dayHeaders, { backgroundColor: colors.surface }]}>
        {NAMA_HARI.map((day, index) => (
          <View key={index} style={styles.dayHeaderCell}>
            <Text style={[
              styles.dayHeaderText, 
              { color: index === 0 ? colors.danger : colors.textMuted }
            ]}>
              {day.substring(0, 3)}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Calendar Grid */}
      <View style={[styles.calendarGrid, { backgroundColor: colors.surface }]}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={styles.dayCell}
            onPress={() => {
              if (day) {
                const dateStr = getDateString(day);
                setSelectedDate(dateStr);
                router.push(`/calendar/${dateStr}`);
              }
            }}
            disabled={!day}
          >
            {day && (
              <>
                <View style={[
                  styles.dayCellInner,
                  isSelected(day) ? { backgroundColor: colors.primary } : null,
                  isToday(day) && !isSelected(day) ? { borderColor: colors.primary, borderWidth: 2 } : null
                ]}>
                  <Text style={[
                    styles.dayText,
                    { color: isSelected(day) ? colors.textInverse : colors.textPrimary },
                    index % 7 === 0 && !isSelected(day) && { color: colors.danger }
                  ]}>
                    {day}
                  </Text>
                </View>
                
                {/* Indicators */}
                <View style={styles.indicators}>
                  {hasDeadline(day) && (
                    <View style={[styles.indicator, { backgroundColor: colors.danger }]} />
                  )}
                  {(() => {
                    const count = getScheduleCount(day);
                    if (count === 0) return null;
                    // Show up to 3 dots
                    const dotsToShow = Math.min(count, 3);
                    return Array.from({ length: dotsToShow }, (_, i) => (
                      <View 
                        key={i} 
                        style={[
                          styles.indicator, 
                          { backgroundColor: colors.info }
                        ]} 
                      />
                    ));
                  })()}
                </View>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Selected Date Events */}
      <ScrollView style={styles.eventsContainer}>
        <Text style={[styles.selectedDateTitle, { color: colors.textPrimary }]}>
          {formatTanggal(selectedDate + 'T00:00:00')}
        </Text>
        
        {/* Tasks on this date */}
        {tasksOnDate.length > 0 && (
          <View style={styles.eventSection}>
            <Text style={[styles.eventSectionTitle, { color: colors.textSecondary }]}>
              📋 Deadline Tugas
            </Text>
            {tasksOnDate.map(task => (
              <TouchableOpacity
                key={task.id}
                style={[styles.eventItem, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => router.push(`/task/${task.id}`)}
              >
                <View style={[styles.eventDot, { backgroundColor: colors.danger }]} />
                <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {task.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Schedules on this date */}
        {daySchedules.length > 0 && (
          <View style={styles.eventSection}>
            <Text style={[styles.eventSectionTitle, { color: colors.textSecondary }]}>
              📅 Jadwal
            </Text>
            {daySchedules.map(schedule => (
              <TouchableOpacity
                key={schedule.id}
                style={[styles.eventItem, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => router.push(`/schedule/${schedule.id}`)}
              >
                <View style={[styles.eventDot, { backgroundColor: schedule.color || colors.info }]} />
                <View style={styles.eventContent}>
                  <Text style={[styles.eventTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {schedule.title}
                  </Text>
                  {schedule.start_time && (
                    <Text style={[styles.eventTime, { color: colors.textMuted }]}>
                      {formatWaktu(schedule.start_time)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {tasksOnDate.length === 0 && daySchedules.length === 0 && (
          <Text style={[styles.noEvents, { color: colors.textMuted }]}>
            Tidak ada agenda di tanggal ini
          </Text>
        )}
        
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
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  dayCell: {
    width: '14.28%',
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellInner: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  indicators: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  eventsContainer: {
    flex: 1,
    padding: 16,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  eventSection: {
    marginBottom: 16,
  },
  eventSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 12,
    marginTop: 2,
  },
  noEvents: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
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
