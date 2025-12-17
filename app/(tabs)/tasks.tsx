import { useColorScheme } from '@/components/useColorScheme';
import { EmptyState, LoadingSpinner, TaskCard } from '@/src/components';
import { Category, TaskStatus, TaskType } from '@/src/models';
import * as categoryService from '@/src/services/categoryService';
import * as taskService from '@/src/services/taskService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    ScrollView,
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
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  useEffect(() => {
    fetchTasks();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await categoryService.getCategoriesByType('TASK');
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  };
  
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
  
  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      if (filterType !== 'ALL' && task.type !== filterType) return false;
      if (filterStatus !== 'ALL' && task.status !== filterStatus) return false;
      if (filterCategoryId !== null && task.category_id !== filterCategoryId) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by status first: TODO > PROGRESS > DONE
      const statusOrder = { 'TODO': 0, 'PROGRESS': 1, 'DONE': 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      
      // Then sort by deadline: closest first, null deadlines last
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      
      // Then by priority: HIGH > MEDIUM > LOW
      const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
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
        key={value}
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

  const renderCategoryChip = (category: Category | null) => {
    const isActive = category === null 
      ? filterCategoryId === null 
      : filterCategoryId === category.id;
    const label = category === null ? 'Semua' : category.name;
    const chipColor = category?.color || colors.primary;
    
    return (
      <TouchableOpacity
        key={category?.id || 'all'}
        style={[
          styles.filterChip,
          { 
            backgroundColor: isActive ? chipColor : colors.surfaceVariant,
            borderColor: isActive ? chipColor : colors.border,
          }
        ]}
        onPress={() => setFilterCategoryId(category?.id || null)}
      >
        <Text style={[
          styles.filterChipText,
          { color: isActive ? '#FFFFFF' : colors.textSecondary }
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

        {/* Category Filter */}
        {categories.length > 0 && (
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textMuted }]}>Kategori:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}
            >
              {renderCategoryChip(null)}
              {categories.map(cat => renderCategoryChip(cat))}
            </ScrollView>
          </View>
        )}
      </View>
      
      {/* Task Count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filteredTasks.length} tugas ditemukan
        </Text>
        <Text style={[styles.sortInfo, { color: colors.textMuted }]}>
          Diurutkan berdasarkan deadline terdekat
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  countText: {
    fontSize: 13,
  },
  sortInfo: {
    fontSize: 11,
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
