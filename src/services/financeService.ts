// Finance Service - CRUD dan report untuk keuangan
import { getDatabase } from '../db/database';
import {
    CategoryReport,
    CreateBudgetInput,
    CreateFinanceCategoryInput,
    CreateTransactionInput,
    DailyReport,
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_INCOME_CATEGORIES,
    FinanceCategory,
    MonthlyBudget,
    MonthlyReport,
    Transaction,
    TransactionType
} from '../models';

// =============================================
// CATEGORY FUNCTIONS
// =============================================

// Get all finance categories
export const getFinanceCategories = async (): Promise<FinanceCategory[]> => {
    const db = await getDatabase();
    return await db.getAllAsync<FinanceCategory>(
        'SELECT * FROM finance_categories ORDER BY type, name'
    );
};

// Get categories by type
export const getCategoriesByType = async (type: TransactionType): Promise<FinanceCategory[]> => {
    const db = await getDatabase();
    return await db.getAllAsync<FinanceCategory>(
        'SELECT * FROM finance_categories WHERE type = ? ORDER BY name',
        [type]
    );
};

// Create category
export const createFinanceCategory = async (input: CreateFinanceCategoryInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(
        'INSERT INTO finance_categories (name, type, icon, color) VALUES (?, ?, ?, ?)',
        [input.name, input.type, input.icon, input.color]
    );
    return result.lastInsertRowId;
};

// Delete category
export const deleteFinanceCategory = async (id: number): Promise<void> => {
    const db = await getDatabase();
    // Set transactions with this category to null
    await db.runAsync('UPDATE transactions SET category_id = NULL WHERE category_id = ?', [id]);
    await db.runAsync('DELETE FROM finance_categories WHERE id = ?', [id]);
};

// Initialize default categories if empty
export const initDefaultFinanceCategories = async (): Promise<void> => {
    const db = await getDatabase();
    const count = await db.getFirstAsync<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM finance_categories'
    );

    if (count && count.cnt === 0) {
        // Insert expense categories
        for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
            await db.runAsync(
                'INSERT INTO finance_categories (name, type, icon, color) VALUES (?, ?, ?, ?)',
                [cat.name, 'EXPENSE', cat.icon, cat.color]
            );
        }
        // Insert income categories
        for (const cat of DEFAULT_INCOME_CATEGORIES) {
            await db.runAsync(
                'INSERT INTO finance_categories (name, type, icon, color) VALUES (?, ?, ?, ?)',
                [cat.name, 'INCOME', cat.icon, cat.color]
            );
        }
    }
};

// =============================================
// TRANSACTION FUNCTIONS
// =============================================

// Get all transactions
export const getAllTransactions = async (limit: number = 50): Promise<Transaction[]> => {
    const db = await getDatabase();
    return await db.getAllAsync<Transaction>(`
        SELECT t.*, c.name as category_name, c.icon as category_icon
        FROM transactions t
        LEFT JOIN finance_categories c ON t.category_id = c.id
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ?
    `, [limit]);
};

// Get transactions by date
export const getTransactionsByDate = async (date: string): Promise<Transaction[]> => {
    const db = await getDatabase();
    return await db.getAllAsync<Transaction>(`
        SELECT t.*, c.name as category_name, c.icon as category_icon
        FROM transactions t
        LEFT JOIN finance_categories c ON t.category_id = c.id
        WHERE t.date = ?
        ORDER BY t.created_at DESC
    `, [date]);
};

// Get transactions by month
export const getTransactionsByMonth = async (year: number, month: number): Promise<Transaction[]> => {
    const db = await getDatabase();
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    return await db.getAllAsync<Transaction>(`
        SELECT t.*, c.name as category_name, c.icon as category_icon
        FROM transactions t
        LEFT JOIN finance_categories c ON t.category_id = c.id
        WHERE t.date BETWEEN ? AND ?
        ORDER BY t.date DESC, t.created_at DESC
    `, [startDate, endDate]);
};

// Create transaction
export const createTransaction = async (input: CreateTransactionInput): Promise<number> => {
    const db = await getDatabase();
    const result = await db.runAsync(`
        INSERT INTO transactions (type, amount, category_id, description, date)
        VALUES (?, ?, ?, ?, ?)
    `, [input.type, input.amount, input.category_id || null, input.description, input.date]);
    return result.lastInsertRowId;
};

// Update transaction
export const updateTransaction = async (id: number, input: CreateTransactionInput): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(`
        UPDATE transactions
        SET type = ?, amount = ?, category_id = ?, description = ?, date = ?
        WHERE id = ?
    `, [input.type, input.amount, input.category_id || null, input.description, input.date, id]);
};

