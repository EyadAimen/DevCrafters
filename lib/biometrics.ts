import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'supabase-refresh-token';
const PREFERENCE_KEY = 'biometric-enabled-preference';

export const Biometrics = {
    async isSupported() {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        return compatible && enrolled;
    },

    async authenticate() {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) return false;

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Login with Fingerprint',
            fallbackLabel: 'Use Password',
            disableDeviceFallback: false,
        });
        return result.success;
    },

    async saveSession(refreshToken: string) {
        try {
            await SecureStore.setItemAsync(SESSION_KEY, refreshToken);
            return true;
        } catch (e) {
            console.error('Error saving session', e);
            return false;
        }
    },

    async getSession() {
        try {
            return await SecureStore.getItemAsync(SESSION_KEY);
        } catch (e) {
            console.error('Error getting session', e);
            return null;
        }
    },

    async deleteSession() {
        try {
            await SecureStore.deleteItemAsync(SESSION_KEY);
            return true;
        } catch (e) {
            console.error('Error deleting session', e);
            return false;
        }
    },

    async hasSavedSession() {
        const token = await this.getSession();
        return !!token;
    },

    async setEnabled(enabled: boolean) {
        try {
            if (enabled) {
                await SecureStore.setItemAsync(PREFERENCE_KEY, 'true');
            } else {
                await SecureStore.deleteItemAsync(PREFERENCE_KEY);
            }
        } catch (e) {
            console.error('Error setting preference', e);
        }
    },

    async isEnabled() {
        try {
            const rule = await SecureStore.getItemAsync(PREFERENCE_KEY);
            return rule === 'true';
        } catch (e) {
            return false;
        }
    }
};
