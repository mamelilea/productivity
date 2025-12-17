import { useColorScheme } from '@/components/useColorScheme';
import { LogbookEntry, LogbookTag, TAG_COLORS, TAG_LABELS } from '@/src/models';
import { getAllLogbookEntries, getTodayDate } from '@/src/services/logbookService';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function LogbookScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const [entries, setEntries] = useState<LogbookEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const data = await getAllLogbookEntries();
            setEntries(data);
        } catch (error) {
            console.error('Error loading logbook entries:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadEntries();
        }, [])
    );

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const dateOnly = dateStr.split('T')[0];
        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (dateOnly === todayStr) return 'Hari Ini';
        if (dateOnly === yesterdayStr) return 'Kemarin';

        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };
        return date.toLocaleDateString('id-ID', options);
    };

    const renderTag = (tag: LogbookTag) => (
        <View
            key={tag}
            style={[styles.tag, { backgroundColor: TAG_COLORS[tag] + '20' }]}
        >
            <Text style={[styles.tagText, { color: TAG_COLORS[tag] }]}>
                {TAG_LABELS[tag]}
            </Text>
        </View>
    );

    const renderEntry = ({ item }: { item: LogbookEntry }) => (
        <TouchableOpacity
            style={[styles.entryCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push(`/logbook/${item.date}` as any)}
            activeOpacity={0.7}
        >
            <View style={styles.entryHeader}>
                <Text style={[styles.entryDate, { color: colors.textPrimary }]}>
                    {formatDate(item.date)}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>

            {item.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                    {item.tags.map(renderTag)}
                </View>
            )}

            <Text
                style={[styles.entryPreview, { color: colors.textSecondary }]}
                numberOfLines={2}
            >
                {item.content || 'Tidak ada catatan...'}
            </Text>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Belum Ada Logbook
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Mulai catat aktivitas harianmu untuk melacak progress kerja
            </Text>
            <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/logbook/${getTodayDate()}` as any)}
            >
                <Text style={[styles.emptyButtonText, { color: colors.textInverse }]}>
                    Tulis Aktivitas Hari Ini
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Info */}
            <View style={[styles.headerInfo, { backgroundColor: colors.surface }]}>
                <Ionicons name="book" size={24} color={colors.primary} />
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        Logbook Harian
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                        Catat aktivitas untuk laporan progress
                    </Text>
                </View>
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
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/logbook/${getTodayDate()}` as any)}
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={28} color={colors.textInverse} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 12,
        gap: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
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
        fontSize: 16,
        fontWeight: '600',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    entryPreview: {
        fontSize: 14,
        lineHeight: 20,
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
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        marginHorizontal: 32,
    },
    emptyButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyButtonText: {
        fontSize: 14,
        fontWeight: '600',
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
