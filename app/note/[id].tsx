import { useColorScheme } from '@/components/useColorScheme';
import { LoadingSpinner, PasswordPrompt, SimpleMarkdownRenderer } from '@/src/components';
import { NoteWithCategory } from '@/src/models';
import * as noteService from '@/src/services/noteService';
import * as settingsService from '@/src/services/settingsService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { formatTanggalWaktu } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
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

export default function NoteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { fetchNotes } = useAppStore();
  
  const [note, setNote] = useState<NoteWithCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  const loadNote = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const noteData = await noteService.getNoteById(parseInt(id));
      setNote(noteData);
      // If note is private, keep it locked initially
      if (noteData?.is_private) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat catatan');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadNote();
  }, [id]);
  
  const handleUnlock = () => {
    setShowPasswordPrompt(true);
  };
  
  const handlePasswordSubmit = async (password: string) => {
    const isValid = await settingsService.verifyNotePassword(password);
    if (isValid) {
      setIsLocked(false);
      setShowPasswordPrompt(false);
      setPasswordError('');
    } else {
      setPasswordError('Sandi salah. Coba lagi.');
    }
  };
  
  const handleDelete = () => {
    Alert.alert(
      'Hapus Catatan',
      `Apakah Anda yakin ingin menghapus catatan "${note?.title}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            try {
              await noteService.deleteNote(parseInt(id!));
              await fetchNotes();
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Gagal menghapus catatan');
            }
          }
        }
      ]
    );
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!note) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Catatan tidak ditemukan
        </Text>
      </View>
    );
  }

  // Show locked state for private notes
  if (note.is_private && isLocked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.lockedContainer}>
          <View style={[styles.lockIconContainer, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="lock-closed" size={48} color={colors.warning} />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>
            Catatan Terkunci
          </Text>
          <Text style={[styles.lockedSubtitle, { color: colors.textMuted }]}>
            Catatan ini dilindungi dengan sandi
          </Text>
          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: colors.primary }]}
            onPress={handleUnlock}
          >
            <Ionicons name="key" size={20} color={colors.textInverse} />
            <Text style={[styles.unlockButtonText, { color: colors.textInverse }]}>
              Buka dengan Sandi
            </Text>
          </TouchableOpacity>
        </View>
        
        <PasswordPrompt
          visible={showPasswordPrompt}
          onClose={() => {
            setShowPasswordPrompt(false);
            setPasswordError('');
          }}
          onSubmit={handlePasswordSubmit}
          error={passwordError}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.noteHeader}>
          <View style={styles.headerRow}>
            {note.category_name && (
              <View style={[styles.categoryBadge, { backgroundColor: note.category_color + '20' }]}>
                <View style={[styles.categoryDot, { backgroundColor: note.category_color }]} />
                <Text style={[styles.categoryBadgeText, { color: note.category_color }]}>
                  {note.category_name}
                </Text>
              </View>
            )}
            {note.is_private && (
              <View style={[styles.privateBadge, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="lock-closed" size={12} color={colors.warning} />
                <Text style={[styles.privateBadgeText, { color: colors.warning }]}>
                  Private
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>
            {note.title}
          </Text>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            Diperbarui: {formatTanggalWaktu(note.updated_at)}
          </Text>
        </View>
        
        {/* Content */}
        <View style={[styles.contentCard, { backgroundColor: colors.surface }]}>
          {note.content ? (
            <SimpleMarkdownRenderer content={note.content} />
          ) : (
            <Text style={[styles.emptyContent, { color: colors.textMuted }]}>
              Catatan ini kosong. Tap "Edit" untuk menambahkan isi.
            </Text>
          )}
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/note/edit/${id}`)}
          >
            <Ionicons name="create-outline" size={20} color={colors.textInverse} />
            <Text style={[styles.editButtonText, { color: colors.textInverse }]}>
              Edit Catatan
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
    </View>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  noteHeader: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  privateBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noteTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
  },
  contentCard: {
    padding: 16,
    borderRadius: 16,
  },
  emptyContent: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
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
