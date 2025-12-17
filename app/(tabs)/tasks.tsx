import { useColorScheme } from '@/components/useColorScheme';
import { EmptyState, LoadingSpinner, TaskCard } from '@/src/components';
import { TaskStatus, TaskType } from '@/src/models';
import * as taskService from '@/src/services/taskService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type FilterType = TaskType | 'ALL';
type FilterStatus = TaskStatus | 'ALL';

export default function TasksScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { tasks, isLoading, fetchTasks, refreshTaskData } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  
  useEffect(() => {
    fetchTasks();
  }, []);
  
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
  
  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterType !== 'ALL' && task.type !== filterType) return false;
    if (filterStatus !== 'ALL' && task.status !== filterStatus) return false;
    return true;
  });

  const renderFilterChip = (
    label: string, 
    value: string, 
    currentValue: string, 
    onPress: () => void
  ) => {
    const isActive = value === currentValue;
    return (
      <TouchableOpacity
        style={[
          styles.filterChip,
          { 
            backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
            borderColor: isActive ? colors.primary : colors.border,
          }
        ]}
        onPress={onPress}
      >
        <Text style={[
          styles.filterChipText,
          { color: isActive ? colors.textInverse : colors.textSecondary }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading && tasks.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.surface }]}>
        {/* Type Filter */}
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Tipe:</Text>
          <View style={styles.filterChips}>
            {renderFilterChip('Semua', 'ALL', filterType, () => setFilterType('ALL'))}
            {renderFilterChip('📚 Kuliah', 'KULIAH', filterType, () => setFilterType('KULIAH'))}
            {renderFilterChip('📋 Non-Kuliah', 'NON_KULIAH', filterType, () => setFilterType('NON_KULIAH'))}
          </View>
        </View>
        
        {/* Status Filter */}
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Status:</Text>
          <View style={styles.filterChips}>
            {renderFilterChip('Semua', 'ALL', filterStatus, () => setFilterStatus('ALL'))}
            {renderFilterChip('Belum', 'TODO', filterStatus, () => setFilterStatus('TODO'))}
            {renderFilterChip('Dikerjakan', 'PROGRESS', filterStatus, () => setFilterStatus('PROGRESS'))}
            {renderFilterChip('Selesai', 'DONE', filterStatus, () => setFilterStatus('DONE'))}
          </View>
        </View>
      </View>
      
      {/* Task Count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filteredTasks.length} tugas ditemukan
        </Text>
      </View>
      
      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => router.push(`/task/${item.id}`)}
            onToggleComplete={() => handleToggleComplete(item.id)}
            onToggleToday={() => handleToggleToday(item.id)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="clipboard"
            title="Belum Ada Tugas"
            message="Tap tombol + untuk menambahkan tugas baru"
          />
        }
        contentContainerStyle={filteredTasks.length === 0 && styles.emptyContainer}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
      
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
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  countRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  countText: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
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
