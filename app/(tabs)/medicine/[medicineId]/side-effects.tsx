import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

interface MedicineReference {
    common_side_effects?: string | null;
    serious_side_effects?: string | null;
}

interface MedicineData {
    medicine_name: string;
    generic_name?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    current_stock?: number | null;
    expiry_date?: string | null;
    medicine_reference?: MedicineReference | null;
}

export default function MedicineDetailsSideEffects() {
    const { medicineId } = useLocalSearchParams<{ medicineId: string }>();
    const router = useRouter();
    const [data, setData] = useState<MedicineData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSideEffects = async () => {
            setLoading(true);

            try {
                const { data, error } = await supabase
                    .from("medicines")
                    .select(`
                        *,
                        medicine_reference (
                            common_side_effects,
                            serious_side_effects
                        )
                    `)
                    .eq("medicine_id", medicineId)
                    .single();

                if (error) throw error;
                console.log("Side effects data:", data);
                setData(data as MedicineData);

            } catch (error) {
                console.error("Error in fetchSideEffects:", error);
            } finally {
                setLoading(false);
            }
        };

        if (medicineId) fetchSideEffects();
    }, [medicineId]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Text style={styles.grayText}>No side effects information found.</Text>
            </View>
        );
    }

    const ref = data.medicine_reference;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.push("/(tabs)/meds")}
                >
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{data.medicine_name}</Text>
                    <Text style={styles.subtitle}>{data.generic_name}</Text>
                </View>
            </View>

            {/* Header card */}
            <View style={styles.headerCard}>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.smallLabel}>Dosage</Text>
                        <Text style={styles.smallValue}>{data.dosage ?? "-"}</Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.smallLabel}>Frequency</Text>
                        <Text style={styles.smallValue}>{data.frequency ?? "-"}</Text>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.smallLabel}>Stock</Text>
                        <Text style={[styles.smallValue, { color: "#ef4444" }]}>
                            {data.current_stock ?? 0} pills
                        </Text>
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.smallLabel}>Expiry</Text>
                        <Text style={styles.smallValue}>{data.expiry_date ?? "N/A"}</Text>
                    </View>
                </View>

                <View style={styles.headerButtonRow}>
                    <TouchableOpacity style={styles.reminderBtn}>
                        <Text style={styles.reminderText}>Set Reminder</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.refillBtn}>
                        <Text style={styles.refillText}>Request Refill</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabsWrap}>
                <TouchableOpacity
                    style={styles.tabInactive}
                    onPress={() =>
                        router.push(`/(tabs)/medicine/${medicineId}`)
                    }
                >
                    <Text style={styles.tabInactiveText}>Info</Text>
                </TouchableOpacity>

                <View style={styles.tabActive}>
                    <Text style={styles.tabActiveText}>Side Effects</Text>
                </View>

                <TouchableOpacity
                    style={styles.tabInactive}
                    onPress={() =>
                        router.push(`/(tabs)/medicine/${medicineId}/warnings`)
                    }
                >
                    <Text style={styles.tabInactiveText}>Warnings</Text>
                </TouchableOpacity>
            </View>

            {/* Common side effects */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Common Side Effects</Text>
                <Text style={styles.descriptionText}>
                    These side effects are generally mild and may go away as your body adjusts:
                </Text>
                <View style={styles.card}>
                    {ref?.common_side_effects ? (
                        ref.common_side_effects
                            .split(",")
                            .map((item, index) => (
                                <View key={index} style={styles.bulletRow}>
                                    <Text style={styles.bulletPoint}>•</Text>
                                    <Text style={styles.bulletText}>{item.trim()}</Text>
                                </View>
                            ))
                    ) : (
                        <Text style={styles.cardText}>
                            No common side effects information available.
                        </Text>
                    )}
                </View>
            </View>

            {/* Serious side effects */}
            <View style={styles.section}>
                <Text style={styles.sectionTitleDanger}>Serious Side Effects</Text>
                <Text style={styles.descriptionText}>
                    Seek medical attention immediately if you experience:
                </Text>
                {ref?.serious_side_effects ? (
                    ref.serious_side_effects
                        .split(",")
                        .map((item, index) => (
                            <View key={index} style={styles.dangerItem}>
                                <Text style={styles.dangerText}>{item.trim()}</Text>
                            </View>
                        ))
                ) : (
                    <View style={styles.dangerItem}>
                        <Text style={styles.dangerText}>
                            No serious side effects information available.
                        </Text>
                    </View>
                )}
            </View>

        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    grayText: { color: "gray" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    backButton: {
        padding: 8,
        marginRight: 12,
    },
    titleContainer: {
        flex: 1,
    },
    title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
    subtitle: { fontSize: 14, color: "#64748b", marginTop: 2 },

    headerCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e6eef6",
    },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    col: { flex: 1 },
    smallLabel: { fontSize: 13, color: "#94a3b8" },
    smallValue: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
    headerButtonRow: { flexDirection: "row", marginTop: 8 },
    reminderBtn: {
        flex: 1,
        backgroundColor: "#e6f6ff",
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: "center",
        marginRight: 8,
    },
    refillBtn: {
        flex: 1,
        backgroundColor: "#0ea5e9",
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: "center",
        marginLeft: 8,
    },
    reminderText: { color: "#0369a1", fontWeight: "600" },
    refillText: { color: "#fff", fontWeight: "600" },

    tabsWrap: {
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: "#f1f5f9",
        borderRadius: 12,
        paddingVertical: 6,
        marginTop: 16,
    },
    tabActive: {
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 18,
        paddingVertical: 6,
    },
    tabInactive: { paddingHorizontal: 18, paddingVertical: 6 },
    tabActiveText: { color: "#0ea5e9", fontWeight: "600" },
    tabInactiveText: { color: "#94a3b8", fontWeight: "500" },

    section: { marginTop: 20 },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a", marginBottom: 8 },
    sectionTitleDanger: { fontSize: 16, fontWeight: "600", color: "#ef4444", marginBottom: 8 },

    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e6eef6",
        padding: 14,
    },

    descriptionText: {
        color: "#64748b",
        fontSize: 13,
        marginBottom: 6,
    },

    bulletRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 4,
    },

    bulletPoint: {
        color: "#0ea5e9",
        fontSize: 16,
        marginRight: 6,
        lineHeight: 20,
    },

    bulletText: {
        flex: 1,
        color: "#0f172a",
        lineHeight: 20,
    },


    cardText: { color: "#64748b", lineHeight: 20 },

    dangerList: { marginTop: 8 },
    dangerItem: {
        backgroundColor: "#fff3f3",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#fca5a5",
        padding: 12,
        marginBottom: 8,
    },
    dangerText: { color: "#7f1d1d", fontWeight: "600" },
});