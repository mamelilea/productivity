import { useColorScheme } from '@/components/useColorScheme';
import {
    CategoryPickerModal,
    LoadingSpinner,
    SimpleMarkdownInput
} from '@/src/components';
import * as noteService from '@/src/services/noteService';
import * as settingsService from '@/src/services/settingsService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function EditNoteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { categories, fetchNotes, fetchCategories } = useAppStore();
  const noteCategories = categories.filter(c => c.type === 'NOTE');
  
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  useEffect(() => {
    loadNote();
    checkPassword();
  }, [id]);
  
  const loadNote = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const note = await noteService.getNoteById(parseInt(id));
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setCategoryId(note.category_id);
        setIsPrivate(note.is_private);
      }
      await fetchCategories();
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat catatan');
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkPassword = async () => {
    const hasPass = await settingsService.hasNotePassword();
    setHasPassword(hasPass);
  };
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Judul catatan harus diisi');
      return;
    }
    
    if (isPrivate && !hasPassword) {
      Alert.alert(
        'Sandi Belum Diatur',
        'Untuk membuat catatan private, silakan atur sandi terlebih dahulu di Pengaturan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ke Pengaturan', onPress: () => router.push('/(tabs)/settings') }
        ]
      );
      return;
    }
    
    setIsSubmitting(true);
    try {
      await noteService.updateNote(parseInt(id!), {
        title: title.trim(),
        content: content.trim() || undefined,
        category_id: categoryId || undefined,
        is_private: isPrivate,
      });
      
      await fetchNotes();
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menyimpan catatan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = noteCategories.find(c => c.id === categoryId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <TouchableOpacity
            style={[styles.categorySelector, { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }]}
            onPress={() => setShowCategoryPicker(true)}
          >
            {selectedCategory ? (
              <View style={styles.categoryDisplay}>
                <View style={[styles.categoryDot, { backgroundColor: selectedCategory.color }]} />
                <Text style={[styles.categoryText, { color: colors.textPrimary }]}>
                  {selectedCategory.name}
                </Text>
              </View>
            ) : (
              <Text style={[styles.categoryText, { color: colors.textMuted }]}>
                Pilih kategori...
              </Text>
            )}
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        
        {/* Private Toggle */}
        <View style={styles.formGroup}>
          <View style={[styles.privateToggle, { backgroundColor: colors.surfaceVariant }]}>
            <View style={styles.privateToggleContent}>
              <Ionicons 
                name={isPrivate ? "lock-closed" : "lock-open-outline"} 
                size={22} 
                color={isPrivate ? colors.warning : colors.textMuted} 
              />
              <View style={styles.privateToggleText}>
                <Text style={[styles.privateTitle, { color: colors.textPrimary }]}>
                  Catatan Private
                </Text>
                <Text style={[styles.privateSubtitle, { color: colors.textMuted }]}>
                  {hasPassword 
                    ? 'Dilindungi dengan sandi' 
                    : 'Atur sandi di Pengaturan terlebih dahulu'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.border, true: colors.warning }}
              disabled={!hasPassword}
            />
          </View>
        </View>
        
        {/* Content */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Isi Catatan
          </Text>
          <SimpleMarkdownInput
            value={content}
            onChangeText={setContent}
            placeholder="Tulis catatan Anda di sini..."
            minHeight={200}
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
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Text>
        </TouchableOpacity>
        
        <View style={{ height: 50 }} />

        {/* Category Picker Modal */}
        <CategoryPickerModal
          visible={showCategoryPicker}
          onClose={() => setShowCategoryPicker(false)}
          onSelect={(id) => {
            setCategoryId(id);
            fetchCategories();
          }}
          selectedId={categoryId}
          categoryType="NOTE"
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 16,
  },
  privateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  privateToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privateToggleText: {
    marginLeft: 12,
    flex: 1,
  },
  privateTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  privateSubtitle: {
    fontSize: 12,
    marginTop: 2,
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
