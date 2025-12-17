import { useColorScheme } from '@/components/useColorScheme';
import { LogbookTag, TAG_COLORS, TAG_LABELS } from '@/src/models';
import {
    deleteLogbookEntry,
    getLogbookEntryByDate,
    upsertLogbookEntry
} from '@/src/services/logbookService';
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
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const ALL_TAGS: LogbookTag[] = ['CODING', 'MEETING', 'RESEARCH', 'DESIGN', 'REVIEW', 'LAINNYA'];

export default function LogbookEditorScreen() {
    const router = useRouter();
    const { date } = useLocalSearchParams<{ date: string }>();
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const [content, setContent] = useState('');
    const [selectedTags, setSelectedTags] = useState<LogbookTag[]>([]);
    const [entryId, setEntryId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadEntry();
    }, [date]);

    const loadEntry = async () => {
        if (!date) return;

        try {
            setLoading(true);
            const entry = await getLogbookEntryByDate(date);
            if (entry) {
                setContent(entry.content);
                setSelectedTags(entry.tags);
                setEntryId(entry.id);
            }
        } catch (error) {
            console.error('Error loading entry:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDateDisplay = (dateStr: string): string => {
        const dateObj = new Date(dateStr);
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };
        return dateObj.toLocaleDateString('id-ID', options);
    };

    const toggleTag = (tag: LogbookTag) => {
        setSelectedTags(prev => {
            if (prev.includes(tag)) {
                return prev.filter(t => t !== tag);
            }
            return [...prev, tag];
        });
    };

    const handleSave = async () => {
        if (!date) return;

        try {
            setSaving(true);
            await upsertLogbookEntry(date, content, selectedTags);
            router.back();
        } catch (error) {
            console.error('Error saving entry:', error);
            Alert.alert('Error', 'Gagal menyimpan catatan');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!entryId) return;

        Alert.alert(
            'Hapus Catatan',
            'Yakin ingin menghapus catatan ini?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteLogbookEntry(entryId);
                            router.back();
                        } catch (error) {
                            console.error('Error deleting entry:', error);
                            Alert.alert('Error', 'Gagal menghapus catatan');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.textMuted }}>Memuat...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Date Header */}
                <View style={[styles.dateHeader, { backgroundColor: colors.surface }]}>
                    <Ionicons name="calendar" size={24} color={colors.primary} />
                    <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                        {date ? formatDateDisplay(date) : 'Tanggal tidak valid'}
                    </Text>
                </View>

                {/* Tags Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        Label Aktivitas
                    </Text>
                    <View style={styles.tagsGrid}>
                        {ALL_TAGS.map(tag => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                                <TouchableOpacity
                                    key={tag}
                                    style={[
                                        styles.tagButton,
                                        {
                                            backgroundColor: isSelected
                                                ? TAG_COLORS[tag]
                                                : colors.surfaceVariant,
                                            borderColor: TAG_COLORS[tag],
                                            borderWidth: isSelected ? 0 : 1,
                                        }
                                    ]}
                                    onPress={() => toggleTag(tag)}
                                >
                                    <Text
                                        style={[
                                            styles.tagButtonText,
                                            {
                                                color: isSelected
                                                    ? '#FFFFFF'
                                                    : TAG_COLORS[tag]
                                            }
                                        ]}
                                    >
                                        {TAG_LABELS[tag]}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Content Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        Apa yang sudah kamu kerjakan hari ini?
                    </Text>
                    <TextInput
                        style={[
                            styles.textInput,
                            {
                                backgroundColor: colors.surface,
                                color: colors.textPrimary,
                                borderColor: colors.border,
                            }
                        ]}
                        placeholder="Tulis aktivitas harianmu di sini...

Contoh:
- Mengerjakan fitur login
- Meeting dengan tim
- Review pull request
- Riset teknologi baru"
                        placeholderTextColor={colors.textMuted}
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                        autoFocus={!entryId}
                    />
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Ionicons name="checkmark" size={20} color={colors.textInverse} />
                        <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                            {saving ? 'Menyimpan...' : 'Simpan'}
                        </Text>
                    </TouchableOpacity>

                    {entryId && (
                        <TouchableOpacity
                            style={[styles.deleteButton, { backgroundColor: colors.danger + '15' }]}
                            onPress={handleDelete}
                        >
                            <Ionicons name="trash-outline" size={20} color={colors.danger} />
                            <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                                Hapus
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        margin: 16,
        borderRadius: 12,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 12,
    },
    tagsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tagButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    tagButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    textInput: {
        minHeight: 200,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 15,
        lineHeight: 22,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
    },
    saveButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
    },
    deleteButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
