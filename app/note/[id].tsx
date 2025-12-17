import { useColorScheme } from '@/components/useColorScheme';
import { LoadingSpinner } from '@/src/components';
import { NoteWithCategory } from '@/src/models';
import * as noteService from '@/src/services/noteService';
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
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function NoteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { categories, fetchNotes, fetchCategories } = useAppStore();
  const noteCategories = categories.filter(c => c.type === 'NOTE');
  
  const [note, setNote] = useState<NoteWithCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  
  const loadNote = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const noteData = await noteService.getNoteById(parseInt(id));
      setNote(noteData);
      if (noteData) {
        setTitle(noteData.title);
        setContent(noteData.content);
        setCategoryId(noteData.category_id);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat catatan');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadNote();
    fetchCategories();
  }, [id]);
  
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Judul catatan harus diisi');
      return;
    }
    
    setIsSaving(true);
    try {
      await noteService.updateNote(parseInt(id!), {
        title: title.trim(),
        content: content.trim(),
        category_id: categoryId || undefined,
      });
      await loadNote();
      await fetchNotes();
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Gagal menyimpan catatan');
    } finally {
      setIsSaving(false);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Actions */}
      <View style={[styles.headerActions, { backgroundColor: colors.surface }]}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
              onPress={() => {
                setTitle(note.title);
                setContent(note.content);
                setCategoryId(note.category_id);
                setIsEditing(false);
              }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
              <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                Batal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Ionicons name="checkmark" size={20} color={colors.textInverse} />
              <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="pencil" size={20} color={colors.textInverse} />
              <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.danger }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={20} color={colors.textInverse} />
              <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
                Hapus
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {isEditing ? (
          // Edit Mode
          <>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Judul</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface, 
                  color: colors.textPrimary,
                  borderColor: colors.border 
                }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Judul catatan"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Kategori</Text>
              <View style={styles.categoryRow}>
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    { backgroundColor: categoryId === null ? colors.primary : colors.surfaceVariant }
                  ]}
                  onPress={() => setCategoryId(null)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: categoryId === null ? colors.textInverse : colors.textSecondary }
                  ]}>
                    Tanpa Kategori
                  </Text>
                </TouchableOpacity>
                {noteCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: categoryId === cat.id ? cat.color : colors.surfaceVariant }
                    ]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      { color: categoryId === cat.id ? colors.textInverse : colors.textSecondary }
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Isi</Text>
              <TextInput
                style={[styles.input, styles.contentInput, { 
                  backgroundColor: colors.surface, 
                  color: colors.textPrimary,
                  borderColor: colors.border 
                }]}
                value={content}
                onChangeText={setContent}
                placeholder="Isi catatan..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>
          </>
        ) : (
          // View Mode
          <>
            {/* Title & Category */}
            <View style={styles.noteHeader}>
              {note.category_name && (
                <View style={[styles.categoryBadge, { backgroundColor: note.category_color + '20' }]}>
                  <View style={[styles.categoryDot, { backgroundColor: note.category_color }]} />
                  <Text style={[styles.categoryBadgeText, { color: note.category_color }]}>
                    {note.category_name}
                  </Text>
                </View>
              )}
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
                <Text style={[styles.noteContent, { color: colors.textPrimary }]}>
                  {note.content}
                </Text>
              ) : (
                <Text style={[styles.emptyContent, { color: colors.textMuted }]}>
                  Catatan ini kosong. Tap "Edit" untuk menambahkan isi.
                </Text>
              )}
            </View>
          </>
        )}
        
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
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  noteHeader: {
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
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
  noteContent: {
    fontSize: 16,
    lineHeight: 26,
  },
  emptyContent: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  contentInput: {
    minHeight: 200,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
