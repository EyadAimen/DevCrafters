import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router"; // Added useFocusEffect for refreshing on revisit
import { Feather } from "@expo/vector-icons";
import BottomNavigation from "../../components/BottomNavigation";
import { supabase } from "../../lib/supabase";
import { Alert, ActivityIndicator } from "react-native";
import { useCallback } from "react";

interface DisposalItem {
    id: string; // Changed to string for UUID
    name: string;
    dosage: string;
    reason: string;
    addedDate?: Date; // Optional as we might not have it strictly
    expiryDate?: string;
}

export default function DisposalListScreen() {
    const router = useRouter();

    const [disposalList, setDisposalList] = useState<DisposalItem[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchDisposalList();
        }, [])
    );

    const fetchDisposalList = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('medicines')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_disposable', true)
                .order('medicine_name', { ascending: true });

            if (error) throw error;

            if (data) {
                const mappedItems: DisposalItem[] = data.map((item: any) => ({
                    id: item.medicine_id,
                    name: item.medicine_name,
                    dosage: item.dosage,
                    reason: item.disposal_reason || 'Unknown',
                    expiryDate: item.expiry_date,
                    addedDate: item.expiry_date ? new Date(item.expiry_date) : new Date() // Fallback
                }));
                setDisposalList(mappedItems);
            }
        } catch (error) {
            console.error("Error fetching disposal list:", error);
            Alert.alert("Error", "Failed to load disposal list");
        } finally {
            setLoading(false);
        }
    };

    const getReasonColor = (reason: string) => {
        if (reason && reason.toLowerCase().includes('expired')) {
            return ["#ef4444", "#f97316"]; // Red to Orange
        }
        return ["#f59e0b", "#d97706"]; // Amber to Yellow
    };

    const handleRemove = (id: string, reason: string) => {
        if (reason && reason.toLowerCase().includes('expired')) {
            Alert.alert(
                "Cannot Restore",
                "Expired medicines cannot be moved back to active inventory."
            );
            return;
        }

        Alert.alert(
            "Remove from Disposal",
            "Do you want to move this item back to your active medicines list?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Move Back",
                    onPress: async () => {
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) {
                                Alert.alert("Error", "User not authenticated");
                                return;
                            }

                            // 1. Update medicines table
                            const { error: updateError } = await supabase
                                .from('medicines')
                                .update({
                                    is_disposable: false,
                                    disposal_reason: null
                                })
                                .eq('medicine_id', id);

                            if (updateError) throw updateError;

                            // 2. Log the action
                            const { error: logError } = await supabase
                                .from('disposal_log')
                                .insert({
                                    medicine_id: id,
                                    user_id: user.id,
                                    action_type: 'REMOVED_MANUAL',
                                    can_revert: false,
                                    action_timestamp: new Date().toISOString()
                                });

                            if (logError) console.error("Error logging removal:", logError);

                            // 3. Update local state
                            setDisposalList(prev => prev.filter(item => item.id !== id));
                            Alert.alert("Success", "Medicine moved back to active list");

                        } catch (error) {
                            console.error("Error removing item:", error);
                            Alert.alert("Error", "Failed to remove item");
                        }
                    }
                }
            ]
        );
    };

    if (loading && disposalList.length === 0) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#0ea5e9" />
                </View>
                <BottomNavigation />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Background Gradient */}
                <LinearGradient
                    style={styles.gradientBg}
                    locations={[0, 0.5, 1]}
                    colors={["#f8fafc", "rgba(239, 246, 255, 0.3)", "rgba(236, 254, 255, 0.2)"]}
                >
                    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

                        {/* Header */}
                        <View style={styles.header}>
                            <Pressable onPress={() => router.back()} style={styles.backButton}>
                                <Feather name="arrow-left" size={24} color="#0f172a" />
                            </Pressable>
                            <View>
                                <Text style={styles.title}>Disposal List</Text>
                                <Text style={styles.subtitle}>
                                    {disposalList.length} {disposalList.length === 1 ? 'item' : 'items'} pending disposal
                                </Text>
                            </View>
                        </View>

                        {/* Info Card */}
                        <LinearGradient
                            colors={['#eff6ff', '#ecfeff']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.infoCard}
                        >
                            <View style={styles.infoContent}>
                                <Feather name="info" size={16} color="#0ea5e9" style={styles.infoIcon} />
                                <Text style={styles.infoText}>
                                    These medications need to be disposed of safely. Tap on any item to view the disposal guide and find nearby drop-off locations.
                                </Text>
                            </View>
                        </LinearGradient>

                        {/* List */}
                        {disposalList.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <Feather name="trash-2" size={32} color="#94a3b8" />
                                </View>
                                <Text style={styles.emptyTitle}>No Items for Disposal</Text>
                                <Text style={styles.emptyText}>Medicines that are expired or no longer needed will appear here</Text>
                            </View>
                        ) : (
                            <View style={styles.listContainer}>
                                {disposalList.map((item) => (
                                    <View key={item.id} style={styles.card}>
                                        <LinearGradient
                                            colors={['rgba(254, 242, 242, 0.5)', 'rgba(255, 237, 213, 0.3)']}
                                            style={styles.cardGradient}
                                        >
                                            <View style={styles.cardContent}>
                                                <View style={styles.cardHeader}>
                                                    <View>
                                                        <Text style={styles.medName}>{item.name}</Text>
                                                        <Text style={styles.medDosage}>{item.dosage}</Text>
                                                    </View>
                                                    <LinearGradient
                                                        colors={getReasonColor(item.reason) as any}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 0 }}
                                                        style={styles.badge}
                                                    >
                                                        <Feather name="alert-triangle" size={10} color="white" style={{ marginRight: 4 }} />
                                                        <Text style={styles.badgeText}>{item.reason}</Text>
                                                    </LinearGradient>
                                                </View>

                                                <Text style={styles.dateText}>
                                                    Added on {(item.addedDate || new Date()).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </Text>

                                                <View style={styles.actionRow}>
                                                    <Pressable
                                                        style={styles.primaryButton}
                                                        onPress={() => router.push({ pathname: "/disposalScreen", params: { id: item.id } })}
                                                    >
                                                        <LinearGradient
                                                            colors={['#0ea5e9', '#2563eb']}
                                                            start={{ x: 0, y: 0 }}
                                                            end={{ x: 1, y: 0 }}
                                                            style={styles.buttonGradient}
                                                        >
                                                            <Feather name="trash-2" size={14} color="white" style={{ marginRight: 6 }} />
                                                            <Text style={styles.primaryButtonText}>View Guide</Text>
                                                        </LinearGradient>
                                                    </Pressable>

                                                    <Pressable style={styles.outlineButton} onPress={() => handleRemove(item.id, item.reason)}>
                                                        <Text style={styles.outlineButtonText}>Remove</Text>
                                                    </Pressable>
                                                </View>
                                            </View>
                                        </LinearGradient>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Warning Notice */}
                        {disposalList.length > 0 && (
                            <View style={styles.warningCard}>
                                <View style={styles.warningHeader}>
                                    <Feather name="alert-triangle" size={16} color="#d97706" />
                                    <Text style={styles.warningTitle}>Important Safety Notice</Text>
                                </View>
                                <Text style={styles.warningText}>
                                    Do not use these medications. Dispose of them properly to prevent accidental ingestion, environmental contamination, or misuse.
                                </Text>
                            </View>
                        )}

                    </ScrollView>
                </LinearGradient>

                <BottomNavigation />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    container: {
        flex: 1,
    },
    gradientBg: {
        flex: 1,
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        marginRight: 12,
        marginLeft: -8,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#0f172a",
    },
    subtitle: {
        fontSize: 14,
        color: "#64748b",
    },
    infoCard: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "rgba(14, 165, 233, 0.2)",
    },
    infoContent: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    infoIcon: {
        marginTop: 2,
        marginRight: 8,
    },
    infoText: {
        fontSize: 12,
        color: "#64748b",
        flex: 1,
        lineHeight: 18,
    },
    emptyState: {
        alignItems: "center",
        padding: 40,
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#0f172a",
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 13,
        color: "#64748b",
        textAlign: "center",
    },
    listContainer: {
        gap: 16,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        borderWidth: 1,
        borderColor: "rgba(239, 68, 68, 0.1)", // Slight red border
    },
    cardGradient: {
        padding: 16,
    },
    cardContent: {
        gap: 12,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    medName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0f172a",
    },
    medDosage: {
        fontSize: 14,
        color: "#64748b",
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "700",
    },
    dateText: {
        fontSize: 12,
        color: "#94a3b8",
    },
    actionRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 4,
    },
    primaryButton: {
        flex: 1,
        height: 36,
        borderRadius: 8,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    buttonGradient: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    primaryButtonText: {
        color: "white",
        fontSize: 13,
        fontWeight: "600",
    },
    outlineButton: {
        paddingHorizontal: 16,
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
    },
    outlineButtonText: {
        color: "#0f172a",
        fontSize: 13,
        fontWeight: "500",
    },
    warningCard: {
        backgroundColor: "#fffbeb", // amber-50
        borderRadius: 12,
        padding: 12,
        marginTop: 24,
        borderWidth: 1,
        borderColor: "rgba(245, 158, 11, 0.2)",
    },
    warningHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
        gap: 8,
    },
    warningTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#92400e",
    },
    warningText: {
        fontSize: 12,
        color: "#b45309",
        lineHeight: 18,
        marginLeft: 24,
    },
});
