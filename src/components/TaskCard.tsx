import { useColorScheme } from '@/components/useColorScheme';
import { TaskWithDetails } from '@/src/models';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { getDeadlineLabel } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface TaskCardProps {
  task: TaskWithDetails;
  onPress: () => void;
  onToggleComplete?: () => void;
  onToggleToday?: () => void;
  showDeadline?: boolean;
}

export default function TaskCard({ 
  task, 
  onPress, 
  onToggleComplete,
  onToggleToday,
  showDeadline = true 
}: TaskCardProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'HIGH': return colors.priorityHigh;
      case 'MEDIUM': return colors.priorityMedium;
      case 'LOW': return colors.priorityLow;
      default: return colors.textMuted;
    }
  };
  
  const getStatusColor = () => {
    switch (task.status) {
      case 'DONE': return colors.statusDone;
      case 'PROGRESS': return colors.statusProgress;
      default: return colors.statusTodo;
    }
  };
  
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'DONE';

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.surface,
          borderLeftColor: getPriorityColor(),
          opacity: task.status === 'DONE' ? 0.6 : 1,
        }
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        {/* Checkbox */}
        <TouchableOpacity 
          style={[
            styles.checkbox,
            { 
              borderColor: getStatusColor(),
              backgroundColor: task.status === 'DONE' ? getStatusColor() : 'transparent'
            }
          ]}
          onPress={onToggleComplete}
        >
          {task.status === 'DONE' && (
            <Ionicons name="checkmark" size={16} color={colors.textInverse} />
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {/* Title */}
        <Text 
          style={[
            styles.title, 
            { 
              color: colors.textPrimary,
              textDecorationLine: task.status === 'DONE' ? 'line-through' : 'none'
            }
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        
        {/* Meta info */}
        <View style={styles.metaRow}>
          {/* Type badge */}
          <View style={[styles.badge, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
              {task.type === 'KULIAH' ? '📚 Kuliah' : task.type === 'CUSTOM' ? `🏷️ ${task.custom_type || 'Custom'}` : '📋 Non-Kuliah'}
            </Text>
          </View>
          
          {/* Category */}
          {task.category_name && (
            <View style={[styles.badge, { backgroundColor: task.category_color + '20' }]}>
              <View style={[styles.categoryDot, { backgroundColor: task.category_color }]} />
              <Text style={[styles.badgeText, { color: task.category_color }]}>
                {task.category_name}
              </Text>
            </View>
          )}
          
          {/* Status */}
          {task.status === 'PROGRESS' && (
            <View style={[styles.badge, { backgroundColor: colors.statusProgress + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.statusProgress }]}>
                🔄 Dikerjakan
              </Text>
            </View>
          )}
        </View>
        
        {/* Deadline */}
        {showDeadline && task.deadline && (
          <View style={styles.deadlineRow}>
            <Ionicons 
              name="time-outline" 
              size={14} 
              color={isOverdue ? colors.danger : colors.textMuted} 
            />
            <Text 
              style={[
                styles.deadlineText, 
                { color: isOverdue ? colors.danger : colors.textMuted }
              ]}
            >
              {getDeadlineLabel(task.deadline)}
            </Text>
          </View>
        )}
      </View>
      
      {/* Right section */}
      <View style={styles.rightSection}>
        {onToggleToday && (
          <TouchableOpacity 
            style={styles.todayButton}
            onPress={onToggleToday}
          >
            <Ionicons 
              name={task.is_today ? "star" : "star-outline"} 
              size={22} 
              color={task.is_today ? colors.warning : colors.textMuted} 
            />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  leftSection: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayButton: {
    padding: 4,
  },
});
