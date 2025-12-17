import { useColorScheme } from '@/components/useColorScheme';
import { LoadingSpinner, SimpleMarkdownRenderer } from '@/src/components';
import { TaskStatus, TaskWithDetails } from '@/src/models';
import * as taskService from '@/src/services/taskService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS, STATUS_OPTIONS } from '@/src/utils/constants';
import {
    formatTanggalWaktu,
    getAssignmentTypeLabel,
    getDeadlineLabel,
    getPriorityLabel
} from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { refreshTaskData } = useAppStore();
  const [task, setTask] = useState<TaskWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadTask = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const taskData = await taskService.getTaskById(parseInt(id));
      setTask(taskData);
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat detail tugas');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadTask();
  }, [id]);
  
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    try {
      await taskService.updateTask(task.id, { status: newStatus });
      await loadTask();
      await refreshTaskData();
    } catch (error) {
      Alert.alert('Error', 'Gagal mengubah status');
    }
  };
  
  const handleToggleToday = async () => {
    if (!task) return;
    try {
      await taskService.toggleTaskToday(task.id);
      await loadTask();
      await refreshTaskData();
    } catch (error) {
      Alert.alert('Error', 'Gagal mengubah status');
    }
  };
  
  const handleDelete = () => {
    Alert.alert(
      'Hapus Tugas',
      `Apakah Anda yakin ingin menghapus tugas "${task?.title}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            try {
              await taskService.deleteTask(parseInt(id!));
              await refreshTaskData();
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus tugas');
            }
          }
        }
      ]
    );
  };
  
  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Tidak bisa membuka link');
    });
  };
  
  const getPriorityColor = () => {
    switch (task?.priority) {
      case 'HIGH': return colors.priorityHigh;
      case 'MEDIUM': return colors.priorityMedium;
      case 'LOW': return colors.priorityLow;
      default: return colors.textMuted;
    }
  };
  
  const isOverdue = task?.deadline && new Date(task.deadline) < new Date() && task?.status !== 'DONE';
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Tugas tidak ditemukan
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: getPriorityColor() }]}>
        <View style={styles.headerBadges}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {task.type === 'KULIAH' ? '📚 Tugas Kuliah' : '📋 Non-Kuliah'}
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {getPriorityLabel(task.priority)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.taskTitle}>{task.title}</Text>
        
        {task.category_name && (
          <View style={[styles.categoryBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <View style={[styles.categoryDot, { backgroundColor: task.category_color }]} />
            <Text style={styles.categoryText}>{task.category_name}</Text>
          </View>
        )}
      </View>
      
      {/* Status Selector */}
      <View style={[styles.statusSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Status
        </Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.statusButton,
                { 
                  backgroundColor: task.status === opt.value ? opt.color : colors.surfaceVariant,
                  borderColor: opt.color 
                }
              ]}
              onPress={() => handleStatusChange(opt.value as TaskStatus)}
            >
              <Text style={[
                styles.statusButtonText,
                { color: task.status === opt.value ? colors.textInverse : opt.color }
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Deadline */}
      {task.deadline && (
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.infoRow}>
            <Ionicons 
              name="time" 
              size={20} 
              color={isOverdue ? colors.danger : colors.primary} 
            />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Deadline
              </Text>
              <Text style={[
                styles.infoValue, 
                { color: isOverdue ? colors.danger : colors.textPrimary }
              ]}>
                {formatTanggalWaktu(task.deadline)}
              </Text>
              <Text style={[
                styles.infoSubtext,
                { color: isOverdue ? colors.danger : colors.textMuted }
              ]}>
                {getDeadlineLabel(task.deadline)}
              </Text>
            </View>
          </View>
        </View>
      )}
      
      {/* Today Toggle */}
      <TouchableOpacity 
        style={[styles.infoCard, { backgroundColor: colors.surface }]}
        onPress={handleToggleToday}
      >
        <View style={styles.infoRow}>
          <Ionicons 
            name={task.is_today ? "star" : "star-outline"} 
            size={20} 
            color={task.is_today ? colors.warning : colors.textMuted} 
          />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Tugas Hari Ini
            </Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {task.is_today ? 'Ya - Tampil di halaman Hari Ini' : 'Tidak'}
            </Text>
          </View>
          <Ionicons 
            name={task.is_today ? "toggle" : "toggle-outline"} 
            size={24} 
            color={task.is_today ? colors.warning : colors.textMuted} 
          />
        </View>
      </TouchableOpacity>
      
      {/* Course Detail */}
      {task.course_detail && (
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            📚 Detail Tugas Kuliah
          </Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Mata Kuliah
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {task.course_detail.course_name}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Jenis Tugas
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {getAssignmentTypeLabel(task.course_detail.assignment_type)}
            </Text>
          </View>
          
          {task.course_detail.notes && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Catatan
              </Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {task.course_detail.notes}
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* Description */}
      {task.description && (
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            📝 Deskripsi
          </Text>
          <SimpleMarkdownRenderer content={task.description} />
        </View>
      )}
      
      {/* Links */}
      {task.links && task.links.length > 0 && (
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            🔗 Link Pendukung
          </Text>
          {task.links.map(link => (
            <TouchableOpacity
              key={link.id}
              style={[styles.linkItem, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => handleOpenLink(link.url)}
            >
              <Ionicons name="link" size={16} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]} numberOfLines={1}>
                {link.label || link.url}
              </Text>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Meta Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Dibuat
          </Text>
          <Text style={[styles.detailValue, { color: colors.textMuted }]}>
            {formatTanggalWaktu(task.created_at)}
          </Text>
        </View>
        {task.completed_at && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              Diselesaikan
            </Text>
            <Text style={[styles.detailValue, { color: colors.success }]}>
              {formatTanggalWaktu(task.completed_at)}
            </Text>
          </View>
        )}
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/task/edit/${id}`)}
        >
          <Ionicons name="create-outline" size={20} color={colors.textInverse} />
          <Text style={[styles.editButtonText, { color: colors.textInverse }]}>
            Edit Tugas
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
    paddingTop: 16,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  statusSection: {
    padding: 16,
    margin: 16,
    borderRadius: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
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
