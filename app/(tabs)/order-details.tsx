import React, { useState, useEffect } from "react";
import {
  Text,
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useLocalSearchParams, router } from "expo-router";

export default function OrderDetails() {
  const params = useLocalSearchParams();

  // Get all the order data passed from dashboard
  const order = {
    id: params.id,
    customer: params.customer,
    status: params.status,
    statusColor: params.statusColor,
    medicines: JSON.parse(params.medicines || '[]'),
    total: params.total,
    date: params.date,
    time: params.time,
    rawData: JSON.parse(params.rawData || '{}')
  };

  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [currentOrder, setCurrentOrder] = useState(order.rawData);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Helper function to get status color - MUST be defined before use
  const getStatusColor = (status) => {
    if (!status) return "#64748b";

    const statusLower = status.toLowerCase();
    switch(statusLower) {
      case 'pending': return "#f59e0b";
      case 'processing':
      case 'preparing': return "#3b82f6";
      case 'ready': return "#10b981";
      case 'cancelled': return "#ef4444";
      case 'collected': return "#8b5cf6";
      default: return "#64748b";
    }
  };

  useEffect(() => {
    const fetchCurrentOrder = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('orders_with_profile')
          .select('*')
          .eq('order_id', order.rawData.order_id)
          .single();

        if (error) {
          console.error('Error fetching order:', error);
          return;
        }

        if (data) {
          setCurrentOrder(data);
          setCurrentStatus(data.status?.toLowerCase() || order.status);
        }
      } catch (error) {
        console.error('Error in fetchCurrentOrder:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentOrder();

    // Real-time subscription for this specific order
    const channel = supabase
      .channel(`order:${order.rawData.order_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_id=eq.${order.rawData.order_id}`
        },
        (payload) => {
          console.log('Order updated in real-time:', payload.new);
          setCurrentOrder(payload.new);
          setCurrentStatus(payload.new.status?.toLowerCase());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.rawData.order_id]);

  console.log('RAW DATA STRUCTURE:', JSON.stringify(order.rawData, null, 2));

  const updateOrderStatus = async (newStatus) => {
    try {
      setUpdating(true);

      // DEBUG: See what's actually in rawData
      console.log('Full rawData:', order.rawData);
      console.log('Available keys:', Object.keys(order.rawData));

      // The correct ID might be:
      // 1. order.rawData.id
      // 2. order.rawData.order_id (but lowercase)
      // 3. order.id (from params)
      // 4. Extract from "ORD-XXXX" format

      // Try to get the actual order ID
      let actualOrderId;

      // Option 1: Check if it's in rawData
      if (order.rawData.order_id) {
        actualOrderId = order.rawData.order_id;
      }
      // Option 2: Check if it's just 'id'
      else if (order.rawData.id) {
        actualOrderId = order.rawData.id;
      }
      // Option 3: Extract from the formatted ID "ORD-XXXX"
      else {
        // If order.id is something like "ORD-A1B2C3D4"
        const match = order.id.match(/ORD-(\w+)/);
        if (match && match[1]) {
          // This might be the actual UUID or part of it
          actualOrderId = match[1];
        } else {
          actualOrderId = order.id; // Last resort
        }
      }

      console.log('Using order ID:', actualOrderId);

      // SIMPLE UPDATE
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', actualOrderId);  // Use the correct ID

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log('Update successful!');

      // Update local state
      setCurrentStatus(newStatus);

      Alert.alert('Success', `Status updated to ${newStatus}`);

      // Optional: Go back after success
      setTimeout(() => router.back(), 1500);

    } catch (error) {
      console.error('Update failed:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatusAction = () => {
    switch(currentStatus?.toLowerCase()) {
      case 'pending': return { label: 'Start Preparing', status: 'preparing' };
      case 'preparing': return { label: 'Mark as Ready', status: 'ready' };
      case 'ready': return { label: 'Mark as Collected', status: 'collected' };
      default: return null;
    }
  };

  const handleStatusUpdate = (newStatus) => {
    Alert.alert(
      'Confirm Status Update',
      `Are you sure you want to change order status to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => updateOrderStatus(newStatus) }
      ]
    );
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', onPress: () => updateOrderStatus('cancelled') }
      ]
    );
  };

  const nextAction = getNextStatusAction();
  const statusColor = getStatusColor(currentStatus);

  // Merge order data from params with fetched data
  const displayOrder = {
    ...order,
    customer: currentOrder?.profiles?.username ||
             currentOrder?.profiles?.full_name ||
             order.customer,
    status: currentStatus,
    statusColor: statusColor,
    medicines: order.medicines,
    total: order.total
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Order Status Card */}
        <View style={styles.orderHeaderCard}>
          <View>
            <Text style={styles.orderId}>{displayOrder.id}</Text>
            <Text style={styles.customerName}>{displayOrder.customer}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: displayOrder.statusColor }]}>
            <Text style={styles.statusText}>
              {displayOrder.status.charAt(0).toUpperCase() + displayOrder.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Customer Information */}
        <LinearGradient
          colors={['rgba(14, 165, 233, 0.05)', 'rgba(0, 0, 0, 0)']}
          style={styles.infoCard}
          useAngle={true}
          angle={135}
        >
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.infoLabel}>Customer Name</Text>
            <Text style={styles.infoValue}>{displayOrder.customer}</Text>

            {currentOrder?.profiles?.phone && (
              <>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{currentOrder.profiles.phone}</Text>
              </>
            )}
          </View>
        </LinearGradient>

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {displayOrder.medicines.map((medicine, index) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{medicine}</Text>
                {currentOrder?.quantity && (
                  <Text style={styles.itemDetails}>Quantity: {currentOrder.quantity}</Text>
                )}
              </View>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalPrice}>{displayOrder.total}</Text>
          </View>
        </View>

        {/* Order Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>{displayOrder.date} {displayOrder.time}</Text>
          </View>

          {currentOrder?.payment_method && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Method</Text>
              <Text style={styles.infoValue}>{currentOrder.payment_method}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Status</Text>
            <View style={[styles.statusBadgeSmall, { backgroundColor: displayOrder.statusColor }]}>
              <Text style={styles.statusTextSmall}>
                {displayOrder.status.charAt(0).toUpperCase() + displayOrder.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Update Status Buttons */}
        <LinearGradient
          colors={['#eff6ff', '#ecfeff']}
          style={styles.actionCard}
          useAngle={true}
          angle={135}
        >
          <Text style={styles.sectionTitle}>Update Collection Status</Text>

          <View style={styles.buttonContainer}>
            {nextAction && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#0ea5e9' }]}
                onPress={() => handleStatusUpdate(nextAction.status)}
                disabled={updating || loading}
              >
                <Text style={styles.buttonText}>
                  {updating ? 'Updating...' : nextAction.label}
                </Text>
              </TouchableOpacity>
            )}

            {currentStatus === 'pending' && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleCancelOrder}
                disabled={updating || loading}
              >
                <Text style={styles.secondaryButtonText}>Cancel Order</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>


      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: "#0ea5e9",
  },
  title: {
    fontSize: 18,
    fontWeight: "500",
    color: "#0f172a",
  },
  headerRight: {
    width: 60,
  },
  orderHeaderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  orderId: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0f172a",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: "#64748b",
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(14, 165, 233, 0.1)",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(219, 234, 254, 0.5)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1c398e",
    marginBottom: 16,
  },
  customerInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: "#64748b",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    color: "#64748b",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0ea5e9",
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ef4444",
  },
  statusBadgeSmall:{
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusTextSmall: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
});
