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
    warnings?: string | null;
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

export default function MedicineDetailsWarnings() {
    const { medicineId } = useLocalSearchParams<{ medicineId: string }>();
    const router = useRouter();
    const [data, setData] = useState<MedicineData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWarnings = async () => {
            setLoading(true);
            
            try {
                // First get the medicine data
                const { data: medicineData, error: medicineError } = await supabase
                    .from("medicines")
                    .select("*")
                    .eq("medicine_id", medicineId)
                    .single();

                if (medicineError) {
                    console.error("Error fetching medicine:", medicineError);
                    return;
                }

                // Then get reference data if reference_id exists
                let referenceData = null;
                if (medicineData.reference_id) {
                    const { data: refData, error: refError } = await supabase
                        .from("medicine_reference")
                        .select("warnings")
                        .eq("drug_id", medicineData.reference_id)
                        .single();

                    if (!refError && refData) {
                        referenceData = refData;
                    }
                }

                // Combine the data
                const combinedData = {
                    ...medicineData,
                    medicine_reference: referenceData
                };

                console.log("Warnings data:", combinedData);
                setData(combinedData as MedicineData);

            } catch (error) {
                console.error("Error in fetchWarnings:", error);
            } finally {
                setLoading(false);
            }
        };

        if (medicineId) fetchWarnings();
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
                <Text style={styles.grayText}>No warning information found.</Text>
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
                <TouchableOpacity
                    style={styles.tabInactive}
                    onPress={() =>
                        router.push(`/(tabs)/medicine/${medicineId}`)
                    }
                >
                    <Text style={styles.tabInactiveText}>Info</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tabInactive}
                    onPress={() =>
                        router.push(`/(tabs)/medicine/${medicineId}/side-effects`)
                    }
                >
                    <Text style={styles.tabInactiveText}>Side Effects</Text>
                </TouchableOpacity>

                <View style={styles.tabActive}>
                    <Text style={styles.tabActiveText}>Warnings</Text>
                </View>
            </View>

            {/* Important warnings highlight */}
            <View style={{ marginTop: 20 }}>
                <View style={styles.warningHighlight}>
                    <Text style={styles.warningHighlightText}>
                        Review these contraindications carefully before taking this medication
                    </Text>
                </View>

                {/* Warnings content */}
                <View style={{ marginTop: 12 }}>
                    {ref?.warnings ? (
                        <View style={styles.pillRow}>
                            <View style={styles.pillIndex}>
                                <Text style={styles.pillIndexText}>!</Text>
                            </View>
                            <View style={styles.pillContent}>
                                <Text style={styles.pillText}>{ref.warnings}</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.pillRow}>
                            <View style={styles.pillIndex}>
                                <Text style={styles.pillIndexText}>!</Text>
                            </View>
                            <View style={styles.pillContent}>
                                <Text style={styles.pillText}>
                                    No specific warnings information available for this medication.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={{ marginTop: 14 }}>
                    <View style={styles.infoFooter}>
                        <Text style={styles.infoFooterText}>
                            Always consult your healthcare provider before starting, stopping, or
                            changing your medication regimen. This information is for educational
                            purposes only.
                        </Text>
                    </View>
                </View>
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

    warningHighlight: {
        backgroundColor: "#fff7ed",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#fde3b7",
    },
    warningHighlightText: { color: "#92400e", fontWeight: "600", lineHeight: 20 },

    pillRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 10 },
    pillIndex: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#eef2ff",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    pillIndexText: { color: "#3730a3", fontWeight: "700" },
    pillContent: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#e6eef6",
    },
    pillText: { color: "#475569", lineHeight: 20 },

    infoFooter: {
        backgroundColor: "#eff6ff",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#dbeafe",
    },
    infoFooterText: { color: "#1e293b", lineHeight: 20 },
});