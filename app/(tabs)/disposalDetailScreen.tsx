import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import BottomNavigation from "../../components/BottomNavigation";
import { Toast } from "react-native-toast-message/lib/src/Toast";

import { supabase } from "../../lib/supabase";

export default function DisposalDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [isMarkedAsDisposed, setIsMarkedAsDisposed] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [medicine, setMedicine] = useState({ name: "Loading...", dosage: "" });

    // Fetch medicine data
    React.useEffect(() => {
        if (params.id) fetchMedicineData();
    }, [params.id]);

    const fetchMedicineData = async () => {
        try {
            const { data, error } = await supabase
                .from('medicines')
                .select('medicine_name, dosage')
                .eq('medicine_id', params.id)
                .single();

            if (error) throw error;
            if (data) {
                setMedicine({
                    name: data.medicine_name,
                    dosage: data.dosage
                });
            }
        } catch (error) {
            console.error("Error fetching medicine:", error);
        }
    };

    const detailedSteps = [
        {
            title: "Remove from Original Container",
            description: "Take the medication out of its prescription bottle or packaging. Keep the label for your records if needed."
        },
        {
            title: "Mix with Undesirable Substance",
            description: "Combine the medicine with coffee grounds, dirt, cat litter, or other unpalatable substance."
        },
        {
            title: "Seal in Container or Bag",
            description: "Place the mixture in a sealed plastic bag, empty can, or other container to prevent leaking."
        },
        {
            title: "Remove Personal Information",
            description: "Scratch out or remove all personal information from the prescription label on the empty container."
        },
        {
            title: "Dispose in Household Trash",
            description: "Place the sealed container in your household trash. Do not put it in recycling bins."
        },
        {
            title: "Verify Local Regulations",
            description: "Check your local waste management authority for any specific disposal requirements."
        }
    ];

    const faqItems = [
        {
            question: "Why is proper medicine disposal important?",
            answer: "Improper disposal of medications can harm people, animals, and the environment. Medicines flushed down the toilet can contaminate water supplies."
        },
        {
            question: "Which medicines should NEVER be flushed?",
            answer: "Most medications should never be flushed down the toilet or sink unless specifically instructed on the label."
        },
        {
            question: "What are medicine take-back programs?",
            answer: "Medicine take-back programs provide safe, convenient, and responsible disposal of prescription drugs."
        },
        {
            question: "Can I recycle medicine containers?",
            answer: "Empty medicine containers can often be recycled after removing all personal information from labels. However, containers with medication residue should be disposed of in household trash."
        }
    ];

    const toggleStep = (index: number) => {
        if (isMarkedAsDisposed) return;
        if (completedSteps.includes(index)) {
            setCompletedSteps(completedSteps.filter(i => i !== index));
        } else {
            setCompletedSteps([...completedSteps, index]);
        }
    };

    const handleMarkAsDisposed = () => {
        if (completedSteps.length < detailedSteps.length) {
            // Show warning toast or alert
            // For now we prevent action
            return;
        }
        setIsMarkedAsDisposed(true);
    };

    const allStepsCompleted = completedSteps.length === detailedSteps.length;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
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
                                <Text style={styles.title}>Disposal Guide</Text>
                                <Text style={styles.subtitle}>Step-by-step instructions</Text>
                            </View>
                        </View>

                        {/* Medicine Card */}
                        <View style={styles.medCard}>
                            <View style={styles.medCardContent}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.medName}>{medicine.name}</Text>
                                    <Text style={styles.medDosage}>{medicine.dosage}</Text>
                                </View>
                                <View style={styles.guideBadge}>
                                    <Text style={styles.guideBadgeText}>Detailed Guide</Text>
                                </View>
                            </View>
                        </View>

                        {/* Progress Card */}
                        {!isMarkedAsDisposed && (
                            <LinearGradient
                                colors={["rgba(14, 165, 233, 0.05)", "rgba(14, 165, 233, 0.1)"]}
                                style={styles.progressCard}
                            >
                                <View style={styles.progressRow}>
                                    <View style={styles.progressInfo}>
                                        <View style={styles.progressIcon}>
                                            <Feather name="check-circle" size={16} color="#0284c7" />
                                        </View>
                                        <View>
                                            <Text style={styles.progressTitle}>Progress</Text>
                                            <Text style={styles.progressSubtitle}>
                                                {completedSteps.length} of {detailedSteps.length} steps completed
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.percentageText}>
                                        {Math.round((completedSteps.length / detailedSteps.length) * 100)}%
                                    </Text>
                                </View>
                            </LinearGradient>
                        )}

                        {/* Steps List */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Step-by-Step Home Disposal</Text>
                            <View style={styles.stepsContainer}>
                                {detailedSteps.map((step, index) => {
                                    const isCompleted = completedSteps.includes(index);
                                    return (
                                        <Pressable
                                            key={index}
                                            style={[styles.stepCard, isCompleted && styles.stepCardCompleted]}
                                            onPress={() => toggleStep(index)}
                                        >
                                            <View style={styles.stepHeader}>
                                                <View style={[styles.stepNumber, isCompleted && styles.stepNumberCompleted]}>
                                                    {isCompleted ? (
                                                        <Feather name="check" size={14} color="white" />
                                                    ) : (
                                                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                                                    )}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.stepTitle, isCompleted && { color: "#0284c7" }]}>
                                                        {step.title}
                                                    </Text>
                                                    <Text style={styles.stepDescription}>
                                                        {step.description}
                                                    </Text>
                                                </View>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* FAQ Accordion */}
                        <View style={styles.section}>
                            <View style={styles.faqHeader}>
                                <Feather name="info" size={18} color="#0ea5e9" />
                                <Text style={styles.sectionTitle}>Important Information (FAQ)</Text>
                            </View>
                            <View style={styles.faqContainer}>
                                {faqItems.map((item, index) => {
                                    const isExpanded = expandedFaq === index;
                                    return (
                                        <View key={index} style={styles.faqItem}>
                                            <Pressable
                                                style={styles.faqTrigger}
                                                onPress={() => setExpandedFaq(isExpanded ? null : index)}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                    <Feather name="help-circle" size={16} color="#0ea5e9" style={{ marginRight: 8 }} />
                                                    <Text style={styles.faqQuestion}>{item.question}</Text>
                                                </View>
                                                <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                                            </Pressable>
                                            {isExpanded && (
                                                <View style={styles.faqContent}>
                                                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Action Button */}
                        <Pressable
                            style={[
                                styles.mainButton,
                                (!allStepsCompleted && !isMarkedAsDisposed) && styles.disabledButton,
                                isMarkedAsDisposed && styles.disabledButton
                            ]}
                            onPress={handleMarkAsDisposed}
                            disabled={!allStepsCompleted || isMarkedAsDisposed}
                        >
                            <LinearGradient
                                colors={isMarkedAsDisposed ? ["#94a3b8", "#64748b"] : ["#0ea5e9", "#2563eb"]}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {isMarkedAsDisposed ? (
                                    <>
                                        <Feather name="check-circle" size={18} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.buttonText}>Marked as Disposed</Text>
                                    </>
                                ) : (
                                    <Text style={styles.buttonText}>
                                        {allStepsCompleted ? "Mark as Disposed" : "Complete detailed steps to finish"}
                                    </Text>
                                )}
                            </LinearGradient>
                        </Pressable>

                        {/* Safety Notice */}
                        <View style={styles.safetyInfo}>
                            <Feather name="alert-circle" size={16} color="#d97706" style={{ marginTop: 2, marginRight: 8 }} />
                            <Text style={styles.safetyText}>
                                <Text style={{ fontWeight: '700' }}>Important:</Text> Always prioritize take-back locations when available. Contact your local pharmacy or check the DEA website.
                            </Text>
                        </View>

                    </ScrollView>
                </LinearGradient>
                <BottomNavigation />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#f8fafc" },
    container: { flex: 1 },
    gradientBg: { flex: 1 },
    scrollContainer: { padding: 20, paddingBottom: 100 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    backButton: { padding: 8, marginLeft: -8, marginRight: 12 },
    title: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
    subtitle: { fontSize: 14, color: "#64748b" },

    medCard: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "rgba(14, 165, 233, 0.2)",
        shadowColor: "#0ea5e9",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    medCardContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    medName: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
    medDosage: { fontSize: 14, color: "#64748b" },
    guideBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0"
    },
    guideBadgeText: { fontSize: 12, color: "#64748b" },

    progressCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "rgba(14, 165, 233, 0.2)",
    },
    progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    progressInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
    progressIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(14, 165, 233, 0.2)",
        alignItems: "center",
        justifyContent: "center"
    },
    progressTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
    progressSubtitle: { fontSize: 12, color: "#64748b" },
    percentageText: { fontSize: 18, fontWeight: "700", color: "#0284c7" },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a", marginBottom: 12 },
    stepsContainer: { gap: 12 },
    stepCard: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "transparent",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    stepCardCompleted: {
        backgroundColor: "rgba(14, 165, 233, 0.05)",
        borderColor: "rgba(14, 165, 233, 0.3)",
    },
    stepHeader: { flexDirection: "row", gap: 12 },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    stepNumberCompleted: { backgroundColor: "#0284c7" },
    stepNumberText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
    stepTitle: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginBottom: 4 },
    stepDescription: { fontSize: 13, color: "#64748b", lineHeight: 20 },

    faqHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    faqContainer: {
        backgroundColor: "rgba(240, 253, 250, 0.5)", // light cyan/blue tint
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(14, 165, 233, 0.2)",
        overflow: "hidden",
    },
    faqItem: { borderBottomWidth: 1, borderBottomColor: "rgba(14, 165, 233, 0.1)" },
    faqTrigger: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
    faqQuestion: { fontSize: 14, fontWeight: "500", color: "#0f172a", flex: 1 },
    faqContent: { padding: 16, paddingTop: 0, paddingLeft: 40 },
    faqAnswer: { fontSize: 13, color: "#64748b", lineHeight: 20 },

    mainButton: {
        height: 52,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#0ea5e9",
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        marginBottom: 20,
    },
    disabledButton: { opacity: 0.6 },
    buttonGradient: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: { fontSize: 16, fontWeight: "600", color: "white" },

    safetyInfo: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#fffbeb",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(245, 158, 11, 0.2)",
    },
    safetyText: { fontSize: 12, color: "#b45309", lineHeight: 18, flex: 1 },
});
