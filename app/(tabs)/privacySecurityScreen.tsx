import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import QRCode from 'react-native-qrcode-svg';

import { Biometrics } from "../../lib/biometrics";
import { MFA } from "../../lib/mfa";
import { supabase } from "../../lib/supabase";

export default function PrivacySecurityScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        biometricAuth: false,
        twoFactorAuth: false,
        rememberDevice: true,
        dataSharing: false,
        analyticsTracking: true,
        marketingEmails: false,
    });

    React.useEffect(() => {
        checkBiometricStatus();
        checkMfaStatus();
    }, []);

    // MFA State
    const [mfaModalVisible, setMfaModalVisible] = useState(false);
    const [enrollmentData, setEnrollmentData] = useState<any>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    // Change Password State
    const [changePasswordVisible, setChangePasswordVisible] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);

    const checkBiometricStatus = async () => {
        const hasSession = await Biometrics.hasSavedSession();
        setSettings(prev => ({ ...prev, biometricAuth: hasSession }));
    };

    const checkMfaStatus = async () => {
        try {
            const factors = await MFA.getVerifiedFactors();
            setSettings(prev => ({ ...prev, twoFactorAuth: factors.length > 0 }));
        } catch (e) {
            console.error("MFA check failed", e);
        }
    };

    const handleToggle = async (key: keyof typeof settings) => {
        if (key === 'biometricAuth') {
            const newValue = !settings.biometricAuth;
            if (newValue) {
                // Enabling
                const supported = await Biometrics.isSupported();
                if (!supported) {
                    Alert.alert("Not Supported", "Biometrics are not available on this device.");
                    return;
                }
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    await Biometrics.setEnabled(true);
                    const success = await Biometrics.saveSession(data.session.refresh_token);
                    if (success) {
                        setSettings(prev => ({ ...prev, [key]: true }));
                        Toast.show({ type: 'success', text1: 'Biometrics Enabled' });
                    }
                } else {
                    Alert.alert("Error", "You must be logged in to enable this.");
                }
            } else {
                // Disabling
                await Biometrics.setEnabled(false);
                await Biometrics.deleteSession();
                setSettings(prev => ({ ...prev, [key]: false }));
                Toast.show({ type: 'success', text1: 'Biometrics Disabled' });
            }
        } else if (key === 'twoFactorAuth') {
            const newValue = !settings.twoFactorAuth;
            if (newValue) {
                // Enable MFA -> Start Enrollment
                setLoading(true); // Ensure loading is defined or use dedicated state
                try {
                    const data = await MFA.enroll();
                    setEnrollmentData(data);
                    setMfaModalVisible(true);
                } catch (e) {
                    Alert.alert("Error", "Failed to start MFA enrollment: " + e.message);
                } finally {
                    setLoading(false);
                }
            } else {
                // Disable MFA -> Unenroll
                Alert.alert(
                    "Disable 2FA?",
                    "Are you sure you want to remove Two-Factor Authentication? Your account will be less secure.",
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Disable",
                            style: "destructive",
                            onPress: async () => {
                                try {
                                    setLoading(true);
                                    const factors = await MFA.getVerifiedFactors();
                                    for (const factor of factors) {
                                        await MFA.unenroll(factor.id);
                                    }
                                    setSettings(prev => ({ ...prev, twoFactorAuth: false }));
                                    Toast.show({ type: 'success', text1: '2FA Disabled' });
                                } catch (e) {
                                    Alert.alert("Error", "Failed to disable MFA: " + e.message);
                                } finally {
                                    setLoading(false);
                                }
                            }
                        }
                    ]
                );
            }
        } else if (key === 'dataSharing' || key === 'analyticsTracking' || key === 'marketingEmails') {
            const isEnabling = !settings[key];
            const title = isEnabling ? "Enable Feature?" : "Disable Feature?";

            let message = "";
            if (isEnabling) {
                if (key === 'dataSharing') message = "By enabling data sharing, you help us improve our services through anonymized data analysis with our trusted partners.";
                else if (key === 'analyticsTracking') message = "Enabling analytics allows us to collect usage data to improve app performance and user experience.";
                else if (key === 'marketingEmails') message = "Stay updated! Receive exclusive health tips, offers, and news directly in your inbox.";
            } else {
                let featureName = "";
                if (key === 'dataSharing') featureName = "data sharing";
                else if (key === 'analyticsTracking') featureName = "analytics tracking";
                else if (key === 'marketingEmails') featureName = "marketing communications";

                message = `Are you sure you want to disable ${featureName}?`;
            }

            Alert.alert(
                title,
                message,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: isEnabling ? "Enable" : "Disable",
                        style: isEnabling ? "default" : "destructive",
                        onPress: () => {
                            setSettings(prev => ({
                                ...prev,
                                [key]: !prev[key]
                            }));
                        }
                    }
                ]
            );
        } else {
            setSettings(prev => ({
                ...prev,
                [key]: !prev[key]
            }));
        }
    };

    const handleChangePassword = () => {
        setChangePasswordVisible(true);
    };

    const handleChangePasswordSubmit = async () => {
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            Alert.alert("Error", "New passwords do not match.");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            Alert.alert("Error", "New password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        try {
            // 1. Verify old password by signing in
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("User not found");

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordForm.currentPassword
            });

            if (signInError) {
                throw new Error("Incorrect current password.");
            }

            // 2. Update to new password
            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordForm.newPassword
            });

            if (updateError) throw updateError;

            setChangePasswordVisible(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            Toast.show({ type: 'success', text1: 'Password Updated Successfully' });
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to delete your account? This action cannot be undone and will remove all your data.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const { error } = await supabase.rpc('delete_user');
                            if (error) throw error;

                            await supabase.auth.signOut();
                            router.replace("/login");
                            Toast.show({ type: 'success', text1: 'Account Deleted' });
                        } catch (e: any) {
                            console.error("Delete account error", e);
                            // Fallback if RPC doesn't exist yet
                            Alert.alert("Error", "Could not delete account. Please contact support.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#0f172a" />
                </Pressable>
                <View>
                    <Text style={styles.headerTitle}>Privacy & Security</Text>
                    <Text style={styles.headerSubtitle}>Manage your data and security</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Security Settings */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
                            <Feather name="shield" size={18} color="#0284c7" />
                        </View>
                        <Text style={styles.cardTitle}>Security Settings</Text>
                    </View>

                    <View style={styles.cardContent}>
                        {/* Biometric */}
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={styles.itemIconBox}>
                                    <MaterialIcons name="fingerprint" size={20} color="#0284c7" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Biometric Login</Text>
                                    <Text style={styles.itemSubtitle}>Use fingerprint or Face ID</Text>
                                </View>
                            </View>
                            <Switch
                                value={settings.biometricAuth}
                                onValueChange={() => handleToggle('biometricAuth')}
                                trackColor={{ false: "#cbd5e1", true: "#0284c7" }}
                                thumbColor={"#fff"}
                            />
                        </View>
                        <View style={styles.separator} />

                        {/* 2FA */}
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={styles.itemIconBox}>
                                    <Feather name="smartphone" size={20} color="#0284c7" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Two-Factor Authentication</Text>
                                    <Text style={styles.itemSubtitle}>Extra security for login</Text>
                                </View>
                            </View>
                            <Switch
                                value={settings.twoFactorAuth}
                                onValueChange={() => handleToggle('twoFactorAuth')}
                                trackColor={{ false: "#cbd5e1", true: "#0284c7" }}
                                thumbColor={"#fff"}
                            />
                        </View>
                        <View style={styles.separator} />

                        {/* Change Password */}
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={styles.itemIconBox}>
                                    <Feather name="lock" size={20} color="#0284c7" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Change Password</Text>
                                    <Text style={styles.itemSubtitle}>Update your login password</Text>
                                </View>
                            </View>
                            <Pressable onPress={handleChangePassword} style={styles.actionButton}>
                                <Text style={styles.actionButtonText}>Change</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Privacy Settings */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
                            <Feather name="eye" size={18} color="#0284c7" />
                        </View>
                        <Text style={styles.cardTitle}>Privacy Settings</Text>
                    </View>

                    <View style={styles.cardContent}>
                        {/* Data Sharing */}
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={styles.itemIconBox}>
                                    <Feather name="file-text" size={20} color="#0284c7" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Share Data with Healthcare</Text>
                                    <Text style={styles.itemSubtitle}>Help improve care quality</Text>
                                </View>
                            </View>
                            <Switch
                                value={settings.dataSharing}
                                onValueChange={() => handleToggle('dataSharing')}
                                trackColor={{ false: "#cbd5e1", true: "#0284c7" }}
                                thumbColor={"#fff"}
                            />
                        </View>
                        <View style={styles.separator} />

                        {/* Analytics */}
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={styles.itemIconBox}>
                                    <Ionicons name="stats-chart" size={20} color="#0284c7" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Analytics & Diagnostics</Text>
                                    <Text style={styles.itemSubtitle}>Help us improve the app</Text>
                                </View>
                            </View>
                            <Switch
                                value={settings.analyticsTracking}
                                onValueChange={() => handleToggle('analyticsTracking')}
                                trackColor={{ false: "#cbd5e1", true: "#0284c7" }}
                                thumbColor={"#fff"}
                            />
                        </View>
                        <View style={styles.separator} />

                        {/* Marketing */}
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={styles.itemIconBox}>
                                    <Feather name="file-text" size={20} color="#0284c7" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Marketing Communications</Text>
                                    <Text style={styles.itemSubtitle}>Receive health tips & offers</Text>
                                </View>
                            </View>
                            <Switch
                                value={settings.marketingEmails}
                                onValueChange={() => handleToggle('marketingEmails')}
                                trackColor={{ false: "#cbd5e1", true: "#0284c7" }}
                                thumbColor={"#fff"}
                            />
                        </View>
                    </View>
                </View>

                {/* Data Management */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Data Management</Text>
                    </View>

                    <View style={styles.cardContent}>



                        <Pressable style={styles.dataButton} onPress={handleDeleteAccount}>
                            <View style={[styles.itemIconBox, { backgroundColor: '#fee2e2' }]}>
                                <Feather name="trash-2" size={20} color="#ef4444" />
                            </View>
                            <View style={styles.itemInfo}>
                                <Text style={[styles.itemTitle, { color: '#ef4444' }]}>Delete Account</Text>
                                <Text style={styles.itemSubtitle}>Permanently remove your data</Text>
                            </View>
                        </Pressable>
                    </View>
                </View>

                {/* Info Notice */}
                <View style={styles.infoBox}>
                    <Feather name="shield" size={16} color="#0284c7" style={{ marginTop: 2, marginRight: 8 }} />
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: 'bold' }}>Important: </Text>
                        Pillora is designed for medication tracking and not for storing sensitive personal health information.
                    </Text>
                </View>

                <Text style={styles.footerText}>Last updated: October 15, 2025</Text>

            </ScrollView>

            {/* MFA Enrollment Modal */}
            <Modal
                visible={mfaModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setMfaModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Setup 2-Factor Authentication</Text>
                            <Pressable onPress={() => setMfaModalVisible(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </Pressable>
                        </View>

                        <ScrollView style={{ maxHeight: 400 }}>
                            <Text style={styles.stepText}>1. Scan this QR code with your authenticator app (e.g. Google Authenticator).</Text>

                            <View style={styles.qrContainer}>
                                {enrollmentData && (
                                    <QRCode
                                        value={enrollmentData.totp.uri} // Supabase returns 'uri' in the totp object
                                        size={200}
                                    />
                                )}
                            </View>

                            <Text style={styles.secretText}>
                                Or enter this code manually:
                                {"\n"}
                                <Text style={{ fontWeight: 'bold' }}>{enrollmentData?.totp.secret}</Text>
                            </Text>

                            <Text style={styles.stepText}>2. Enter the 6-digit code from your app to verify.</Text>

                            <TextInput
                                style={styles.input}
                                value={verifyCode}
                                onChangeText={setVerifyCode}
                                placeholder="000000"
                                keyboardType="number-pad"
                                maxLength={6}
                                placeholderTextColor="#94a3b8"
                            />

                            <Pressable
                                style={[styles.verifyButton, (isVerifying || verifyCode.length !== 6) && styles.disabledButton]}
                                onPress={async () => {
                                    if (verifyCode.length !== 6) return;
                                    setIsVerifying(true);
                                    try {
                                        await MFA.verifyCode(enrollmentData.id, verifyCode);
                                        setMfaModalVisible(false);
                                        setSettings(prev => ({ ...prev, twoFactorAuth: true }));
                                        Toast.show({ type: 'success', text1: '2FA Enabled Successfully' });
                                        setVerifyCode("");
                                    } catch (e: any) {
                                        Alert.alert("Error", "Invalid code. Please try again.");
                                    } finally {
                                        setIsVerifying(false);
                                    }
                                }}
                                disabled={isVerifying || verifyCode.length !== 6}
                            >
                                {isVerifying ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.verifyButtonText}>Verify & Enable</Text>
                                )}
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal
                visible={changePasswordVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setChangePasswordVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <Pressable onPress={() => setChangePasswordVisible(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </Pressable>
                        </View>

                        <View>
                            <Text style={styles.label}>Current Password</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={passwordForm.currentPassword}
                                    onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
                                    placeholder="Enter current password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#94a3b8" />
                                </Pressable>
                            </View>

                            <Text style={styles.label}>New Password</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={passwordForm.newPassword}
                                    onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
                                    placeholder="Enter new password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                />

                            </View>

                            <Text style={styles.label}>Confirm New Password</Text>
                            <View style={styles.passwordInputContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={passwordForm.confirmPassword}
                                    onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
                                    placeholder="Confirm new password"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                />
                            </View>

                            <Pressable
                                style={[styles.verifyButton, loading && styles.disabledButton, { marginTop: 20 }]}
                                onPress={handleChangePasswordSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.verifyButtonText}>Update Password</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        padding: 8,
        marginRight: 12,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
    },
    cardContent: {
        gap: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 16,
    },
    itemIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0f172a',
        marginBottom: 2,
    },
    itemSubtitle: {
        fontSize: 12,
        color: '#64748b',
    },
    separator: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 4,
    },
    actionButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#0f172a',
    },
    dataButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        width: '100%',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        marginBottom: 20,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#1e40af',
        lineHeight: 18,
    },
    footerText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94a3b8',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    stepText: {
        fontSize: 14,
        color: '#334155',
        marginBottom: 16,
        lineHeight: 20,
    },
    qrContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    secretText: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        padding: 16,
        fontSize: 20,
        textAlign: 'center',
        letterSpacing: 4,
        color: '#0f172a',
        marginBottom: 20,
    },
    verifyButton: {
        backgroundColor: '#0284c7',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#cbd5e1',
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        marginTop: 16,
    },
    passwordInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 14,
        color: '#0f172a',
    },
    eyeIcon: {
        padding: 8,
    },
});
