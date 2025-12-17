import { useColorScheme } from '@/components/useColorScheme';
import { EmptyState, LoadingSpinner, TaskCard } from '@/src/components';
import * as taskService from '@/src/services/taskService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { formatTanggal, NAMA_HARI } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { 
    todayTasks, 
    overdueTasks, 
    isLoading,
    refreshTaskData 
  } = useAppStore();
  
  const [refreshing, setRefreshing] = React.useState(false);
  
  const today = new Date();
  const dayName = NAMA_HARI[today.getDay()];
  const dateFormatted = formatTanggal(today.toISOString());
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTaskData();
    setRefreshing(false);
  }, []);
  
  const handleToggleComplete = async (taskId: number) => {
    await taskService.markTaskComplete(taskId);
    await refreshTaskData();
  };
  
  const handleToggleToday = async (taskId: number) => {
    await taskService.toggleTaskToday(taskId);
    await refreshTaskData();
  };

  if (isLoading && todayTasks.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Selamat Datang! 👋</Text>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.date}>{dateFormatted}</Text>
        </View>
        
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{todayTasks.length}</Text>
            <Text style={styles.statLabel}>Tugas Hari Ini</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, overdueTasks.length > 0 && { color: '#FECACA' }]}>
              {overdueTasks.length}
            </Text>
            <Text style={styles.statLabel}>Terlambat</Text>
          </View>
        </View>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.danger + '20' }]}>
                <Ionicons name="warning" size={18} color={colors.danger} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.danger }]}>
                Terlambat ({overdueTasks.length})
              </Text>
            </View>
            {overdueTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => router.push(`/task/${task.id}`)}
                onToggleComplete={() => handleToggleComplete(task.id)}
                onToggleToday={() => handleToggleToday(task.id)}
              />
            ))}
          </View>
        )}
        
        {/* Today Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="today" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Tugas Hari Ini
            </Text>
          </View>
          
          {todayTasks.length === 0 ? (
            <EmptyState
              icon="checkmark-circle"
              title="Tidak Ada Tugas"
              message="Belum ada tugas untuk hari ini. Tandai tugas dengan bintang ⭐ untuk menambahkannya ke sini."
            />
          ) : (
            todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => router.push(`/task/${task.id}`)}
                onToggleComplete={() => handleToggleComplete(task.id)}
                onToggleToday={() => handleToggleToday(task.id)}
              />
            ))
          )}
        </View>
        
        {/* Add padding at bottom */}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/task/new')}
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
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  dayName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  date: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
