import { useColorScheme } from '@/components/useColorScheme';
import { RecurrenceEndType, RecurrenceType } from '@/src/models';
import {
    COLORS,
    DARK_COLORS,
    RECURRENCE_END_OPTIONS,
    RECURRENCE_TYPE_OPTIONS,
} from '@/src/utils/constants';
import { NAMA_HARI } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface RecurrencePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (settings: RecurrenceSettings) => void;
    initialSettings?: RecurrenceSettings;
}

export interface RecurrenceSettings {
    recurrenceType: RecurrenceType;
    interval: number;
    selectedDays: number[];
    endType: RecurrenceEndType;
    endDate: Date | null;
    endCount: number | null;
}

const defaultSettings: RecurrenceSettings = {
    recurrenceType: 'weekly',
    interval: 1,
    selectedDays: [],
    endType: 'never',
    endDate: null,
    endCount: null,
};

export default function RecurrencePickerModal({
    visible,
    onClose,
    onSave,
    initialSettings = defaultSettings,
}: RecurrencePickerModalProps) {
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
        initialSettings.recurrenceType
    );
    const [interval, setInterval] = useState(initialSettings.interval.toString());
    const [selectedDays, setSelectedDays] = useState<number[]>(initialSettings.selectedDays);
    const [endType, setEndType] = useState<RecurrenceEndType>(initialSettings.endType);
    const [endDate, setEndDate] = useState<Date | null>(initialSettings.endDate);
    const [endCount, setEndCount] = useState(initialSettings.endCount?.toString() || '1');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const toggleDay = (day: number) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day].sort());
        }
    };

    const handleSave = () => {
        onSave({
            recurrenceType,
            interval: parseInt(interval) || 1,
            selectedDays,
            endType,
            endDate,
            endCount: endType === 'count' ? parseInt(endCount) || 1 : null,
        });
        onClose();
    };

    const getIntervalLabel = () => {
        switch (recurrenceType) {
            case 'daily': return 'hari';
            case 'weekly': 
            case 'custom': return 'minggu';
            case 'monthly': return 'bulan';
            case 'yearly': return 'tahun';
            default: return '';
        }
    };

    const showDaysSelector = recurrenceType === 'weekly' || recurrenceType === 'custom';

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        Pengulangan Khusus
                    </Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={[styles.saveButton, { color: colors.primary }]}>
                            Selesai
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Recurrence Type */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            Tipe Pengulangan
                        </Text>
                        <View style={styles.optionRow}>
                            {RECURRENCE_TYPE_OPTIONS.filter(opt => opt.value !== 'none').map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.optionChip,
                                        {
                                            backgroundColor: recurrenceType === opt.value 
                                                ? colors.primary 
                                                : colors.surfaceVariant,
                                            borderColor: recurrenceType === opt.value 
                                                ? colors.primary 
                                                : colors.border,
                                        }
                                    ]}
                                    onPress={() => setRecurrenceType(opt.value as RecurrenceType)}
                                >
                                    <Text style={[
                                        styles.optionChipText,
                                        { color: recurrenceType === opt.value 
                                            ? colors.textInverse 
                                            : colors.textSecondary }
                                    ]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Interval */}
                    {recurrenceType !== 'none' && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                                Ulangi Setiap
                            </Text>
                            <View style={styles.intervalRow}>
                                <TextInput
                                    style={[styles.intervalInput, {
                                        backgroundColor: colors.surface,
                                        color: colors.textPrimary,
                                        borderColor: colors.border,
                                    }]}
                                    value={interval}
                                    onChangeText={setInterval}
                                    keyboardType="number-pad"
                                    maxLength={3}
                                />
                                <Text style={[styles.intervalLabel, { color: colors.textSecondary }]}>
                                    {getIntervalLabel()}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Day Selector for Weekly/Custom */}
                    {showDaysSelector && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                                Ulangi Pada
                            </Text>
                            <View style={styles.daysRow}>
                                {NAMA_HARI.map((day, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dayButton,
                                            {
                                                backgroundColor: selectedDays.includes(index)
                                                    ? colors.primary
                                                    : colors.surfaceVariant,
                                                borderColor: selectedDays.includes(index)
                                                    ? colors.primary
                                                    : colors.border,
                                            }
                                        ]}
                                        onPress={() => toggleDay(index)}
                                    >
                                        <Text style={[
                                            styles.dayButtonText,
                                            { color: selectedDays.includes(index)
                                                ? colors.textInverse
                                                : colors.textSecondary }
                                        ]}>
                                            {day.charAt(0)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* End Condition */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                            Berakhir
                        </Text>
                        
                        {RECURRENCE_END_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                style={styles.radioRow}
                                onPress={() => setEndType(opt.value as RecurrenceEndType)}
                            >
                                <View style={[
                                    styles.radioCircle,
                                    { borderColor: colors.primary }
                                ]}>
                                    {endType === opt.value && (
                                        <View style={[
                                            styles.radioFill,
                                            { backgroundColor: colors.primary }
                                        ]} />
                                    )}
                                </View>
                                <Text style={[styles.radioLabel, { color: colors.textPrimary }]}>
                                    {opt.label}
                                </Text>
                                
                                {/* Date picker for 'date' option */}
                                {opt.value === 'date' && endType === 'date' && (
                                    <TouchableOpacity
                                        style={[styles.dateButton, { 
                                            backgroundColor: colors.surface,
                                            borderColor: colors.border,
                                        }]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={{ color: colors.textPrimary }}>
                                            {endDate 
                                                ? endDate.toLocaleDateString('id-ID') 
                                                : 'Pilih tanggal'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                
                                {/* Count input for 'count' option */}
                                {opt.value === 'count' && endType === 'count' && (
                                    <View style={styles.countInputRow}>
                                        <TextInput
                                            style={[styles.countInput, {
                                                backgroundColor: colors.surface,
                                                color: colors.textPrimary,
                                                borderColor: colors.border,
                                            }]}
                                            value={endCount}
                                            onChangeText={setEndCount}
                                            keyboardType="number-pad"
                                            maxLength={3}
                                        />
                                        <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
                                            kekerapan
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                {/* Date Picker Modal */}
                {showDatePicker && (
                    <DateTimePicker
                        value={endDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                            setShowDatePicker(Platform.OS === 'ios');
                            if (date) setEndDate(date);
                        }}
                        minimumDate={new Date()}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    saveButton: {
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    optionChipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    intervalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    intervalInput: {
        width: 60,
        height: 44,
        borderWidth: 1,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 16,
    },
    intervalLabel: {
        fontSize: 16,
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    dayButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        flexWrap: 'wrap',
        gap: 12,
    },
    radioCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioFill: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    radioLabel: {
        fontSize: 16,
        flex: 1,
    },
    dateButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    countInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    countInput: {
        width: 60,
        height: 40,
        borderWidth: 1,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 16,
    },
    countLabel: {
        fontSize: 14,
    },
});
