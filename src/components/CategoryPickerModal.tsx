import { useColorScheme } from '@/components/useColorScheme';
import { Category } from '@/src/models';
import * as categoryService from '@/src/services/categoryService';
import { CATEGORY_COLORS, COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface CategoryPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (categoryId: number | null) => void;
    selectedId: number | null;
    categoryType: 'NOTE' | 'TASK';
}

export default function CategoryPickerModal({
    visible,
    onClose,
    onSelect,
    selectedId,
    categoryType,
}: CategoryPickerModalProps) {
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
    
    const [categories, setCategories] = useState<Category[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        if (visible) {
            loadCategories();
        }
    }, [visible]);
    
    const loadCategories = async () => {
        const cats = await categoryService.getCategoriesByType(categoryType);
        setCategories(cats);
    };
    
    const handleAddCategory = async () => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Nama kategori harus diisi');
            return;
        }
        
        setIsLoading(true);
        try {
            const newId = await categoryService.createCategory({
                name: newName.trim(),
                type: categoryType,
                color: newColor,
            });
            await loadCategories();
            setNewName('');
            setNewColor(CATEGORY_COLORS[0]);
            setShowAddForm(false);
            onSelect(newId);
        } catch (error) {
            Alert.alert('Error', 'Gagal membuat kategori');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteCategory = async (cat: Category) => {
        Alert.alert(
            'Hapus Kategori',
            `Hapus kategori "${cat.name}"?`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await categoryService.deleteCategory(cat.id);
                        if (success) {
                            await loadCategories();
                            if (selectedId === cat.id) {
                                onSelect(null);
                            }
                        } else {
                            Alert.alert('Error', 'Kategori masih digunakan, tidak bisa dihapus');
                        }
                    }
                }
            ]
        );
    };
    
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.surface }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>
                            Pilih Kategori
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.content}>
                        {/* No Category Option */}
                        <TouchableOpacity
                            style={[
                                styles.categoryItem,
                                { backgroundColor: colors.surfaceVariant },
                                selectedId === null && styles.categoryItemSelected,
                            ]}
                            onPress={() => { onSelect(null); onClose(); }}
                        >
                            <View style={[styles.categoryDot, { backgroundColor: colors.textMuted }]} />
                            <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                                Tanpa Kategori
                            </Text>
                            {selectedId === null && (
                                <Ionicons name="checkmark" size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                        
                        {/* Existing Categories */}
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryItem,
                                    { backgroundColor: colors.surfaceVariant },
                                    selectedId === cat.id && styles.categoryItemSelected,
                                ]}
                                onPress={() => { onSelect(cat.id); onClose(); }}
                                onLongPress={() => handleDeleteCategory(cat)}
                            >
                                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                                <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                                    {cat.name}
                                </Text>
                                {selectedId === cat.id && (
                                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                        
                        {/* Add Category Form */}
                        {showAddForm ? (
                            <View style={[styles.addForm, { backgroundColor: colors.surfaceVariant }]}>
                                <TextInput
                                    style={[styles.input, { 
                                        backgroundColor: colors.surface, 
                                        color: colors.textPrimary,
                                        borderColor: colors.border,
                                    }]}
                                    placeholder="Nama kategori baru"
                                    placeholderTextColor={colors.textMuted}
                                    value={newName}
                                    onChangeText={setNewName}
                                />
                                
                                <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>
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
                                
                                <View style={styles.addFormButtons}>
                                    <TouchableOpacity
                                        style={[styles.cancelButton, { borderColor: colors.border }]}
                                        onPress={() => setShowAddForm(false)}
                                    >
                                        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                                            Batal
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.saveButton, { backgroundColor: colors.primary }]}
                                        onPress={handleAddCategory}
                                        disabled={isLoading}
                                    >
                                        <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
                                            {isLoading ? 'Menyimpan...' : 'Simpan'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.addButton, { borderColor: colors.primary }]}
                                onPress={() => setShowAddForm(true)}
                            >
                                <Ionicons name="add" size={20} color={colors.primary} />
                                <Text style={[styles.addButtonText, { color: colors.primary }]}>
                                    Tambah Kategori Baru
                                </Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                    
                    <Text style={[styles.hint, { color: colors.textMuted }]}>
                        Tekan lama untuk menghapus kategori
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    categoryItemSelected: {
        borderWidth: 2,
        borderColor: '#6366F1',
    },
    categoryDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    categoryName: {
        flex: 1,
        fontSize: 16,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 8,
        marginTop: 8,
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
    addForm: {
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginBottom: 12,
    },
    colorLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
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
    addFormButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
    saveButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    hint: {
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
});
