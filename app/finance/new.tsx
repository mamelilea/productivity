import DateTimeInput from '@/components/DateTimeInput';
import { useColorScheme } from '@/components/useColorScheme';
import { FinanceCategory, TransactionType } from '@/src/models';
import {
    createTransaction,
    getCategoriesByType
} from '@/src/services/financeService';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { getLocalDateString } from '@/src/utils/dateUtils';
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

export default function NewTransactionScreen() {
    const router = useRouter();
    const { type: initialType } = useLocalSearchParams<{ type?: string }>();
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const [type, setType] = useState<TransactionType>(
        (initialType as TransactionType) || 'EXPENSE'
    );
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [date, setDate] = useState<Date | null>(new Date());
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadCategories();
    }, [type]);

    const loadCategories = async () => {
        try {
            const cats = await getCategoriesByType(type);
            setCategories(cats);
            setCategoryId(null);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const formatAmountDisplay = (value: string): string => {
        // Remove non-numeric characters
        const numericValue = value.replace(/[^0-9]/g, '');
        if (!numericValue) return '';
        
        // Format with thousand separators
        return new Intl.NumberFormat('id-ID').format(parseInt(numericValue, 10));
    };

    const handleAmountChange = (text: string) => {
        // Store only numeric value
        const numericValue = text.replace(/[^0-9]/g, '');
        setAmount(numericValue);
    };

    const handleSubmit = async () => {
        if (!amount || parseInt(amount, 10) <= 0) {
            Alert.alert('Error', 'Masukkan jumlah yang valid');
            return;
        }

        if (!date) {
            Alert.alert('Error', 'Pilih tanggal transaksi');
            return;
        }

        setIsSubmitting(true);
        try {
            await createTransaction({
                type,
                amount: parseInt(amount, 10),
                category_id: categoryId || undefined,
                description: description.trim(),
                date: getLocalDateString(date)
            });

            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Gagal menyimpan transaksi');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Type Selector */}
                <View style={styles.typeSelector}>
                    <TouchableOpacity
                        style={[
                            styles.typeButton,
                            type === 'INCOME' && { backgroundColor: '#10B981' }
                        ]}
                        onPress={() => setType('INCOME')}
                    >
                        <Ionicons
                            name="arrow-up-circle"
                            size={24}
                            color={type === 'INCOME' ? '#FFFFFF' : colors.textMuted}
                        />
                        <Text style={[
                            styles.typeButtonText,
                            { color: type === 'INCOME' ? '#FFFFFF' : colors.textMuted }
                        ]}>
                            Pemasukan
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.typeButton,
                            type === 'EXPENSE' && { backgroundColor: '#EF4444' }
                        ]}
                        onPress={() => setType('EXPENSE')}
                    >
                        <Ionicons
                            name="arrow-down-circle"
                            size={24}
                            color={type === 'EXPENSE' ? '#FFFFFF' : colors.textMuted}
                        />
                        <Text style={[
                            styles.typeButtonText,
                            { color: type === 'EXPENSE' ? '#FFFFFF' : colors.textMuted }
                        ]}>
                            Pengeluaran
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Amount Input */}
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                        Jumlah *
                    </Text>
                    <View style={[styles.amountContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>
                            Rp
                        </Text>
                        <TextInput
                            style={[styles.amountInput, { color: colors.textPrimary }]}
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            value={formatAmountDisplay(amount)}
                            onChangeText={handleAmountChange}
                            keyboardType="numeric"
                            autoFocus
                        />
                    </View>
                </View>

                {/* Category */}
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                        Kategori
                    </Text>
                    <View style={styles.categoryGrid}>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryButton,
                                    {
                                        backgroundColor: categoryId === cat.id
                                            ? cat.color
                                            : colors.surfaceVariant,
                                        borderColor: cat.color,
                                        borderWidth: categoryId === cat.id ? 0 : 1,
                                    }
                                ]}
                                onPress={() => setCategoryId(cat.id)}
                            >
                                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                <Text style={[
                                    styles.categoryName,
                                    { color: categoryId === cat.id ? '#FFFFFF' : colors.textSecondary }
                                ]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Date */}
                <DateTimeInput
                    label="Tanggal"
                    value={date}
                    onChange={setDate}
                    mode="date"
                    placeholder="Pilih tanggal"
                    required
                />

                {/* Description */}
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                        Keterangan
                    </Text>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: colors.surface,
                            color: colors.textPrimary,
                            borderColor: colors.border
                        }]}
                        placeholder="Deskripsi transaksi (opsional)"
                        placeholderTextColor={colors.textMuted}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                {/* Submit */}
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        { backgroundColor: type === 'INCOME' ? '#10B981' : '#EF4444' },
                        isSubmitting && { opacity: 0.6 }
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    typeButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    currencyPrefix: {
        fontSize: 18,
        fontWeight: '600',
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        paddingVertical: 16,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    categoryIcon: {
        fontSize: 16,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 20,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
