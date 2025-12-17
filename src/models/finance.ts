// Finance/Keuangan model
// Untuk mencatat pemasukan & pengeluaran dengan budget bulanan

export type TransactionType = 'INCOME' | 'EXPENSE';

// Kategori keuangan (custom oleh user)
export interface FinanceCategory {
    id: number;
    name: string;
    type: TransactionType; // Kategori untuk income atau expense
    icon: string; // Emoji icon
    color: string;
    created_at: string;
}

// Transaksi (log harian)
export interface Transaction {
    id: number;
    type: TransactionType;
    amount: number;
    category_id: number | null;
    category_name?: string; // Joined from category
    category_icon?: string;
    description: string;
    date: string; // Format: YYYY-MM-DD
    created_at: string;
}

// Budget bulanan
export interface MonthlyBudget {
    id: number;
    year: number;
    month: number; // 1-12
    planned_income: number;
    planned_expense: number;
    created_at: string;
    updated_at: string;
}

// Input types
export interface CreateTransactionInput {
    type: TransactionType;
    amount: number;
    category_id?: number;
    description: string;
    date: string;
}

export interface CreateFinanceCategoryInput {
    name: string;
    type: TransactionType;
    icon: string;
    color: string;
}

export interface CreateBudgetInput {
    year: number;
    month: number;
    planned_income: number;
    planned_expense: number;
}

// Report types
export interface DailyReport {
    date: string;
    total_income: number;
    total_expense: number;
    balance: number;
    transactions: Transaction[];
}

export interface MonthlyReport {
    year: number;
    month: number;
    total_income: number;
    total_expense: number;
    balance: number;
    budget?: MonthlyBudget;
    daily_breakdown: {
        date: string;
        income: number;
        expense: number;
    }[];
}

// Default categories
export const DEFAULT_EXPENSE_CATEGORIES: Omit<CreateFinanceCategoryInput, 'type'>[] = [
    { name: 'Makanan', icon: '🍔', color: '#EF4444' },
    { name: 'Transport', icon: '🚗', color: '#F59E0B' },
    { name: 'Belanja', icon: '🛒', color: '#8B5CF6' },
    { name: 'Hiburan', icon: '🎮', color: '#EC4899' },
    { name: 'Tagihan', icon: '📄', color: '#6366F1' },
    { name: 'Lainnya', icon: '💵', color: '#6B7280' },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<CreateFinanceCategoryInput, 'type'>[] = [
    { name: 'Gaji', icon: '💼', color: '#10B981' },
    { name: 'Bonus', icon: '🎁', color: '#F59E0B' },
    { name: 'Investasi', icon: '📈', color: '#6366F1' },
    { name: 'Lainnya', icon: '💰', color: '#6B7280' },
];
