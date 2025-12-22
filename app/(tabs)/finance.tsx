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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function FinanceScreen() {
    const router = useRouter();
    const navigation = useNavigation();
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
    
    // Date filter state
    type DateFilterType = 'all' | 'today' | '7days' | '30days' | '90days' | 'custom';
    const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
    const [showDateModal, setShowDateModal] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
    const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Check if any modal is open and hide tab bar
    const isAnyModalOpen = showDateModal || showTypeModal || showCategoryModal;
    
    useEffect(() => {
        navigation.setOptions({
            tabBarStyle: isAnyModalOpen ? { display: 'none' } : undefined,
        });
    }, [isAnyModalOpen, navigation]);

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

    // Helper to get date range based on filter
    const getDateRange = (): { start: Date; end: Date } | null => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        
        switch (dateFilter) {
            case 'all':
                return null; // No date filter
            case 'today':
                return { start: today, end };
            case '7days':
                const start7 = new Date(today);
                start7.setDate(start7.getDate() - 6);
                return { start: start7, end };
            case '30days':
                const start30 = new Date(today);
                start30.setDate(start30.getDate() - 29);
                return { start: start30, end };
            case '90days':
                const start90 = new Date(today);
                start90.setDate(start90.getDate() - 89);
                return { start: start90, end };
            case 'custom':
                const customEnd = new Date(customEndDate);
                customEnd.setHours(23, 59, 59, 999);
                return { start: customStartDate, end: customEnd };
            default:
                return null;
        }
    };

    // Filter transactions
    const filteredTransactions = transactions.filter(t => {
        // Filter by type
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        // Filter by category
        if (filterCategoryId !== null && t.category_id !== filterCategoryId) return false;
        // Filter by date
        const dateRange = getDateRange();
        if (dateRange) {
            const txDate = new Date(t.date);
            if (txDate < dateRange.start || txDate > dateRange.end) return false;
        }
        return true;
    });
    
    // Group transactions by date
    const groupedTransactions = filteredTransactions.reduce((groups: { [key: string]: Transaction[] }, t) => {
        const dateKey = t.date.split('T')[0]; // YYYY-MM-DD
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(t);
        return groups;
    }, {});
    
    // Convert to array and sort by date descending
    const transactionSections = Object.keys(groupedTransactions)
        .sort((a, b) => b.localeCompare(a))
        .map(dateKey => ({
            date: dateKey,
            data: groupedTransactions[dateKey]
        }));
    
    // Format date for section header
    const formatDateHeader = (dateStr: string): string => {
        const date = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dateOnly = dateStr;
        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (dateOnly === todayStr) return 'Hari Ini';
        if (dateOnly === yesterdayStr) return 'Kemarin';
        
        return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    };

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

            {/* Compact Filter Buttons */}
            <View style={styles.filterButtonRow}>
                {/* Date Filter */}
                <TouchableOpacity
                    style={[styles.filterButton, { backgroundColor: dateFilter !== 'all' ? colors.primary : colors.surfaceVariant }]}
                    onPress={() => setShowDateModal(true)}
                >
                    <Text style={[styles.filterButtonText, { color: dateFilter !== 'all' ? '#FFFFFF' : colors.textSecondary }]}>
                        {dateFilter === 'all' ? 'Tanggal' : 
                         dateFilter === 'today' ? 'Hari Ini' :
                         dateFilter === '7days' ? '7 Hari' :
                         dateFilter === '30days' ? '30 Hari' :
                         dateFilter === '90days' ? '90 Hari' : 'Custom'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={dateFilter !== 'all' ? '#FFFFFF' : colors.textSecondary} />
                </TouchableOpacity>

                {/* Type Filter */}
                <TouchableOpacity
                    style={[styles.filterButton, { backgroundColor: filterType !== 'ALL' ? colors.primary : colors.surfaceVariant }]}
                    onPress={() => setShowTypeModal(true)}
                >
                    <Text style={[styles.filterButtonText, { color: filterType !== 'ALL' ? '#FFFFFF' : colors.textSecondary }]}>
                        {filterType === 'ALL' ? 'Tipe' : filterType === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={filterType !== 'ALL' ? '#FFFFFF' : colors.textSecondary} />
                </TouchableOpacity>

                {/* Category Filter */}
                <TouchableOpacity
                    style={[styles.filterButton, { backgroundColor: filterCategoryId !== null ? colors.primary : colors.surfaceVariant }]}
                    onPress={() => setShowCategoryModal(true)}
                >
                    <Text style={[styles.filterButtonText, { color: filterCategoryId !== null ? '#FFFFFF' : colors.textSecondary }]}>
                        {filterCategoryId !== null ? categories.find(c => c.id === filterCategoryId)?.name || 'Kategori' : 'Kategori'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={filterCategoryId !== null ? '#FFFFFF' : colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Date Filter Modal */}
            <Modal visible={showDateModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pilih Tanggal</Text>
                            <TouchableOpacity onPress={() => setShowDateModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        
                        {[
                            { key: 'all', label: 'Semua Waktu' },
                            { key: 'today', label: 'Hari Ini' },
                            { key: '7days', label: '7 Hari Terakhir' },
                            { key: '30days', label: '30 Hari Terakhir' },
                            { key: '90days', label: '90 Hari Terakhir' },
                        ].map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.modalOption, dateFilter === opt.key && { backgroundColor: colors.primary + '20' }]}
                                onPress={() => { setDateFilter(opt.key as any); setShowDateModal(false); }}
                            >
                                <Text style={[styles.modalOptionText, { color: dateFilter === opt.key ? colors.primary : colors.textPrimary }]}>
                                    {opt.label}
                                </Text>
                                {dateFilter === opt.key && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                        
                        {/* Custom Date Range */}
                        <View style={styles.customDateSection}>
                            <Text style={[styles.customDateLabel, { color: colors.textPrimary }]}>Atur Tanggal</Text>
                            <View style={styles.customDateRow}>
                                <TouchableOpacity 
                                    style={[styles.datePickerBtn, { backgroundColor: colors.surfaceVariant }]}
                                    onPress={() => setShowStartPicker(true)}
                                >
                                    <Text style={{ color: colors.textPrimary }}>
                                        Dari: {customStartDate.toLocaleDateString('id-ID')}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.datePickerBtn, { backgroundColor: colors.surfaceVariant }]}
                                    onPress={() => setShowEndPicker(true)}
                                >
                                    <Text style={{ color: colors.textPrimary }}>
                                        Sampai: {customEndDate.toLocaleDateString('id-ID')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={[styles.applyCustomBtn, { backgroundColor: colors.primary }]}
                                onPress={() => { setDateFilter('custom'); setShowDateModal(false); }}
                            >
                                <Text style={styles.applyCustomBtnText}>Terapkan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Type Filter Modal */}
            <Modal visible={showTypeModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pilih Tipe</Text>
                            <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        
                        {[
                            { key: 'ALL', label: 'Semua', icon: '📊' },
                            { key: 'INCOME', label: 'Pemasukan', icon: '💰' },
                            { key: 'EXPENSE', label: 'Pengeluaran', icon: '💸' },
                        ].map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.modalOption, filterType === opt.key && { backgroundColor: colors.primary + '20' }]}
                                onPress={() => { setFilterType(opt.key as any); setShowTypeModal(false); }}
                            >
                                <Text style={[styles.modalOptionText, { color: filterType === opt.key ? colors.primary : colors.textPrimary }]}>
                                    {opt.icon} {opt.label}
                                </Text>
                                {filterType === opt.key && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            {/* Category Filter Modal */}
            <Modal visible={showCategoryModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pilih Kategori</Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[styles.modalOption, filterCategoryId === null && { backgroundColor: colors.primary + '20' }]}
                                onPress={() => { setFilterCategoryId(null); setShowCategoryModal(false); }}
                            >
                                <Text style={[styles.modalOptionText, { color: filterCategoryId === null ? colors.primary : colors.textPrimary }]}>
                                    📊 Semua Kategori
                                </Text>
                                {filterCategoryId === null && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                            </TouchableOpacity>
                            
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.modalOption, filterCategoryId === cat.id && { backgroundColor: colors.primary + '20' }]}
                                    onPress={() => { setFilterCategoryId(cat.id); setShowCategoryModal(false); }}
                                >
                                    <Text style={[styles.modalOptionText, { color: filterCategoryId === cat.id ? colors.primary : colors.textPrimary }]}>
                                        {cat.icon} {cat.name}
                                    </Text>
                                    {filterCategoryId === cat.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Date Pickers for Custom Range */}
            {showStartPicker && (
                <DateTimePicker
                    value={customStartDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, date) => {
                        setShowStartPicker(false);
                        if (date) setCustomStartDate(date);
                    }}
                />
            )}
            {showEndPicker && (
                <DateTimePicker
                    value={customEndDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, date) => {
                        setShowEndPicker(false);
                        if (date) setCustomEndDate(date);
                    }}
                />
            )}

            {/* Transactions List with Date Sections */}
            <ScrollView 
                style={styles.transactionsList}
                showsVerticalScrollIndicator={false}
            >
                {transactionSections.length === 0 && !loading ? (
                    renderEmptyState()
                ) : (
                    transactionSections.map((section) => (
                        <View key={section.date}>
                            {/* Date Header */}
                            <View style={[styles.dateHeader, { backgroundColor: colors.surfaceVariant }]}>
                                <Text style={[styles.dateHeaderText, { color: colors.textPrimary }]}>
                                    {formatDateHeader(section.date)}
                                </Text>
                            </View>
                            
                            {/* Transactions for this date */}
                            {section.data.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
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
                            ))}
                        </View>
                    ))
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
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
    transactionsList: {
        flex: 1,
    },
    dateHeader: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginTop: 8,
    },
    dateHeaderText: {
        fontSize: 14,
        fontWeight: '600',
    },
    filterButtonRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    filterButtonText: {
        fontSize: 13,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 9999,
        elevation: 9999,
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 24,
        maxHeight: '70%',
        zIndex: 10000,
        elevation: 10000,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 10,
        marginBottom: 4,
    },
    modalOptionText: {
        fontSize: 15,
    },
    customDateSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    customDateLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    customDateRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    datePickerBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    applyCustomBtn: {
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    applyCustomBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
