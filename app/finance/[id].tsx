import { useColorScheme } from '@/components/useColorScheme';
import { Transaction } from '@/src/models';
import {
    deleteTransaction,
    formatCurrency,
    getAllTransactions
} from '@/src/services/financeService';
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

export default function TransactionDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTransaction();
    }, [id]);

    const loadTransaction = async () => {
        try {
            setLoading(true);
            // Get all transactions and find the one with matching id
            const transactions = await getAllTransactions(1000);
            const found = transactions.find(t => t.id === parseInt(id, 10));
            setTransaction(found || null);
        } catch (error) {
            console.error('Error loading transaction:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Hapus Transaksi',
            'Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTransaction(parseInt(id, 10));
                            Alert.alert('Sukses', 'Transaksi berhasil dihapus', [
                                { text: 'OK', onPress: () => router.back() }
                            ]);
                        } catch (error) {
                            Alert.alert('Error', 'Gagal menghapus transaksi');
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

    if (!transaction) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
                <Text style={[styles.notFoundText, { color: colors.textPrimary }]}>
                    Transaksi Tidak Ditemukan
                </Text>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>Kembali</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isIncome = transaction.type === 'INCOME';
    const typeColor = isIncome ? '#10B981' : '#EF4444';
    const typeLabel = isIncome ? 'Pemasukan' : 'Pengeluaran';
    const typeIcon = isIncome ? 'arrow-up-circle' : 'arrow-down-circle';

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: typeColor }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detail Transaksi</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Amount Card */}
                <View style={[styles.amountCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.typeIcon, { backgroundColor: typeColor + '20' }]}>
                        <Text style={styles.categoryIcon}>
                            {transaction.category_icon || (isIncome ? '💰' : '💸')}
                        </Text>
                    </View>
                    <Text style={[styles.amount, { color: typeColor }]}>
                        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Text>
                    <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                        <Ionicons name={typeIcon} size={14} color={typeColor} />
                        <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
                    </View>
                </View>

                {/* Details */}
                <View style={[styles.detailsCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.detailIcon}>
                            <Ionicons name="folder-outline" size={20} color={colors.textMuted} />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Kategori</Text>
                            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                                {transaction.category_name || 'Tanpa Kategori'}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.detailIcon}>
                            <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Tanggal</Text>
                            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                                {formatTanggalWaktu(transaction.date + 'T00:00:00')}
                            </Text>
                        </View>
                    </View>

                    {transaction.description ? (
                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Deskripsi</Text>
                                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                                    {transaction.description}
                                </Text>
                            </View>
                        </View>
                    ) : null}
                </View>

                {/* Created At */}
                <Text style={[styles.createdAt, { color: colors.textMuted }]}>
                    Dibuat: {formatTanggalWaktu(transaction.created_at)}
                </Text>
            </ScrollView>

            {/* Delete Button */}
            <View style={[styles.footer, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: colors.danger + '15' }]}
                    onPress={handleDelete}
                >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                        Hapus Transaksi
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    headerBack: {
        padding: 8,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    amountCard: {
        alignItems: 'center',
        padding: 24,
        borderRadius: 16,
        marginBottom: 16,
    },
    typeIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    categoryIcon: {
        fontSize: 32,
    },
    amount: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 12,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    typeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    detailsCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    detailIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '500',
    },
    createdAt: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 16,
    },
    footer: {
        padding: 16,
        paddingBottom: 32,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 12,
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    notFoundText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 24,
    },
    backButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
