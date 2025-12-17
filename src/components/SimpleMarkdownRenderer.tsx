import { useColorScheme } from '@/components/useColorScheme';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SimpleMarkdownRendererProps {
    content: string;
}

export default function SimpleMarkdownRenderer({ content }: SimpleMarkdownRendererProps) {
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;

    const renderLine = (line: string, index: number) => {
        // Check for list items
        const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
        const numberMatch = line.match(/^\s*(\d+)\.\s+(.+)/);

        let lineContent = line;
        let isList = false;
        let listPrefix = '';

        if (bulletMatch) {
            lineContent = bulletMatch[1];
            isList = true;
            listPrefix = '•  ';
        } else if (numberMatch) {
            lineContent = numberMatch[2];
            isList = true;
            listPrefix = `${numberMatch[1]}.  `;
        }

        // Parse bold text
        const parts = parseBold(lineContent);

        return (
            <View key={index} style={[styles.line, isList && styles.listItem]}>
                {isList && (
                    <Text style={[styles.listPrefix, { color: colors.primary }]}>
                        {listPrefix}
                    </Text>
                )}
                <Text style={[styles.text, { color: colors.textSecondary }]}>
                    {parts.map((part, i) => (
                        part.bold ? (
                            <Text key={i} style={styles.bold}>{part.text}</Text>
                        ) : (
                            <Text key={i}>{part.text}</Text>
                        )
                    ))}
                </Text>
            </View>
        );
    };

    const parseBold = (text: string): { text: string; bold: boolean }[] => {
        const parts: { text: string; bold: boolean }[] = [];
        const regex = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ text: text.substring(lastIndex, match.index), bold: false });
            }
            parts.push({ text: match[1], bold: true });
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            parts.push({ text: text.substring(lastIndex), bold: false });
        }

        if (parts.length === 0) {
            parts.push({ text, bold: false });
        }

        return parts;
    };

    const lines = content.split('\n');

    return (
        <View style={styles.container}>
            {lines.map((line, index) => renderLine(line, index))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {},
    line: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    listItem: {
        paddingLeft: 8,
    },
    listPrefix: {
        fontWeight: '600',
        marginRight: 4,
    },
    text: {
        fontSize: 15,
        lineHeight: 22,
        flex: 1,
    },
    bold: {
        fontWeight: '700',
    },
});
