import { useColorScheme } from '@/components/useColorScheme';
import {
    COLORS,
    DARK_COLORS,
    REMINDER_UNIT_OPTIONS,
} from '@/src/utils/constants';
import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface CustomReminderInputProps {
    value: number; // Total minutes
    onChange: (minutes: number) => void;
    enabled?: boolean;
}

export default function CustomReminderInput({
    value,
    onChange,
    enabled = true,
}: CustomReminderInputProps) {
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    // Parse value to unit and amount
    const parseValue = (totalMinutes: number) => {
        // Find the largest unit that divides evenly
        for (let i = REMINDER_UNIT_OPTIONS.length - 1; i >= 0; i--) {
            const unit = REMINDER_UNIT_OPTIONS[i];
            if (totalMinutes >= unit.value && totalMinutes % unit.value === 0) {
                return {
                    amount: totalMinutes / unit.value,
                    unitValue: unit.value,
                };
            }
        }
        return { amount: totalMinutes, unitValue: 1 };
    };

    const parsed = parseValue(value);
    const [amount, setAmount] = useState(parsed.amount.toString());
    const [selectedUnit, setSelectedUnit] = useState(parsed.unitValue);

    useEffect(() => {
        const parsedAmount = parseInt(amount) || 1;
        onChange(parsedAmount * selectedUnit);
    }, [amount, selectedUnit]);

    const getDisplayText = () => {
        const parsedAmount = parseInt(amount) || 1;
        const unit = REMINDER_UNIT_OPTIONS.find(u => u.value === selectedUnit);
        return `${parsedAmount} ${unit?.label || 'menit'} sebelum`;
    };

    if (!enabled) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.inputRow}>
                <TextInput
                    style={[styles.amountInput, {
                        backgroundColor: colors.surface,
                        color: colors.textPrimary,
                        borderColor: colors.border,
                    }]}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="number-pad"
                    maxLength={3}
                />
                <View style={styles.unitSelector}>
                    {REMINDER_UNIT_OPTIONS.map(unit => (
                        <TouchableOpacity
                            key={unit.value}
                            style={[
                                styles.unitChip,
                                {
                                    backgroundColor: selectedUnit === unit.value
                                        ? colors.primary
                                        : colors.surfaceVariant,
                                    borderColor: selectedUnit === unit.value
                                        ? colors.primary
                                        : colors.border,
                                }
                            ]}
                            onPress={() => setSelectedUnit(unit.value)}
                        >
                            <Text style={[
                                styles.unitChipText,
                                { color: selectedUnit === unit.value
                                    ? colors.textInverse
                                    : colors.textSecondary }
                            ]}>
                                {unit.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            <Text style={[styles.previewText, { color: colors.textMuted }]}>
                Pengingat: {getDisplayText()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    amountInput: {
        width: 60,
        height: 44,
        borderWidth: 1,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 16,
    },
    unitSelector: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    unitChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    unitChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    previewText: {
        fontSize: 12,
        marginTop: 8,
    },
});
