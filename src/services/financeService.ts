// Finance Service - CRUD dan report untuk keuangan
import { getDatabase } from '../db/database';
import {
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

    if (existing) {
        await db.runAsync(`
            UPDATE monthly_budgets
            SET planned_income = ?, planned_expense = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ?
        `, [input.planned_income, input.planned_expense, existing.id]);
        return existing.id;
    } else {
        const result = await db.runAsync(`
            INSERT INTO monthly_budgets (year, month, planned_income, planned_expense)
            VALUES (?, ?, ?, ?)
        `, [input.year, input.month, input.planned_income, input.planned_expense]);
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
