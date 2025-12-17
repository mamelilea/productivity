// Date Time Picker Component - Wrapper untuk @react-native-community/datetimepicker
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';

interface DateTimeInputProps {
    label: string;
    value: Date | null;
    onChange: (date: Date | null) => void;
    mode: 'date' | 'time' | 'datetime';
    placeholder?: string;
    required?: boolean;
    minDate?: Date;
}

export default function DateTimeInput({
    label,
    value,
    onChange,
    mode,
    placeholder,
    required = false,
    minDate
}: DateTimeInputProps) {
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(value || new Date());

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            setShowTimePicker(false);
        }

        if (event.type === 'dismissed') {
            return;
        }

        if (selectedDate) {
            if (mode === 'datetime') {
                setTempDate(selectedDate);
                if (showDatePicker) {
                    setShowDatePicker(false);
                    // On Android, show time picker after date is selected
                    if (Platform.OS === 'android') {
                        setTimeout(() => setShowTimePicker(true), 100);
                    }
                } else if (showTimePicker) {
                    setShowTimePicker(false);
                    onChange(selectedDate);
                }
            } else {
                onChange(selectedDate);
                setShowDatePicker(false);
                setShowTimePicker(false);
            }
        }
    };

    const handleIOSConfirm = () => {
        onChange(tempDate);
        setShowDatePicker(false);
        setShowTimePicker(false);
    };

    const formatDate = (date: Date | null): string => {
        if (!date) return placeholder || 'Pilih...';

        const options: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        };

        if (mode === 'time') {
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        }

        if (mode === 'datetime') {
            return `${date.toLocaleDateString('id-ID', options)} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
        }

        return date.toLocaleDateString('id-ID', options);
    };

    const getIcon = (): keyof typeof Ionicons.glyphMap => {
        if (mode === 'time') return 'time-outline';
        return 'calendar-outline';
    };

    const handlePress = () => {
        if (mode === 'time') {
            setShowTimePicker(true);
        } else {
            setShowDatePicker(true);
        }
    };

    const handleClear = () => {
        onChange(null);
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
                {label} {required && '*'}
            </Text>

            <TouchableOpacity
                style={[
                    styles.input,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                    }
                ]}
                onPress={handlePress}
            >
                <Ionicons name={getIcon()} size={20} color={colors.textMuted} />
                <Text
                    style={[
                        styles.inputText,
                        { color: value ? colors.textPrimary : colors.textMuted }
                    ]}
                >
                    {formatDate(value)}
                </Text>
                {value && (
                    <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>

            {/* Date Picker */}
            {showDatePicker && (
                <View>
                    <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        minimumDate={minDate}
                        locale="id-ID"
                    />
                    {Platform.OS === 'ios' && (
                        <View style={styles.iosButtons}>
                            <TouchableOpacity
                                style={[styles.iosButton, { backgroundColor: colors.surfaceVariant }]}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={{ color: colors.textSecondary }}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.iosButton, { backgroundColor: colors.primary }]}
                                onPress={() => {
                                    if (mode === 'datetime') {
                                        setShowDatePicker(false);
                                        setShowTimePicker(true);
                                    } else {
                                        handleIOSConfirm();
                                    }
                                }}
                            >
                                <Text style={{ color: colors.textInverse }}>
                                    {mode === 'datetime' ? 'Lanjut' : 'Pilih'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Time Picker */}
            {showTimePicker && (
                <View>
                    <DateTimePicker
                        value={tempDate}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        locale="id-ID"
                    />
                    {Platform.OS === 'ios' && (
                        <View style={styles.iosButtons}>
                            <TouchableOpacity
                                style={[styles.iosButton, { backgroundColor: colors.surfaceVariant }]}
                                onPress={() => setShowTimePicker(false)}
                            >
                                <Text style={{ color: colors.textSecondary }}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.iosButton, { backgroundColor: colors.primary }]}
                                onPress={handleIOSConfirm}
                            >
                                <Text style={{ color: colors.textInverse }}>Pilih</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        gap: 10,
    },
    inputText: {
        flex: 1,
        fontSize: 16,
    },
    iosButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 10,
    },
    iosButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
});
