import { useColorScheme } from '@/components/useColorScheme';
import { FinanceCategory, TransactionType } from '@/src/models';
import {
    createFinanceCategory,
    deleteFinanceCategory,
    getFinanceCategories
} from '@/src/services/financeService';
import { CATEGORY_COLORS, COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const ICONS = ['💼', '🎁', '📈', '💰', '💵', '🍔', '🚗', '🛒', '🎮', '📄', '💡', '🏠', '💊', '🎓', '✈️'];

export default function FinanceCategoriesScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addType, setAddType] = useState<TransactionType>('EXPENSE');
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('💵');
    const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
    const [isSaving, setIsSaving] = useState(false);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const cats = await getFinanceCategories();
            setCategories(cats);
        } catch (error) {
            console.error('Error loading categories:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCategories();
        }, [])
    );

    const incomeCategories = categories.filter(c => c.type === 'INCOME');
    const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

    const handleOpenAdd = (type: TransactionType) => {
        setAddType(type);
        setNewName('');
        setNewIcon(type === 'INCOME' ? '💰' : '💵');
        setNewColor(type === 'INCOME' ? '#10B981' : '#EF4444');
        setShowAddModal(true);
    };

    const handleCreateCategory = async () => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Nama kategori harus diisi');
            return;
        }

        setIsSaving(true);
        try {
            await createFinanceCategory({
                name: newName.trim(),
                type: addType,
                icon: newIcon,
                color: newColor,
            });
            await loadCategories();
            setShowAddModal(false);
        } catch (error) {
            Alert.alert('Error', 'Gagal membuat kategori');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCategory = (cat: FinanceCategory) => {
        Alert.alert(
            'Hapus Kategori',
            `Hapus "${cat.name}"?`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteFinanceCategory(cat.id);
                        await loadCategories();
                    }
                }
            ]
        );
    };

    const renderCategory = ({ item }: { item: FinanceCategory }) => (
        <TouchableOpacity
            style={[styles.categoryItem, { backgroundColor: colors.surface }]}
            onLongPress={() => handleDeleteCategory(item)}
        >
            <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
                <Text style={styles.categoryIconText}>{item.icon}</Text>
            </View>
            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Income Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.success }]}>
                        💰 Kategori Pemasukan
                    </Text>
                    <TouchableOpacity onPress={() => handleOpenAdd('INCOME')}>
                        <Ionicons name="add-circle" size={24} color={colors.success} />
                    </TouchableOpacity>
                </View>
                
                <FlatList
                    data={incomeCategories}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderCategory}
                    numColumns={3}
                    columnWrapperStyle={styles.categoryRow}
                    scrollEnabled={false}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            Belum ada kategori
                        </Text>
                    }
                />
            </View>

            {/* Expense Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.danger }]}>
                        💸 Kategori Pengeluaran
                    </Text>
                    <TouchableOpacity onPress={() => handleOpenAdd('EXPENSE')}>
                        <Ionicons name="add-circle" size={24} color={colors.danger} />
                    </TouchableOpacity>
                </View>
                
                <FlatList
                    data={expenseCategories}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderCategory}
                    numColumns={3}
                    columnWrapperStyle={styles.categoryRow}
                    scrollEnabled={false}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                            Belum ada kategori
                        </Text>
                    }
                />
            </View>

            <Text style={[styles.hint, { color: colors.textMuted }]}>
                Tekan lama pada kategori untuk menghapus
            </Text>

            {/* Add Category Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                                Kategori {addType === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'} Baru
                            </Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: colors.surfaceVariant, 
                                color: colors.textPrimary,
                                borderColor: colors.border,
                            }]}
                            placeholder="Nama kategori"
                            placeholderTextColor={colors.textMuted}
                            value={newName}
                            onChangeText={setNewName}
                        />

                        <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
                            Pilih Icon:
                        </Text>
                        <View style={styles.iconRow}>
                            {ICONS.map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    style={[
                                        styles.iconButton,
                                        { backgroundColor: colors.surfaceVariant },
                                        newIcon === icon && { backgroundColor: colors.primary + '30' },
                                    ]}
                                    onPress={() => setNewIcon(icon)}
                                >
                                    <Text style={styles.iconButtonText}>{icon}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
                            Pilih Warna:
                        </Text>
                        <View style={styles.colorRow}>
                            {CATEGORY_COLORS.map((color, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        styles.colorButton,
                                        { backgroundColor: color },
                                        newColor === color && styles.colorButtonSelected,
                                    ]}
                                    onPress={() => setNewColor(color)}
                                >
                                    {newColor === color && (
                                        <Ionicons name="checkmark" size={16} color="#FFF" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, { 
                                backgroundColor: addType === 'INCOME' ? colors.success : colors.danger 
                            }]}
                            onPress={handleCreateCategory}
                            disabled={isSaving}
                        >
                            <Text style={[styles.saveButtonText, { color: '#FFF' }]}>
                                {isSaving ? 'Menyimpan...' : 'Simpan Kategori'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    categoryRow: {
        justifyContent: 'flex-start',
        gap: 10,
    },
    categoryItem: {
        width: '31%',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 10,
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    categoryIconText: {
        fontSize: 22,
    },
    categoryName: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 13,
        textAlign: 'center',
        padding: 16,
    },
    hint: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 'auto',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 16,
    },
    pickerLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    iconRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButtonText: {
        fontSize: 22,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    colorButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorButtonSelected: {
        borderWidth: 3,
        borderColor: '#FFF',
    },
    saveButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
