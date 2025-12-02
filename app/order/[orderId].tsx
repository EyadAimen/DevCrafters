import React, { useState, useEffect } from "react";
import { 
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Image,
    Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

type OrderItem = {
    item_id: string;
    medicine_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
};

type Order = {
    id: string;
    date: string;
    status: string;
    total: number;
    pharmacy_name?: string;
    items: OrderItem[];
};

const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
        case "completed":
        case "delivered":
            return { backgroundColor: "#dcfce7", color: "#166534" };
        case "processing":
            return { backgroundColor: "#fef9c3", color: "#854d0e" };
        case "cancelled":
            return { backgroundColor: "#fee2e2", color: "#991b1b" };
        default:
            return { backgroundColor: "#e2e8f0", color: "#475569" };
    }
};

export default function OrderDetailsPage() {
    const router = useRouter();
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    const fetchOrderDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("orders")
                .select(
                    `
          order_id,
          created_at,
          status,
          total_amount,
          pharmacy_name,
          order_items (
            item_id,
            medicine_name,
            quantity,
            unit_price,
            subtotal
          )
        `
                )
                .eq("order_id", orderId)
                .single();

            if (error) throw error;

            if (data) {
                const formattedOrder: Order = {
                    id: data.order_id,
                    date: new Date(data.created_at).toLocaleDateString(),
                    status:
                        data.status?.charAt(0).toUpperCase() + data.status?.slice(1) ||
                        "Pending",
                    total: data.total_amount || 0,
                    pharmacy_name: data.pharmacy_name,
                    items:
                        data.order_items?.map((item: any) => ({
                            item_id: item.item_id,
                            medicine_name: item.medicine_name,
                            quantity: item.quantity || 1,
                            unit_price: item.unit_price || 0,
                            subtotal: item.subtotal || 0,
                        })) || [],
                };
                setOrder(formattedOrder);
            }
        } catch (error) {
            console.error("Error fetching order details:", error);
            setOrder(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>Order not found.</Text>
            </View>
        );
    }

    const statusStyle = getStatusStyle(order.status);
    const subtotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
    const shipping = order.total - subtotal;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Image
                        source={require("../../assets/backArrow.png")}
                        style={styles.backIcon}
                    />
                </Pressable>
                <Text style={styles.title}>Order Details</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
            <Text style={styles.orderId}>Order #{order.id.substring(0, 8).toUpperCase()}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                            <Text style={[styles.statusText, { color: statusStyle.color }]}>
                                {order.status}
                            </Text>
                        </View>
                    </View>
          <Text style={styles.orderDate}>Placed on {order.date}</Text>
                    {order.pharmacy_name && (
                        <Text style={styles.pharmacyName}>From: {order.pharmacy_name}</Text>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    {order.items.map((item) => (
                        <View key={item.item_id} style={styles.itemRow}>
                            <View style={styles.itemDetails}>
                                <Text style={styles.itemName}>{item.medicine_name}</Text>
                                <Text style={styles.itemQuantity}>
                                    Qty: {item.quantity} × RM{item.unit_price.toFixed(2)}
                                </Text>
                            </View>
                            <Text style={styles.itemSubtotal}>RM{item.subtotal.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>RM{subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Shipping & Handling</Text>
                        <Text style={styles.summaryValue}>RM{shipping.toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryTotalLabel}>Total</Text>
                        <Text style={styles.summaryTotalValue}>RM{order.total.toFixed(2)}</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    errorText: { fontSize: 16, color: "#ef4444" },
    container: { flex: 1, backgroundColor: "#f8fafc" },
    content: { padding: 16 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 40,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderColor: "#f1f5f9",
    },
    backButton: { marginRight: 12, padding: 4 },
  backIcon: { width: 24, height: 24, tintColor: '#0f172a' },
    title: { fontSize: 24, fontWeight: "bold", color: "#0f172a" },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
  orderId: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
    statusBadge: {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusText: { fontSize: 12, fontWeight: "600" },
    orderDate: { fontSize: 14, color: "#64748b", marginBottom: 4 },
  pharmacyName: { fontSize: 14, color: "#64748b", fontStyle: 'italic' },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#0f172a",
        marginBottom: 12,
    },
    itemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    },
    itemDetails: { flex: 1 },
    itemName: { fontSize: 15, color: "#334155" },
    itemQuantity: { fontSize: 13, color: "#64748b", marginTop: 2 },
    itemSubtotal: { fontSize: 15, fontWeight: "500", color: "#334155" },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    summaryLabel: { fontSize: 15, color: "#475569" },
    summaryValue: { fontSize: 15, color: "#475569" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },
    summaryTotalLabel: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
    summaryTotalValue: { fontSize: 18, fontWeight: "bold", color: "#0ea5e9" },
});