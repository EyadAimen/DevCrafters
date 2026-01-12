import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Pressable, Image, Linking, Alert
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import * as Notifications from "expo-notifications";

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
  const s = status?.trim().toLowerCase();
  switch (s) {
    case "pending": return { backgroundColor: "#fff7ed", color: "#f59e0b" };
    case "processing":
    case "preparing": return { backgroundColor: "#eff6ff", color: "#3b82f6" };
    case "ready":
    case "completed": return { backgroundColor: "#ecfdf5", color: "#10b981" };
    case "collected": return { backgroundColor: "#f5f3ff", color: "#8b5cf6" };
    case "cancelled": return { backgroundColor: "#fee2e2", color: "#ef4444" };
    default: return { backgroundColor: "#e2e8f0", color: "#64748b" };
  }
};

// Request notification permission
async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === "granted";
  }
  return true;
}

// Show ready notification
async function showReadyNotification(orderId: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Order Ready ✅",
      body: `Your order ORD-${orderId.slice(0, 8).toUpperCase()} is ready for collection.`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });
}

export default function OrderHistory() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifiedOrderIds, setNotifiedOrderIds] = useState<string[]>([]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
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

      if (error) throw error;

      const formatted: Order[] = (data || []).map((order: any) => ({
        id: order.order_id,
        date: new Date(order.created_at).toLocaleDateString("en-GB"),
        status: order.status?.toLowerCase() || "pending",
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

      setOrders(formatted);

      // Notify ready orders
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        formatted.forEach(order => {
          if (order.status === "ready" && !notifiedOrderIds.includes(order.id)) {
            showReadyNotification(order.id);
            setNotifiedOrderIds(prev => [...prev, order.id]);
          }
        });
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  // Open Google Maps for directions using only pharmacy_name
  const handleDirections = (pharmacyName?: string) => {
    if (!pharmacyName) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pharmacyName)}`;
    Linking.openURL(url).catch(() => Alert.alert("Unable to open maps"));
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusStyle = getStatusStyle(item.status);
    const itemsPreview = item.items.map(i => `${i.medicine_name} (x${i.quantity})`).join(", ");

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push({ pathname: "/order/[orderId]", params: { orderId: item.id } })}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>ORD-{item.id.slice(0, 8).toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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
        <Text style={styles.itemsPreview}>{itemsPreview || "No items"}</Text>

        {/* Directions Button */}
        {item.pharmacy_name && (
          <TouchableOpacity
            style={styles.directionButton}
            onPress={() => handleDirections(item.pharmacy_name)}
          >
            <Ionicons name="navigate-outline" size={18} color="#0ea5e9" />
            <Text style={styles.directionButtonText}>Directions</Text>
          </TouchableOpacity>
        )}

        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>RM {item.total.toFixed(2)}</Text>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/profile")} style={styles.backButton}>
          <Image source={require("../../assets/backArrow.png")} style={styles.backIcon} />
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
          contentContainerStyle={{ padding: 16 }}
          scrollEnabled={false}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 40, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#f1f5f9" },
  backButton: { marginRight: 12 },
  backIcon: { width: 24, height: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#0f172a" },

  orderCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  orderId: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },

  metaRow: { flexDirection: "row", gap: 16, marginTop: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, color: "#64748b" },

  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 12 },
  itemsPreview: { fontSize: 14, color: "#475569", marginBottom: 12 },

  directionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: "flex-start"
  },
  directionButtonText: { color: "#0ea5e9", fontWeight: "600", marginLeft: 6, fontSize: 14 },

  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderTotal: { fontSize: 15, fontWeight: "bold", color: "#0ea5e9" },

  emptyContainer: { alignItems: "center", marginTop: 50 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginTop: 16 },
  emptyText: { fontSize: 16, color: "#64748b", textAlign: "center" },
});
