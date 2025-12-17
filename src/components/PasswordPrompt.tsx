import { useColorScheme } from '@/components/useColorScheme';
import { COLORS, DARK_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface PasswordPromptProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (password: string) => void;
    title?: string;
    subtitle?: string;
    error?: string;
}

export default function PasswordPrompt({
    visible,
    onClose,
    onSubmit,
    title = 'Masukkan Sandi',
    subtitle = 'Catatan ini dilindungi sandi',
    error,
}: PasswordPromptProps) {
    const colorScheme = useColorScheme();
    const colors = colorScheme === 'dark' ? DARK_COLORS : COLORS;
    
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const handleSubmit = () => {
        onSubmit(password);
        setPassword('');
    };
    
    const handleClose = () => {
        setPassword('');
        onClose();
    };
    
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.surface }]}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
                        <Ionicons name="lock-closed" size={32} color={colors.warning} />
                    </View>
                    
                    {/* Title */}
                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                        {title}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        {subtitle}
                    </Text>
                    
                    {/* Password Input */}
                    <View style={[styles.inputContainer, { 
                        backgroundColor: colors.surfaceVariant,
                        borderColor: error ? colors.danger : colors.border,
                    }]}>
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary }]}
                            placeholder="Masukkan sandi..."
                            placeholderTextColor={colors.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoFocus
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons 
                                name={showPassword ? 'eye-off' : 'eye'} 
                                size={22} 
                                color={colors.textMuted} 
                            />
                        </TouchableOpacity>
                    </View>
                    
                    {error && (
                        <Text style={[styles.errorText, { color: colors.danger }]}>
                            {error}
                        </Text>
                    )}
                    
                    {/* Buttons */}
                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={[styles.cancelButton, { borderColor: colors.border }]}
                            onPress={handleClose}
                        >
                            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                                Batal
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: colors.primary }]}
                            onPress={handleSubmit}
                        >
                            <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                                Buka
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 16,
    },
    errorText: {
        fontSize: 13,
        marginBottom: 8,
    },
    buttons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        marginTop: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    submitButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