// Delete transaction
export const deleteTransaction = async (id: number): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
};

// =============================================
// BUDGET FUNCTIONS
// =============================================

// Get budget for a month
export const getMonthlyBudget = async (year: number, month: number): Promise<MonthlyBudget | null> => {
    const db = await getDatabase();
    return await db.getFirstAsync<MonthlyBudget>(
        'SELECT * FROM monthly_budgets WHERE year = ? AND month = ?',
        [year, month]
    );
};

// Create or update budget
export const upsertMonthlyBudget = async (input: CreateBudgetInput): Promise<number> => {
    const db = await getDatabase();
    const existing = await getMonthlyBudget(input.year, input.month);
    const dailyBudget = input.daily_budget || 0;

    if (existing) {
        await db.runAsync(`
            UPDATE monthly_budgets
            SET planned_income = ?, planned_expense = ?, daily_budget = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ?
        `, [input.planned_income, input.planned_expense, dailyBudget, existing.id]);
        return existing.id;
    } else {
        const result = await db.runAsync(`
            INSERT INTO monthly_budgets (year, month, planned_income, planned_expense, daily_budget)
            VALUES (?, ?, ?, ?, ?)
        `, [input.year, input.month, input.planned_income, input.planned_expense, dailyBudget]);
        return result.lastInsertRowId;
    }
};

// =============================================
// REPORT FUNCTIONS
// =============================================

// Get total balance (all time)
export const getTotalBalance = async (): Promise<number> => {
    const db = await getDatabase();
    const income = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'INCOME'"
    );
    const expense = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'EXPENSE'"
    );

    return (income?.total || 0) - (expense?.total || 0);
};

// Get daily report
export const getDailyReport = async (date: string): Promise<DailyReport> => {
    const db = await getDatabase();
    const transactions = await getTransactionsByDate(date);

    const income = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date = ? AND type = 'INCOME'",
        [date]
    );
    const expense = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date = ? AND type = 'EXPENSE'",
        [date]
    );

    const totalIncome = income?.total || 0;
    const totalExpense = expense?.total || 0;

    return {
        date,
        total_income: totalIncome,
        total_expense: totalExpense,
        balance: totalIncome - totalExpense,
        transactions
    };
};

// Get monthly report
export const getMonthlyReport = async (year: number, month: number): Promise<MonthlyReport> => {
    const db = await getDatabase();
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    const income = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date BETWEEN ? AND ? AND type = 'INCOME'",
        [startDate, endDate]
    );
    const expense = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date BETWEEN ? AND ? AND type = 'EXPENSE'",
        [startDate, endDate]
    );

    const budget = await getMonthlyBudget(year, month);

    // Get daily breakdown
    const dailyData = await db.getAllAsync<{ date: string; type: string; total: number }>(`
        SELECT date, type, SUM(amount) as total
        FROM transactions
        WHERE date BETWEEN ? AND ?
        GROUP BY date, type
        ORDER BY date
    `, [startDate, endDate]);

    // Process daily breakdown
    const dailyMap = new Map<string, { income: number; expense: number }>();
    for (const row of dailyData) {
        const existing = dailyMap.get(row.date) || { income: 0, expense: 0 };
        if (row.type === 'INCOME') {
            existing.income = row.total;
        } else {
            existing.expense = row.total;
        }
        dailyMap.set(row.date, existing);
    }

    const daily_breakdown = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense
    }));

    const totalIncome = income?.total || 0;
    const totalExpense = expense?.total || 0;

    return {
        year,
        month,
        total_income: totalIncome,
        total_expense: totalExpense,
        balance: totalIncome - totalExpense,
        budget: budget || undefined,
        daily_breakdown
    };
};

// Get today's summary
export const getTodaySummary = async (): Promise<{ income: number; expense: number; balance: number }> => {
    const today = getTodayDate();
    const report = await getDailyReport(today);
    return {
        income: report.total_income,
        expense: report.total_expense,
        balance: report.balance
    };
};

// Helper: Get today's date
export const getTodayDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Format currency (Rupiah)
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// =============================================
// FILTER FUNCTIONS
// =============================================

// Get transactions by type (income/expense only)
export const getTransactionsByType = async (
    type: TransactionType,
    year: number,
    month: number
): Promise<Transaction[]> => {
    const db = await getDatabase();
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    return db.getAllAsync<Transaction>(`
        SELECT t.*, c.name as category_name, c.icon as category_icon
        FROM transactions t
        LEFT JOIN finance_categories c ON t.category_id = c.id
        WHERE t.date BETWEEN ? AND ? AND t.type = ?
        ORDER BY t.date DESC, t.created_at DESC
    `, [startDate, endDate, type]);
};

