import { useColorScheme } from '@/components/useColorScheme';
import { MonthlyReport } from '@/src/models';
import {
    formatCurrency,
    getMonthlyReport,
    upsertMonthlyBudget
} from '@/src/services/financeService';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
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

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function FinanceReportScreen() {
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [loading, setLoading] = useState(true);

    // Budget inputs
    const [plannedIncome, setPlannedIncome] = useState('');
    const [plannedExpense, setPlannedExpense] = useState('');
    const [showBudgetForm, setShowBudgetForm] = useState(false);

    useEffect(() => {
        loadReport();
    }, [year, month]);

    const loadReport = async () => {
        try {
            setLoading(true);
            const data = await getMonthlyReport(year, month);
            setReport(data);

            // Set budget inputs if exists
            if (data.budget) {
                setPlannedIncome(data.budget.planned_income.toString());
                setPlannedExpense(data.budget.planned_expense.toString());
            } else {
                setPlannedIncome('');
                setPlannedExpense('');
            }
        } catch (error) {
            console.error('Error loading report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    };

    const handleSaveBudget = async () => {
        const incomeVal = parseInt(plannedIncome.replace(/[^0-9]/g, ''), 10) || 0;
        const expenseVal = parseInt(plannedExpense.replace(/[^0-9]/g, ''), 10) || 0;

        try {
            await upsertMonthlyBudget({
                year,
                month,
                planned_income: incomeVal,
                planned_expense: expenseVal
            });
            setShowBudgetForm(false);
            loadReport();
            Alert.alert('Sukses', 'Budget berhasil disimpan');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Gagal menyimpan budget');
        }
    };

    const formatBudgetInput = (value: string): string => {
        const numericValue = value.replace(/[^0-9]/g, '');
        if (!numericValue) return '';
        return new Intl.NumberFormat('id-ID').format(parseInt(numericValue, 10));
    };

    if (loading || !report) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <Text style={{ color: colors.textMuted }}>Memuat...</Text>
            </View>
        );
    }

    const budgetProgress = report.budget ? {
        incomePercent: report.budget.planned_income > 0
            ? Math.min(100, (report.total_income / report.budget.planned_income) * 100)
            : 0,
        expensePercent: report.budget.planned_expense > 0
            ? Math.min(100, (report.total_expense / report.budget.planned_expense) * 100)
            : 0,
    } : null;

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Month Selector */}
            <View style={[styles.monthSelector, { backgroundColor: colors.surface }]}>
                <TouchableOpacity onPress={handlePrevMonth}>
                    <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.monthText, { color: colors.textPrimary }]}>
                    {MONTHS[month - 1]} {year}
                </Text>
                <TouchableOpacity onPress={handleNextMonth}>
                    <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryCards}>
                <View style={[styles.summaryCard, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="arrow-up-circle" size={24} color="#10B981" />
                    <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Pemasukan</Text>
                    <Text style={[styles.summaryAmount, { color: '#10B981' }]}>
                        {formatCurrency(report.total_income)}
                    </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#EF444420' }]}>
                    <Ionicons name="arrow-down-circle" size={24} color="#EF4444" />
                    <Text style={[styles.summaryLabel, { color: '#EF4444' }]}>Pengeluaran</Text>
                    <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>
                        {formatCurrency(report.total_expense)}
                    </Text>
                </View>
            </View>

            {/* Balance */}
            <View style={[styles.balanceCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Selisih Bulan Ini</Text>
                <Text style={[
                    styles.balanceAmount,
                    { color: report.balance >= 0 ? '#10B981' : '#EF4444' }
                ]}>
                    {report.balance >= 0 ? '+' : ''}{formatCurrency(report.balance)}
                </Text>
            </View>

            {/* Budget Section */}
            <View style={[styles.budgetSection, { backgroundColor: colors.surface }]}>
                <View style={styles.budgetHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        💼 Budget Bulanan
                    </Text>
                    <TouchableOpacity onPress={() => setShowBudgetForm(!showBudgetForm)}>
                        <Ionicons
                            name={showBudgetForm ? 'close' : 'create-outline'}
                            size={20}
                            color={colors.primary}
                        />
                    </TouchableOpacity>
                </View>

                {showBudgetForm ? (
                    <View style={styles.budgetForm}>
                        <View style={styles.budgetInputRow}>
                            <Text style={[styles.budgetInputLabel, { color: colors.textSecondary }]}>
                                Target Pemasukan
                            </Text>
                            <View style={[styles.budgetInputContainer, { backgroundColor: colors.surfaceVariant }]}>
                                <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>Rp</Text>
                                <TextInput
                                    style={[styles.budgetInput, { color: colors.textPrimary }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textMuted}
                                    value={formatBudgetInput(plannedIncome)}
                                    onChangeText={setPlannedIncome}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        <View style={styles.budgetInputRow}>
                            <Text style={[styles.budgetInputLabel, { color: colors.textSecondary }]}>
                                Batas Pengeluaran
                            </Text>
                            <View style={[styles.budgetInputContainer, { backgroundColor: colors.surfaceVariant }]}>
                                <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>Rp</Text>
                                <TextInput
                                    style={[styles.budgetInput, { color: colors.textPrimary }]}
                                    placeholder="0"
                                    placeholderTextColor={colors.textMuted}
                                    value={formatBudgetInput(plannedExpense)}
                                    onChangeText={setPlannedExpense}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.saveBudgetBtn, { backgroundColor: colors.primary }]}
                            onPress={handleSaveBudget}
                        >
                            <Text style={styles.saveBudgetText}>Simpan Budget</Text>
                        </TouchableOpacity>
                    </View>
                ) : report.budget ? (
                    <View>
                        {/* Income Progress */}
                        <View style={styles.progressItem}>
                            <View style={styles.progressHeader}>
                                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                                    Pemasukan
                                </Text>
                                <Text style={[styles.progressValue, { color: colors.textPrimary }]}>
                                    {formatCurrency(report.total_income)} / {formatCurrency(report.budget.planned_income)}
                                </Text>
                            </View>
                            <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${budgetProgress?.incomePercent || 0}%`, backgroundColor: '#10B981' }
                                    ]}
                                />
                            </View>
                        </View>

                        {/* Expense Progress */}
                        <View style={styles.progressItem}>
                            <View style={styles.progressHeader}>
                                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                                    Pengeluaran
                                </Text>
                                <Text style={[styles.progressValue, { color: colors.textPrimary }]}>
                                    {formatCurrency(report.total_expense)} / {formatCurrency(report.budget.planned_expense)}
                                </Text>
                            </View>
                            <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${budgetProgress?.expensePercent || 0}%`,
                                            backgroundColor: (budgetProgress?.expensePercent || 0) > 100 ? '#EF4444' : '#F59E0B'
                                        }
                                    ]}
                                />
                            </View>
                        </View>
                    </View>
                ) : (
                    <Text style={[styles.noBudget, { color: colors.textMuted }]}>
                        Belum ada budget untuk bulan ini. Tap ikon edit untuk menambahkan.
                    </Text>
                )}
            </View>

            {/* Daily Breakdown */}
            {report.daily_breakdown.length > 0 && (
                <View style={[styles.dailySection, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        📅 Ringkasan Harian
                    </Text>
                    {report.daily_breakdown.map(day => (
                        <View key={day.date} style={[styles.dailyRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.dailyDate, { color: colors.textSecondary }]}>
                                {new Date(day.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </Text>
                            <View style={styles.dailyAmounts}>
                                {day.income > 0 && (
                                    <Text style={[styles.dailyIncome, { color: '#10B981' }]}>
                                        +{formatCurrency(day.income)}
                                    </Text>
                                )}
                                {day.expense > 0 && (
                                    <Text style={[styles.dailyExpense, { color: '#EF4444' }]}>
                                        -{formatCurrency(day.expense)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
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
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: 16,
        padding: 16,
        borderRadius: 12,
    },
    monthText: {
        fontSize: 18,
        fontWeight: '600',
    },
    summaryCards: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        marginTop: 8,
    },
    summaryAmount: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 4,
    },
    balanceCard: {
        margin: 16,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 14,
    },
    balanceAmount: {
        fontSize: 28,
        fontWeight: '700',
        marginTop: 4,
    },
    budgetSection: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    budgetForm: {
        gap: 12,
    },
    budgetInputRow: {
        gap: 6,
    },
    budgetInputLabel: {
        fontSize: 13,
    },
    budgetInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    currencyPrefix: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 6,
    },
    budgetInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        paddingVertical: 10,
    },
    saveBudgetBtn: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    saveBudgetText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    noBudget: {
        fontSize: 13,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    progressItem: {
        marginBottom: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 13,
    },
    progressValue: {
        fontSize: 12,
        fontWeight: '500',
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    dailySection: {
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 12,
    },
    dailyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    dailyDate: {
        fontSize: 14,
    },
    dailyAmounts: {
        alignItems: 'flex-end',
    },
    dailyIncome: {
        fontSize: 13,
        fontWeight: '500',
    },
    dailyExpense: {
        fontSize: 13,
        fontWeight: '500',
    },
});
