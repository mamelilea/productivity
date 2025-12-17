import { useColorScheme } from '@/components/useColorScheme';
import { EmptyState, LoadingSpinner, NoteCard, PasswordPrompt } from '@/src/components';
import { NoteWithCategory } from '@/src/models';
import * as authService from '@/src/services/authService';
import { useAppStore } from '@/src/store/appStore';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function NotesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
  
  const { notes, categories, isLoading, fetchNotes, fetchCategories } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  
  const noteCategories = categories.filter(c => c.type === 'NOTE');
  
  // Auth state for private notes
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingNoteId, setPendingNoteId] = useState<number | null>(null);
  
  useEffect(() => {
    fetchNotes();
    fetchCategories();
  }, []);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  }, []);
  
  // Filter notes by category
  const filteredNotes = selectedCategoryId 
    ? notes.filter(n => n.category_id === selectedCategoryId)
    : notes;
  
  // Handle note press with auth for private notes
  const handleNotePress = async (note: NoteWithCategory) => {
    if (!note.is_private) {
      // Public note - open directly
      router.push(`/note/${note.id}`);
      return;
    }
    
    // Private note - require biometric auth
    const preferredMethod = await authService.getPreferredAuthMethod();
    
    if (preferredMethod === 'none') {
      // No auth set up, just open it
      router.push(`/note/${note.id}`);
      return;
    }
    
    if (preferredMethod === 'biometric') {
      const result = await authService.authenticateWithBiometric();
      if (result.success) {
        router.push(`/note/${note.id}`);
      } else if (result.error !== 'Dibatalkan') {
        // Try password fallback
        const hasPass = await authService.hasFinancePassword();
        if (hasPass) {
          setPendingNoteId(note.id);
          setShowPasswordPrompt(true);
        } else {
          Alert.alert('Autentikasi Gagal', result.error || 'Coba lagi');
        }
      }
    } else {
      // Password auth
      setPendingNoteId(note.id);
      setShowPasswordPrompt(true);
    }
  };
  
  const handlePasswordSubmit = async (password: string): Promise<void> => {
    const valid = await authService.verifyFinancePassword(password);
    if (valid && pendingNoteId) {
      setShowPasswordPrompt(false);
      router.push(`/note/${pendingNoteId}`);
      setPendingNoteId(null);
    } else {
      Alert.alert('Password Salah', 'Password yang Anda masukkan tidak valid.');
    }
  };

  if (isLoading && notes.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Category Filter */}
      <View style={[styles.categoryContainer, { backgroundColor: colors.surface }]}>
        <FlatList
          horizontal
          data={[{ id: null, name: 'Semua' } as any, ...noteCategories]}
          keyExtractor={(item) => item.id?.toString() || 'all'}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: selectedCategoryId === item.id 
                    ? (item.color || colors.primary)
                    : colors.surfaceVariant,
                }
              ]}
              onPress={() => setSelectedCategoryId(item.id)}
            >
              <Text style={[
                styles.categoryChipText,
                { 
                  color: selectedCategoryId === item.id 
                    ? colors.textInverse 
                    : colors.textSecondary 
                }
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoryList}
        />
      </View>
      
      {/* Notes Count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {filteredNotes.length} catatan
        </Text>
      </View>
      
      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            onPress={() => handleNotePress(item)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text"
            title="Belum Ada Catatan"
            message="Tap tombol + untuk menambahkan catatan baru"
          />
        }
        contentContainerStyle={filteredNotes.length === 0 && styles.emptyContainer}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
      
      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.secondary }]}
        onPress={() => router.push('/note/new')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>
      
      {/* Password Prompt for Private Notes */}
      <PasswordPrompt
        visible={showPasswordPrompt}
        onClose={() => { setShowPasswordPrompt(false); setPendingNoteId(null); }}
        onSubmit={handlePasswordSubmit}
        title="Catatan Private"
        subtitle="Masukkan password untuk membuka catatan ini"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
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