// Get transactions by category
export const getTransactionsByCategory = async (
    categoryId: number,
    year: number,
    month: number
): Promise<Transaction[]> => {
    const db = await getDatabase();
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    return db.getAllAsync<Transaction>(`
        SELECT t.*, c.name as category_name, c.icon as category_icon
        FROM transactions t
        LEFT JOIN finance_categories c ON t.category_id = c.id
        WHERE t.date BETWEEN ? AND ? AND t.category_id = ?
        ORDER BY t.date DESC
    `, [startDate, endDate, categoryId]);
};

// Get transactions by week of month (1-5)
export const getTransactionsByWeek = async (
    year: number,
    month: number,
    week: number
): Promise<Transaction[]> => {
    const db = await getDatabase();
    const monthStr = String(month).padStart(2, '0');

    // Calculate week range
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(week * 7, 31);
    const startDate = `${year}-${monthStr}-${String(startDay).padStart(2, '0')}`;
    const endDate = `${year}-${monthStr}-${String(endDay).padStart(2, '0')}`;

    return db.getAllAsync<Transaction>(`
        SELECT t.*, c.name as category_name, c.icon as category_icon
        FROM transactions t
        LEFT JOIN finance_categories c ON t.category_id = c.id
        WHERE t.date BETWEEN ? AND ?
        ORDER BY t.date DESC
    `, [startDate, endDate]);
};

// =============================================
// CATEGORY BREAKDOWN
// =============================================

