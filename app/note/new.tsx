import { useColorScheme } from '@/components/useColorScheme';
import * as noteService from '@/src/services/noteService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

export default function NewNoteScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { categories, fetchNotes, fetchCategories } = useAppStore();
  const noteCategories = categories.filter(c => c.type === 'NOTE');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    fetchCategories();
  }, []);
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Judul catatan harus diisi');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await noteService.createNote({
        title: title.trim(),
        content: content.trim() || undefined,
        category_id: categoryId || undefined,
      });
      
      await fetchNotes();
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal membuat catatan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Judul Catatan *
        </Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: colors.surface, 
            color: colors.textPrimary,
            borderColor: colors.border 
          }]}
          placeholder="Masukkan judul catatan..."
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
      </View>
      
      {/* Category */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Kategori
        </Text>
        <View style={styles.categoryRow}>
          <TouchableOpacity
            style={[
              styles.categoryChip,
              { 
                backgroundColor: categoryId === null ? colors.primary : colors.surfaceVariant,
              }
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
                { 
                  backgroundColor: categoryId === cat.id ? cat.color : colors.surfaceVariant,
                }
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
      
      {/* Content */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Isi Catatan
        </Text>
        <TextInput
          style={[styles.input, styles.contentInput, { 
            backgroundColor: colors.surface, 
            color: colors.textPrimary,
            borderColor: colors.border 
          }]}
          placeholder="Tulis catatan Anda di sini..."
          placeholderTextColor={colors.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
      </View>
      
      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton, 
          { backgroundColor: colors.secondary },
          isSubmitting && { opacity: 0.6 }
        ]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Ionicons name="checkmark" size={20} color={colors.textInverse} />
        <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
          {isSubmitting ? 'Menyimpan...' : 'Simpan Catatan'}
        </Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
