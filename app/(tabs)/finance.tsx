import { useColorScheme } from '@/components/useColorScheme';
import { Transaction, TransactionType } from '@/src/models';
import {
    formatCurrency,
    getAllTransactions,
    getTodaySummary,
    getTotalBalance,
    initDefaultFinanceCategories
} from '@/src/services/financeService';
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

export default function FinanceScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const [balance, setBalance] = useState(0);
    const [todayIncome, setTodayIncome] = useState(0);
    const [todayExpense, setTodayExpense] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            await initDefaultFinanceCategories();
            
            const [bal, today, txns] = await Promise.all([
                getTotalBalance(),
                getTodaySummary(),
                getAllTransactions(20)
            ]);

            setBalance(bal);
            setTodayIncome(today.income);
            setTodayExpense(today.expense);
            setTransactions(txns);
        } catch (error) {
            console.error('Error loading finance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const getTransactionIcon = (type: TransactionType, categoryIcon?: string) => {
        if (categoryIcon) return categoryIcon;
        return type === 'INCOME' ? '💰' : '💸';
    };

    const renderTransaction = ({ item }: { item: Transaction }) => (
        <TouchableOpacity
            style={[styles.transactionItem, { backgroundColor: colors.surface }]}
            onPress={() => router.push(`/finance/${item.id}` as any)}
        >
            <View style={styles.transactionIcon}>
                <Text style={styles.iconText}>
                    {getTransactionIcon(item.type, item.category_icon)}
                </Text>
            </View>
            <View style={styles.transactionInfo}>
                <Text style={[styles.transactionDesc, { color: colors.textPrimary }]}>
                    {item.description || item.category_name || (item.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran')}
                </Text>
                <Text style={[styles.transactionCategory, { color: colors.textMuted }]}>
                    {item.category_name || 'Tanpa Kategori'}
                </Text>
            </View>
            <Text style={[
                styles.transactionAmount,
                { color: item.type === 'INCOME' ? colors.success : colors.danger }
            ]}>
                {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount)}
            </Text>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Belum Ada Transaksi
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Mulai catat keuanganmu hari ini
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Balance Card */}
            <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
                <Text style={styles.balanceLabel}>Saldo Saat Ini</Text>
                <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
                
                <View style={styles.todaySummary}>
                    <View style={styles.todayItem}>
                        <Ionicons name="arrow-up-circle" size={20} color="#10B981" />
                        <Text style={styles.todayLabel}>Hari Ini</Text>
                        <Text style={[styles.todayAmount, { color: '#10B981' }]}>
                            +{formatCurrency(todayIncome)}
                        </Text>
                    </View>
                    <View style={styles.todayDivider} />
                    <View style={styles.todayItem}>
                        <Ionicons name="arrow-down-circle" size={20} color="#EF4444" />
                        <Text style={styles.todayLabel}>Hari Ini</Text>
                        <Text style={[styles.todayAmount, { color: '#EF4444' }]}>
                            -{formatCurrency(todayExpense)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                    onPress={() => router.push('/finance/new?type=INCOME' as any)}
                >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Pemasukan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => router.push('/finance/new?type=EXPENSE' as any)}
                >
                    <Ionicons name="remove" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Pengeluaran</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.info }]}
                    onPress={() => router.push('/finance/report' as any)}
                >
                    <Ionicons name="bar-chart" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Laporan</Text>
                </TouchableOpacity>
            </View>

            {/* Recent Transactions */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Transaksi Terbaru
                </Text>
            </View>

            <FlatList
                data={transactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderTransaction}
                contentContainerStyle={transactions.length === 0 ? styles.emptyContainer : styles.listContainer}
                ListEmptyComponent={!loading ? renderEmptyState : null}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    balanceCard: {
        margin: 16,
        padding: 20,
        borderRadius: 16,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
    },
    balanceAmount: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '700',
        marginTop: 4,
    },
    todaySummary: {
        flexDirection: 'row',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    todayItem: {
        flex: 1,
        alignItems: 'center',
    },
    todayDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    todayLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 4,
    },
    todayAmount: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 2,
    },
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    sectionHeader: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 20,
    },
    transactionInfo: {
        flex: 1,
        marginLeft: 12,
    },
    transactionDesc: {
        fontSize: 14,
        fontWeight: '500',
    },
    transactionCategory: {
        fontSize: 12,
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 14,
        fontWeight: '600',
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
        marginTop: 8,
    },
});
