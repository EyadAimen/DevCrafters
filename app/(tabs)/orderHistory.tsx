import React, { useState } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Pressable,
    Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

// Update your types for the new structure
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
    payment_method?: string;
    items: OrderItem[];
};

const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
        case "completed":
        case "delivered":
            return {
                backgroundColor: "#dcfce7",
                color: "#166534",
            };
        case "processing":
            return {
                backgroundColor: "#fef9c3",
                color: "#854d0e",
            };
        case "cancelled":
            return {
                backgroundColor: "#fee2e2",
                color: "#991b1b",
            };
        default:
            return {
                backgroundColor: "#e2e8f0",
                color: "#475569",
            };
    }
};

export default function OrderHistory() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            fetchOrders();
        }, [])
    );

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log("No user logged in");
                setOrders([]);
                return;
            }

            // Fetch orders and their related items in a single query
            const { data: ordersData, error: ordersError } = await supabase
                .from("orders")
                .select(`
                    order_id,
                    created_at,
                    status,
                    total_amount,
                    pharmacy_name,
                    payment_method,
                    order_items (
                        item_id,
                        medicine_name,
                        quantity,
                        unit_price,
                        subtotal
                    )
                `)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (ordersError) throw ordersError;

            if (!ordersData || ordersData.length === 0) {
                setOrders([]);
                return;
            }

            const formattedOrders: Order[] = ordersData.map((order: any) => ({
                id: order.order_id,
                date: new Date(order.created_at).toLocaleDateString(),
                status: order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || "Pending",
                total: order.total_amount || 0,
                pharmacy_name: order.pharmacy_name,
                payment_method: order.payment_method,
                items: (order.order_items || []).map((item: any) => ({
                    item_id: item.item_id,
                    medicine_name: item.medicine_name,
                    quantity: item.quantity || 1,
                    unit_price: item.unit_price || 0,
                    subtotal: item.subtotal || 0,
                })),
            }));

            setOrders(formattedOrders);
        } catch (error) {
            console.error("Error fetching orders:", error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const renderOrderItem = ({ item }: { item: Order }) => {
        const statusStyle = getStatusStyle(item.status);

        // Create items preview text
        const itemsPreview = item.items
            .map(item => `${item.medicine_name} (x${item.quantity})`)
            .join(", ");

        // Truncate if too long
        const truncatedPreview = itemsPreview.length > 60
            ? itemsPreview.substring(0, 60) + "..."
            : itemsPreview;

        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => router.push({ pathname: '/order/[orderId]', params: { orderId: item.id } })}
            >
                <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>Order #{item.id.substring(0, 8)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.metaRow}>
                    {item.pharmacy_name && (
                        <View style={styles.metaItem}>
                            <Ionicons name="storefront-outline" size={14} color="#64748b" />
                            <Text style={styles.metaText}>{item.pharmacy_name}</Text>
                        </View>
                    )}
                    <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color="#64748b" />
                        <Text style={styles.metaText}>{item.date}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.itemsPreview}>
                    {truncatedPreview || "No items"}
                </Text>

                <View style={styles.orderFooter}>
                    <Text style={styles.orderTotal}>
                        Total: RM{item.total ? item.total.toFixed(2) : '0.00'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.push("/profile")} style={styles.backButton}>
                    <Image
                        source={require("../../assets/backArrow.png")}
                        style={styles.backIcon}
                    />
                </Pressable>
                <Text style={styles.title}>Order History</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 50 }} />
            ) : orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No Orders Yet</Text>
                    <Text style={styles.emptyText}>Your past orders will appear here.</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderOrderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
                    scrollEnabled={false}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
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
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    backIcon: {
        width: 24,
        height: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0f172a",
    },
    orderCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 4,
    },
    orderId: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0f172a",
    },
    statusBadge: {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    divider: {
        height: 1,
        backgroundColor: "#f1f5f9",
        marginVertical: 12,
    },
    itemsPreview: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
        marginBottom: 12,
    },
    orderFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    orderTotal: {
        fontSize: 15,
        fontWeight: "bold",
        color: "#0ea5e9",
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 50,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#475569",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: "#64748b",
        textAlign: "center",
        paddingHorizontal: 40,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginTop: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13, color: '#64748b'
    }
});