// Get category breakdown for a month
export const getCategoryBreakdown = async (
    year: number,
    month: number,
    type: TransactionType
): Promise<CategoryReport[]> => {
    const db = await getDatabase();
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    // Get total for the type
    const totalResult = await db.getFirstAsync<{ total: number }>(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE date BETWEEN ? AND ? AND type = ?
    `, [startDate, endDate, type]);
    const total = totalResult?.total || 0;

    // Get breakdown by category
    const breakdown = await db.getAllAsync<{
        category_id: number;
        category_name: string;
        category_icon: string;
        category_color: string;
        total: number;
        count: number;
    }>(`
        SELECT 
            c.id as category_id,
            c.name as category_name,
            c.icon as category_icon,
            c.color as category_color,
            COALESCE(SUM(t.amount), 0) as total,
            COUNT(t.id) as count
        FROM transactions t
        JOIN finance_categories c ON t.category_id = c.id
        WHERE t.date BETWEEN ? AND ? AND t.type = ?
        GROUP BY c.id
        ORDER BY total DESC
    `, [startDate, endDate, type]);

    return breakdown.map(row => ({
        category_id: row.category_id,
        category_name: row.category_name,
        category_icon: row.category_icon,
        category_color: row.category_color,
        total: row.total,
        percentage: total > 0 ? Math.round((row.total / total) * 100) : 0,
        transaction_count: row.count,
    }));
};

// Get budget recommendation based on current month status
export const getBudgetRecommendation = async (year: number, month: number): Promise<string | null> => {
    const report = await getMonthlyReport(year, month);
    const budget = report.budget;

    const balance = report.balance;
    const totalExpense = report.total_expense;

    // Deficit scenario
    if (balance < 0) {
        const deficit = Math.abs(balance);
        return `Bulan ini defisit ${formatCurrency(deficit)}. Bulan depan, kurangi pengeluaran minimal ${formatCurrency(deficit)} untuk menyeimbangkan.`;
    }

    // Over budget expense
    if (budget && totalExpense > budget.planned_expense) {
        const over = totalExpense - budget.planned_expense;
        return `Pengeluaran melebihi budget ${formatCurrency(over)}. Pertimbangkan untuk mengurangi pengeluaran bulan depan.`;
    }

    // Daily budget check
    if (budget && budget.daily_budget > 0) {
        const today = new Date();
        const dayOfMonth = today.getDate();
        const expectedSpend = budget.daily_budget * dayOfMonth;

        if (totalExpense > expectedSpend * 1.2) { // 20% over expected
            const daysLeft = new Date(year, month, 0).getDate() - dayOfMonth;
            const remaining = budget.planned_expense - totalExpense;
            const dailyLimit = daysLeft > 0 ? Math.max(0, remaining / daysLeft) : 0;
            return `Pengeluaran 20% di atas target harian. Sisa ${daysLeft} hari, limit harian: ${formatCurrency(dailyLimit)}.`;
        }
    }

    // Good scenario
    if (balance > 0 && (!budget || totalExpense <= budget.planned_expense)) {
        return `Keuangan bulan ini sehat! Surplus ${formatCurrency(balance)}.`;
    }

    return null;
};

// Get comprehensive AI-style budget recommendations
export interface BudgetRecommendation {
    type: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    message: string;
    actionTip?: string;
}

export const getAIBudgetRecommendations = async (year: number, month: number): Promise<BudgetRecommendation[]> => {
    const recommendations: BudgetRecommendation[] = [];
    const report = await getMonthlyReport(year, month);
    const budget = report.budget;
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysLeft = daysInMonth - dayOfMonth;

    // Get category breakdown for expense
    const expenseBreakdown = await getCategoryBreakdown(year, month, 'EXPENSE');

    // 1. Daily budget analysis
    if (budget && budget.daily_budget > 0) {
        const todayStr = getTodayDate();
        const todayReport = await getDailyReport(todayStr);
        const todaySpent = todayReport.total_expense;

        if (todaySpent > budget.daily_budget) {
            const over = todaySpent - budget.daily_budget;
            recommendations.push({
                type: 'danger',
                title: '⚠️ Budget Harian Terlampaui',
                message: `Kamu sudah keluar ${formatCurrency(over)} lebih dari budget harian.`,
                actionTip: `Besok, hemat ${formatCurrency(over / daysLeft)} per hari untuk kembali on-track.`
            });
        } else if (todaySpent >= budget.daily_budget * 0.8) {
            recommendations.push({
                type: 'warning',
                title: '⚡ Mendekati Limit Harian',
                message: `Sisa budget hari ini: ${formatCurrency(budget.daily_budget - todaySpent)}`,
                actionTip: 'Pertimbangkan untuk menunda pengeluaran non-esensial.'
            });
        }
    }

    // 2. Monthly overspending analysis
    if (budget && report.total_expense > budget.planned_expense) {
        const over = report.total_expense - budget.planned_expense;
        recommendations.push({
            type: 'danger',
            title: '🚨 Budget Bulanan Terlampaui',
            message: `Pengeluaran sudah melebihi budget ${formatCurrency(over)}.`,
            actionTip: 'Fokus pada pengeluaran esensial saja untuk sisa bulan ini.'
        });
    } else if (budget && daysLeft > 0) {
        const remaining = budget.planned_expense - report.total_expense;
        const safeDailyLimit = remaining / daysLeft;
        if (safeDailyLimit > 0) {
            recommendations.push({
                type: 'info',
                title: '📊 Sisa Budget',
                message: `Budget tersisa ${formatCurrency(remaining)} untuk ${daysLeft} hari.`,
                actionTip: `Limit aman: ${formatCurrency(safeDailyLimit)}/hari`
            });
        }
    }

    // 3. Top spending category insight
    if (expenseBreakdown.length > 0) {
        const topCategory = expenseBreakdown[0];
        if (topCategory.percentage >= 40) {
            recommendations.push({
                type: 'warning',
                title: `${topCategory.category_icon} Pengeluaran Terbesar: ${topCategory.category_name}`,
                message: `${topCategory.percentage}% dari total pengeluaran (${formatCurrency(topCategory.total)})`,
                actionTip: `Pertimbangkan untuk mengurangi pengeluaran di kategori ini.`
            });
        }
    }

    // 4. Positive reinforcement
    if (recommendations.length === 0 && report.balance >= 0) {
        recommendations.push({
            type: 'success',
            title: '🎉 Keuangan Sehat',
            message: `Surplus bulan ini: ${formatCurrency(report.balance)}`,
            actionTip: 'Pertahankan! Pertimbangkan untuk menabung atau investasi.'
        });
    }

    return recommendations;
};

// Check daily budget status
export const getDailyBudgetStatus = async (): Promise<{
    budget: number;
    spent: number;
    remaining: number;
    status: 'under' | 'warning' | 'over';
} | null> => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const budget = await getMonthlyBudget(year, month);
    if (!budget || budget.daily_budget <= 0) return null;

    const todayStr = getTodayDate();
    const todayReport = await getDailyReport(todayStr);

    const spent = todayReport.total_expense;
    const remaining = budget.daily_budget - spent;

    let status: 'under' | 'warning' | 'over' = 'under';
    if (spent >= budget.daily_budget) {
        status = 'over';
    } else if (spent >= budget.daily_budget * 0.8) {
        status = 'warning';
    }

    return {
        budget: budget.daily_budget,
        spent,
        remaining,
        status,
    };
};
