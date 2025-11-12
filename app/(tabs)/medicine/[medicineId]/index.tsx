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
    drug_id: string;
    ndc_number: string;
    medicine_name: string;
    generic_name?: string | null;
    purpose?: string | null;
    how_to_take?: string | null;
    common_side_effects?: string | null;
    serious_side_effects?: string | null;
    warnings?: string | null;
    drug_interactions?: string | null;
    storage?: string | null;
    manufacturer?: string | null;
    created_at: string;
}

interface MedicineData {
    medicine_id: string;
    user_id?: string | null;
    medicine_name: string;
    generic_name?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    current_stock?: number | null;
    expiry_date?: string | null;
    reference_id?: string | null;
    special_instructions?: string | null;
    created_at?: string | null;
    medicine_reference?: MedicineReference | null;
}

export default function MedicineDetailsInfo() {
    const { medicineId } = useLocalSearchParams<{ medicineId: string }>();
    const router = useRouter();

    const [data, setData] = useState<MedicineData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMedicine = async () => {
            setLoading(true);

            try {
                const { data: medicineData, error: medicineError } = await supabase
                    .from("medicines")
                    .select("*")
                    .eq("medicine_id", medicineId)
                    .single();

                if (medicineError) {
                    console.error("Error fetching medicine:", medicineError);
                    return;
                }

                let referenceData = null;
                if (medicineData.reference_id) {
                    const { data: refData, error: refError } = await supabase
                        .from("medicine_reference")
                        .select("*")
                        .eq("drug_id", medicineData.reference_id)
                        .single();

                    if (!refError && refData) {
                        referenceData = refData;
                    }
                }

                setData({
                    ...medicineData,
                    medicine_reference: referenceData,
                } as MedicineData);
            } catch (error) {
                console.error("Error in fetchMedicine:", error);
            } finally {
                setLoading(false);
            }
        };

        if (medicineId) fetchMedicine();
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
                <Text style={styles.grayText}>No medicine data found.</Text>
            </View>
        );
    }

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

            {/* Header Card */}
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
                        <Text style={styles.smallLabel}>Expires</Text>
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
                <View style={styles.tabActive}>
                    <Text style={styles.tabActiveText}>Info</Text>
                </View>
                <TouchableOpacity
                    style={styles.tabInactive}
                    onPress={() =>
                        router.push(`/(tabs)/medicine/${medicineId}/side-effects`)
                    }
                >
                    <Text style={styles.tabInactiveText}>Side Effects</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tabInactive}
                    onPress={() =>
                        router.push(`/(tabs)/medicine/${medicineId}/warnings`)
                    }
                >
                    <Text style={styles.tabInactiveText}>Warnings</Text>
                </TouchableOpacity>
            </View>

            {/* Info Cards */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Purpose</Text>
                <Text style={styles.cardText}>
                    {data.medicine_reference?.purpose || "No information available."}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>How to Take</Text>

                {data.medicine_reference?.how_to_take ? (
                    data.medicine_reference.how_to_take
                        .split(",")
                        .map((instruction, index) => (
                            <View key={index} style={styles.bulletRow}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.bulletText}>{instruction.trim()}</Text>
                            </View>
                        ))
                ) : (
                    <Text style={styles.cardText}>No information available.</Text>
                )}
            </View>


            <View style={styles.card}>
                <Text style={styles.cardTitle}>Drug Interactions</Text>
                <Text style={styles.cardText}>
                    {data.medicine_reference?.drug_interactions ||
                        "No information available."}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Storage</Text>
                <Text style={styles.cardText}>
                    {data.medicine_reference?.storage || "No information available."}
                </Text>
            </View>

            {/* Footer Info */}
            <View style={styles.footerCard}>
                <Text style={styles.footerLabel}>Manufacturer</Text>
                <Text style={styles.footerValue}>
                    {data.medicine_reference?.manufacturer || "No information available."}
                </Text>
                <Text style={styles.footerLabel}>NDC Number</Text>
                <Text style={styles.footerValue}>
                    {data.medicine_reference?.ndc_number || "No information available."}
                </Text>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
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
    titleContainer: { flex: 1 },
    title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
    subtitle: { fontSize: 14, color: "#64748b", marginTop: 2 },

    headerCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e6eef6",
        marginBottom: 16,
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    col: { flex: 1 },
    smallLabel: { fontSize: 13, color: "#94a3b8" },
    smallValue: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
    headerButtonRow: { flexDirection: "row", marginTop: 8 },

    bulletRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 6,
    },
    bullet: {
        color: "#dc7814ff", // yellow bullet
        fontSize: 20,
        lineHeight: 20,
        marginRight: 8,
        marginTop: 3,
    },
    bulletText: {
        flex: 1,
        color: "#475569",
        fontSize: 14,
        lineHeight: 20,
    },

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
        marginBottom: 16,
    },
    tabActive: {
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 24,
        paddingVertical: 6,
    },
    tabInactive: { paddingHorizontal: 24, paddingVertical: 6 },
    tabActiveText: { color: "#0ea5e9", fontWeight: "600" },
    tabInactiveText: { color: "#94a3b8", fontWeight: "500" },

    /** CARD SECTIONS */
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#e6eef6",
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0ea5e9",
        marginBottom: 6,
    },
    cardText: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
    },

    /** FOOTER */
    footerCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e6eef6",
        marginTop: 8,
    },
    footerLabel: { fontSize: 13, color: "#94a3b8" },
    footerValue: {
        fontSize: 14,
        fontWeight: "500",
        color: "#0f172a",
        marginBottom: 8,
    },
});
