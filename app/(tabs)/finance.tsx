import { useColorScheme } from '@/components/useColorScheme';
import { PasswordPrompt } from '@/src/components';
import { FinanceCategory, Transaction, TransactionType } from '@/src/models';
import * as authService from '@/src/services/authService';
import {
    formatCurrency,
    getAllTransactions,
    getDailyBudgetStatus,
    getFinanceCategories,
    getTodaySummary,
    getTotalBalance,
    initDefaultFinanceCategories
} from '@/src/services/financeService';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function FinanceScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [biometricName, setBiometricName] = useState('Biometric');
    
    // Data state
    const [balance, setBalance] = useState(0);
    const [todayIncome, setTodayIncome] = useState(0);
    const [todayExpense, setTodayExpense] = useState(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [dailyBudget, setDailyBudget] = useState<{
        budget: number;
        spent: number;
        remaining: number;
        status: 'under' | 'warning' | 'over';
    } | null>(null);
    
    // Filter state
    const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
    const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
    const [categories, setCategories] = useState<FinanceCategory[]>([]);

    const checkAuth = async () => {
        const preferredMethod = await authService.getPreferredAuthMethod();
        
        if (preferredMethod === 'none') {
            // No auth required, prompt to setup
            setIsAuthenticated(true);
            return;
        }
        
        if (preferredMethod === 'biometric') {
            const bioName = await authService.getBiometricType();
            setBiometricName(bioName);
            await authenticateWithBiometric();
        } else {
            setShowPasswordPrompt(true);
        }
    };

    const authenticateWithBiometric = async () => {
        setIsAuthenticating(true);
        const result = await authService.authenticateWithBiometric();
        setIsAuthenticating(false);
        
        if (result.success) {
            setIsAuthenticated(true);
        } else if (result.error !== 'Dibatalkan') {
            // Try password fallback
            const hasPass = await authService.hasFinancePassword();
            if (hasPass) {
                setShowPasswordPrompt(true);
            } else {
                Alert.alert('Autentikasi Gagal', result.error || 'Coba lagi');
            }
        }
    };

    const handlePasswordSubmit = async (password: string): Promise<boolean> => {
        const valid = await authService.verifyFinancePassword(password);
        if (valid) {
            setIsAuthenticated(true);
            return true;
        }
        return false;
    };

    const loadData = async () => {
        try {
            setLoading(true);
            await initDefaultFinanceCategories();
            
            const [bal, today, txns, budgetStatus, cats] = await Promise.all([
                getTotalBalance(),
                getTodaySummary(),
                getAllTransactions(50),
                getDailyBudgetStatus(),
                getFinanceCategories()
            ]);

            setBalance(bal);
            setTodayIncome(today.income);
            setTodayExpense(today.expense);
            setTransactions(txns);
            setDailyBudget(budgetStatus);
            setCategories(cats);
        } catch (error) {
            console.error('Error loading finance data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter transactions
    const filteredTransactions = transactions.filter(t => {
        // Filter by type
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        // Filter by category
        if (filterCategoryId !== null && t.category_id !== filterCategoryId) return false;
        return true;
    });

    useFocusEffect(
        useCallback(() => {
            if (!isAuthenticated) {
                checkAuth();
            } else {
                loadData();
            }
        }, [isAuthenticated])
    );

    // Lock Screen
    if (!isAuthenticated) {
        return (
            <View style={[styles.lockContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.lockCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.lockIconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="lock-closed" size={48} color={colors.primary} />
                    </View>
                    <Text style={[styles.lockTitle, { color: colors.textPrimary }]}>
                        Keuangan Terkunci
                    </Text>
                    <Text style={[styles.lockSubtitle, { color: colors.textMuted }]}>
                        Verifikasi identitas untuk mengakses data keuangan
                    </Text>
                    
                    <TouchableOpacity
                        style={[styles.unlockButton, { backgroundColor: colors.primary }]}
                        onPress={checkAuth}
                        disabled={isAuthenticating}
                    >
                        <Ionicons 
                            name="finger-print" 
                            size={22} 
                            color={colors.textInverse} 
                        />
                        <Text style={[styles.unlockButtonText, { color: colors.textInverse }]}>
                            {isAuthenticating ? 'Memverifikasi...' : `Buka dengan ${biometricName}`}
                        </Text>
                    </TouchableOpacity>
                </View>
                
                <PasswordPrompt
                    visible={showPasswordPrompt}
                    onClose={() => setShowPasswordPrompt(false)}
                    onSubmit={handlePasswordSubmit}
                    title="Masukkan Sandi Keuangan"
                />
            </View>
        );
    }

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

            {/* Daily Budget Warning */}
            {dailyBudget && dailyBudget.status !== 'under' && (
                <View style={[
                    styles.budgetWarning,
                    { backgroundColor: dailyBudget.status === 'over' ? colors.danger + '15' : colors.warning + '15' }
                ]}>
                    <Ionicons 
                        name={dailyBudget.status === 'over' ? 'warning' : 'alert-circle'} 
                        size={20} 
                        color={dailyBudget.status === 'over' ? colors.danger : colors.warning} 
                    />
                    <Text style={[
                        styles.budgetWarningText,
                        { color: dailyBudget.status === 'over' ? colors.danger : colors.warning }
                    ]}>
                        {dailyBudget.status === 'over' 
                            ? `Budget harian terlampaui ${formatCurrency(Math.abs(dailyBudget.remaining))}!`
                            : `Mendekati limit: sisa ${formatCurrency(dailyBudget.remaining)}`
                        }
                    </Text>
                </View>
            )}

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
                <TouchableOpacity onPress={() => router.push('/finance/categories' as any)}>
                    <Text style={[styles.manageLink, { color: colors.primary }]}>
                        Kelola Kategori
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}
            >
                <TouchableOpacity
                    style={[
                        styles.filterChip,
                        { 
                            backgroundColor: filterType === 'ALL' && filterCategoryId === null
                                ? colors.primary 
                                : colors.surfaceVariant 
                        }
                    ]}
                    onPress={() => { setFilterType('ALL'); setFilterCategoryId(null); }}
                >
                    <Text style={[
                        styles.filterChipText,
                        { color: filterType === 'ALL' && filterCategoryId === null ? '#FFFFFF' : colors.textSecondary }
                    ]}>
                        Semua
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterChip,
                        { 
                            backgroundColor: filterType === 'INCOME' && filterCategoryId === null
                                ? '#10B981' 
                                : colors.surfaceVariant 
                        }
                    ]}
                    onPress={() => { setFilterType('INCOME'); setFilterCategoryId(null); }}
                >
                    <Text style={[
                        styles.filterChipText,
                        { color: filterType === 'INCOME' && filterCategoryId === null ? '#FFFFFF' : colors.textSecondary }
                    ]}>
                        💰 Pemasukan
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterChip,
                        { 
                            backgroundColor: filterType === 'EXPENSE' && filterCategoryId === null
                                ? '#EF4444' 
                                : colors.surfaceVariant 
                        }
                    ]}
                    onPress={() => { setFilterType('EXPENSE'); setFilterCategoryId(null); }}
                >
                    <Text style={[
                        styles.filterChipText,
                        { color: filterType === 'EXPENSE' && filterCategoryId === null ? '#FFFFFF' : colors.textSecondary }
                    ]}>
                        💸 Pengeluaran
                    </Text>
                </TouchableOpacity>

                {/* Category filters */}
                {categories.map(cat => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.filterChip,
                            { 
                                backgroundColor: filterCategoryId === cat.id
                                    ? cat.color 
                                    : colors.surfaceVariant 
                            }
                        ]}
                        onPress={() => { setFilterType('ALL'); setFilterCategoryId(cat.id); }}
                    >
                        <Text style={[
                            styles.filterChipText,
                            { color: filterCategoryId === cat.id ? '#FFFFFF' : colors.textSecondary }
                        ]}>
                            {cat.icon} {cat.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <FlatList
                data={filteredTransactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderTransaction}
                contentContainerStyle={filteredTransactions.length === 0 ? styles.emptyContainer : styles.listContainer}
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
    lockContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    lockCard: {
        width: '100%',
        padding: 32,
        borderRadius: 20,
        alignItems: 'center',
    },
    lockIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    lockTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    lockSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    unlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    unlockButtonText: {
        fontSize: 16,
        fontWeight: '600',
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
    budgetWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderRadius: 10,
    },
    budgetWarningText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    manageLink: {
        fontSize: 13,
        fontWeight: '500',
    },
    filterContainer: {
        marginBottom: 12,
    },
    filterContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
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
