import { useColorScheme } from '@/components/useColorScheme';
import { NoteWithCategory } from '@/src/models';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { formatTanggalPendek } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface NoteCardProps {
  note: NoteWithCategory;
  onPress: () => void;
}

export default function NoteCard({ note, onPress }: NoteCardProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  // Get preview text (first 100 chars) - censor if private
  const getPreview = () => {
    if (note.is_private) return '••••••••••••••••••••••••••••••';
    if (!note.content) return 'Tidak ada isi...';
    return note.content.length > 100 
      ? note.content.substring(0, 100) + '...' 
      : note.content;
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Category indicator */}
      {note.category_color && (
        <View 
          style={[
            styles.categoryIndicator, 
            { backgroundColor: note.category_color }
          ]} 
        />
      )}
      
      <View style={styles.content}>
        {/* Title with lock icon for private */}
        <View style={styles.titleRow}>
          {note.is_private && (
            <Ionicons name="lock-closed" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
          )}
          <Text 
            style={[styles.title, { color: colors.textPrimary, flex: 1 }]}
            numberOfLines={1}
          >
            {note.title}
          </Text>
        </View>
        
        {/* Preview - censored if private */}
        <Text 
          style={[styles.preview, { color: note.is_private ? colors.textMuted : colors.textSecondary }]}
          numberOfLines={2}
        >
          {getPreview()}
        </Text>
        
        {/* Footer */}
        <View style={styles.footer}>
          {note.category_name && (
            <View style={[styles.badge, { backgroundColor: note.category_color + '20' }]}>
              <Text style={[styles.badgeText, { color: note.category_color }]}>
                {note.category_name}
              </Text>
            </View>
          )}
          
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {formatTanggalPendek(note.updated_at)}
          </Text>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingLeft: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
  },
});
