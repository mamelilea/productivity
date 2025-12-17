import { useColorScheme } from '@/components/useColorScheme';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface SimpleMarkdownInputProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    minHeight?: number;
}

export default function SimpleMarkdownInput({
    value,
    onChangeText,
    placeholder = 'Ketik deskripsi...',
    minHeight = 120,
}: SimpleMarkdownInputProps) {
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
    const [showToolbar, setShowToolbar] = useState(false);

    const insertAtCursor = (prefix: string, suffix: string = '') => {
        // Simple append for mobile since cursor position is complex
        if (suffix) {
            onChangeText(value + prefix + suffix);
        } else {
            onChangeText(value + prefix);
        }
    };

    const insertBold = () => {
        insertAtCursor('**', '**');
    };

    const insertList = () => {
        const newLine = value.endsWith('\n') || value === '' ? '' : '\n';
        insertAtCursor(newLine + '- ');
    };

    const insertNumberedList = () => {
        const newLine = value.endsWith('\n') || value === '' ? '' : '\n';
        insertAtCursor(newLine + '1. ');
    };

    const handleTextChange = (text: string) => {
        // Auto-continue lists
        const lines = text.split('\n');
        const lastLine = lines[lines.length - 2]; // Previous line after enter
        
        if (text.endsWith('\n') && lastLine) {
            // Check if previous line was a list item
            const bulletMatch = lastLine.match(/^(\s*[-*])\s/);
            const numberMatch = lastLine.match(/^(\s*)(\d+)\.\s/);
            
            if (bulletMatch && lastLine.trim() !== '-' && lastLine.trim() !== '*') {
                // Continue bullet list
                onChangeText(text + bulletMatch[1] + ' ');
                return;
            } else if (numberMatch && lastLine.trim() !== `${numberMatch[2]}.`) {
                // Continue numbered list
                const nextNum = parseInt(numberMatch[2]) + 1;
                onChangeText(text + numberMatch[1] + nextNum + '. ');
                return;
            }
        }
        
        onChangeText(text);
    };

    return (
        <View style={styles.container}>
            {/* Toolbar */}
            <View style={[styles.toolbar, { backgroundColor: colors.surfaceVariant }]}>
                <TouchableOpacity
                    style={styles.toolbarButton}
                    onPress={insertBold}
                >
                    <Text style={[styles.toolbarButtonText, { color: colors.textSecondary }]}>
                        <Text style={{ fontWeight: 'bold' }}>B</Text>
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.toolbarButton}
                    onPress={insertList}
                >
                    <Ionicons name="list" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.toolbarButton}
                    onPress={insertNumberedList}
                >
                    <Text style={[styles.toolbarButtonText, { color: colors.textSecondary }]}>
                        1.
                    </Text>
                </TouchableOpacity>
                
                <View style={styles.toolbarSpacer} />
                
                <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    Gunakan **text** untuk bold
                </Text>
            </View>
            
            {/* Input */}
            <TextInput
                style={[styles.input, {
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    minHeight,
                }]}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                value={value}
                onChangeText={handleTextChange}
                multiline
                textAlignVertical="top"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {},
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        gap: 4,
    },
    toolbarButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
    },
    toolbarButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    toolbarSpacer: {
        flex: 1,
    },
    helperText: {
        fontSize: 11,
    },
    input: {
        borderWidth: 1,
        borderTopWidth: 0,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        padding: 14,
        fontSize: 16,
    },
});
