// Authentication Service - Biometric and password authentication for finance
import * as LocalAuthentication from 'expo-local-authentication';
import * as settingsService from './settingsService';

// Key for finance password in settings
const FINANCE_PASSWORD_KEY = 'finance_password_hash';

// Simple hash function
const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
};

// Check if device has biometric hardware
export const isBiometricAvailable = async (): Promise<boolean> => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
};

// Get biometric type name
export const getBiometricType = async (): Promise<string> => {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris';
    }
    return 'Biometric';
};

// Authenticate with biometric
export const authenticateWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Verifikasi untuk akses Keuangan',
            fallbackLabel: 'Gunakan Sandi',
            cancelLabel: 'Batal',
            disableDeviceFallback: true, // We handle password fallback ourselves
        });

        if (result.success) {
            return { success: true };
        }

        if (result.error === 'user_cancel') {
            return { success: false, error: 'Dibatalkan' };
        }

        return { success: false, error: result.error || 'Autentikasi gagal' };
    } catch (error) {
        return { success: false, error: 'Autentikasi tidak tersedia' };
    }
};

// Check if finance password is set
export const hasFinancePassword = async (): Promise<boolean> => {
    const hash = await settingsService.getSetting(FINANCE_PASSWORD_KEY);
    return hash !== null && hash.length > 0;
};

// Set finance password
export const setFinancePassword = async (password: string): Promise<void> => {
    const hash = simpleHash(password);
    await settingsService.setSetting(FINANCE_PASSWORD_KEY, hash);
};

// Verify finance password
export const verifyFinancePassword = async (input: string): Promise<boolean> => {
    const storedHash = await settingsService.getSetting(FINANCE_PASSWORD_KEY);
    if (!storedHash) return false;

    const inputHash = simpleHash(input);
    return inputHash === storedHash;
};

// Remove finance password
export const removeFinancePassword = async (): Promise<void> => {
    await settingsService.deleteSetting(FINANCE_PASSWORD_KEY);
};

// Check if auth is required (biometric available OR password set)
export const isAuthRequired = async (): Promise<boolean> => {
    const hasBio = await isBiometricAvailable();
    const hasPass = await hasFinancePassword();
    return hasBio || hasPass;
};

// Get preferred auth method
export const getPreferredAuthMethod = async (): Promise<'biometric' | 'password' | 'none'> => {
    const hasBio = await isBiometricAvailable();
    if (hasBio) return 'biometric';

    const hasPass = await hasFinancePassword();
    if (hasPass) return 'password';

    return 'none';
};
