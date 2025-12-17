import DateTimeInput from '@/components/DateTimeInput';
import { useColorScheme } from '@/components/useColorScheme';
import { SimpleMarkdownInput, SimpleMarkdownRenderer } from '@/src/components';
import { LogbookCategory, LogbookEntry, LogbookTag, TAG_COLORS, TAG_LABELS } from '@/src/models';
import * as logbookService from '@/src/services/logbookService';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function LogbookCategoryScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const [category, setCategory] = useState<LogbookCategory | null>(null);
    const [entries, setEntries] = useState<LogbookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Entry form state
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [content, setContent] = useState('');
    const [selectedTags, setSelectedTags] = useState<LogbookTag[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

    const loadData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const cat = await logbookService.getCategoryById(parseInt(id));
            setCategory(cat);
            const entryList = await logbookService.getEntriesByCategory(parseInt(id));
            setEntries(entryList);
        } catch (error) {
            console.error('Error loading category:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [id])
    );

    const resetForm = () => {
        setSelectedDate(new Date());
        setContent('');
        setSelectedTags([]);
        setEditingEntryId(null);
    };

    const handleOpenNewEntry = () => {
        resetForm();
        setShowEntryModal(true);
    };

    const handleEditEntry = (entry: LogbookEntry) => {
        setSelectedDate(new Date(entry.date));
        setContent(entry.content);
        setSelectedTags(entry.tags);
        setEditingEntryId(entry.id);
        setShowEntryModal(true);
    };

    const handleSaveEntry = async () => {
        if (!content.trim()) {
            Alert.alert('Error', 'Isi logbook tidak boleh kosong');
            return;
        }

        setIsSaving(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            
            if (editingEntryId) {
                await logbookService.updateLogbookEntry(editingEntryId, {
                    content: content.trim(),
                    tags: selectedTags,
                    date: dateStr,
                });
            } else {
                await logbookService.createLogbookEntry({
                    category_id: parseInt(id!),
                    date: dateStr,
                    content: content.trim(),
                    tags: selectedTags,
                });
            }

            await loadData();
            setShowEntryModal(false);
            resetForm();
        } catch (error) {
            Alert.alert('Error', 'Gagal menyimpan logbook');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEntry = (entry: LogbookEntry) => {
        Alert.alert(
            'Hapus Entry',
            'Hapus logbook ini?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        await logbookService.deleteLogbookEntry(entry.id);
                        await loadData();
                    }
                }
            ]
        );
    };

    const toggleTag = (tag: LogbookTag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const renderEntry = ({ item }: { item: LogbookEntry }) => (
        <TouchableOpacity
            style={[styles.entryCard, { backgroundColor: colors.surface }]}
            onPress={() => handleEditEntry(item)}
            onLongPress={() => handleDeleteEntry(item)}
            activeOpacity={0.7}
        >
            <View style={styles.entryHeader}>
                <Text style={[styles.entryDate, { color: colors.textPrimary }]}>
                    {logbookService.formatDateForDisplay(item.date)}
                </Text>
                <Ionicons name="create-outline" size={18} color={colors.textMuted} />
            </View>

            {item.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                    {item.tags.map(tag => (
                        <View key={tag} style={[styles.tag, { backgroundColor: TAG_COLORS[tag] + '20' }]}>
                            <Text style={[styles.tagText, { color: TAG_COLORS[tag] }]}>
                                {TAG_LABELS[tag]}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.entryContent}>
                <SimpleMarkdownRenderer content={item.content} />
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Belum Ada Logbook
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Mulai catat aktivitas harianmu
            </Text>
        </View>
    );

    if (!category) {
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: category.color }]}>
                <Text style={styles.headerIcon}>{category.icon}</Text>
                <Text style={styles.headerTitle}>{category.name}</Text>
                <Text style={styles.headerCount}>{entries.length} entri</Text>
            </View>

            {/* Entries List */}
            <FlatList
                data={entries}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderEntry}
                contentContainerStyle={entries.length === 0 ? styles.emptyContainer : styles.listContainer}
                ListEmptyComponent={!loading ? renderEmptyState : null}
                showsVerticalScrollIndicator={false}
            />

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: category.color }]}
                onPress={handleOpenNewEntry}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>

            {/* Entry Modal */}
            <Modal
                visible={showEntryModal}
                animationType="slide"
                onRequestClose={() => setShowEntryModal(false)}
            >
                <KeyboardAvoidingView 
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
                            <TouchableOpacity onPress={() => setShowEntryModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                                {editingEntryId ? 'Edit Logbook' : 'Logbook Baru'}
                            </Text>
                            <TouchableOpacity onPress={handleSaveEntry} disabled={isSaving}>
                                <Text style={[styles.saveText, { color: category.color }]}>
                                    {isSaving ? 'Menyimpan...' : 'Simpan'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            style={styles.modalContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Date Picker */}
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.textPrimary }]}>
                                    Tanggal
                                </Text>
                                <DateTimeInput
                                    label="Tanggal"
                                    value={selectedDate}
                                    onChange={(date) => date && setSelectedDate(date)}
                                    mode="date"
                                    placeholder="Pilih tanggal"
                                />
                            </View>

                            {/* Tags */}
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.textPrimary }]}>
                                    Tag Aktivitas
                                </Text>
                                <View style={styles.tagsRow}>
                                    {(Object.keys(TAG_LABELS) as LogbookTag[]).map(tag => (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[
                                                styles.tagButton,
                                                { backgroundColor: colors.surfaceVariant },
                                                selectedTags.includes(tag) && { backgroundColor: TAG_COLORS[tag] },
                                            ]}
                                            onPress={() => toggleTag(tag)}
                                        >
                                            <Text style={[
                                                styles.tagButtonText,
                                                { color: selectedTags.includes(tag) ? '#FFF' : colors.textSecondary },
                                            ]}>
                                                {TAG_LABELS[tag]}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Content */}
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.textPrimary }]}>
                                    Aktivitas Hari Ini
                                </Text>
                                <SimpleMarkdownInput
                                    value={content}
                                    onChangeText={setContent}
                                    placeholder="- Apa yang sudah dikerjakan hari ini?"
                                    minHeight={250}
                                />
                            </View>

                            <View style={{ height: 50 }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
    },
    headerCount: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    entryCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    entryDate: {
        fontSize: 15,
        fontWeight: '600',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '500',
    },
    entryContent: {
        // Content styling handled by markdown renderer
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 13,
        marginTop: 4,
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
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    tagButtonText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
