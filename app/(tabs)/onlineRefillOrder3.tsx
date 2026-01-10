import * as React from "react";
import {
  Text,
  StyleSheet,
  View,
  Pressable,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import {
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";

const backArrow = require("../../assets/backArrow.png");

/* =========================
   SAVE RECEIPT HELPER
========================= */
const saveReceipt = async ({
  orderId,
  userId,
  pharmacyId,
  pharmacyName,
  pharmacyAddress,
  medicineName,
  quantity,
  unitPrice,
  totalAmount,
}: any) => {
  const receiptData = {
    receiptNumber: `RCPT-${orderId}`,
    date: new Date().toISOString(),
    pharmacy: {
      name: pharmacyName,
      address: pharmacyAddress,
    },
    items: [
      {
        medicineName,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      },
    ],
    payment: {
      method: "Stripe",
      status: "Paid",
    },
    summary: {
      total: totalAmount,
    },
  };

  const { error } = await supabase.from("receipts").insert([
    {
      order_id: orderId,
      user_id: userId,
      pharmacy_id: pharmacyId,
      receipt_number: receiptData.receiptNumber,
      total_amount: totalAmount,
      payment_method: "stripe",
      receipt_data: receiptData,
    },
  ]);

  if (error) throw error;

  return receiptData;
};

const OnlineRefillOrder3 = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const getParam = (key: string): string => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value || "";
  };

  const medicineId = getParam("medicineId");
  const medicineName = getParam("medicineName");
  const quantity = getParam("quantity");
  const totalPrice = getParam("totalPrice");
  const unitPrice = parseFloat(getParam("unitPrice")) || 0;
  const pharmacyId = getParam("pharmacyId");
  const referenceId = getParam("referenceId");
  const pharmacyName = getParam("pharmacyName");

  const quantityNum = parseInt(quantity) || 0;
  const totalPriceNum = parseFloat(totalPrice) || 0;

  /* =========================
     SAVE ORDER & ITEMS
  ========================= */
  const saveOrderAndItems = async (userId: string) => {
    const now = new Date().toISOString();

    const { data: order, error } = await supabase
      .from("orders")
      .insert([
        {
          user_id: userId,
          pharmacy_name: pharmacyName,
          pharmacy_id: pharmacyId,
          status: "pending",
          total_amount: totalPriceNum,
          quantity: quantityNum,
          medicine_name: medicineName,
          payment_method: "stripe",
          created_at: now,
          updated_at: now,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    await supabase.from("order_items").insert([
      {
        order_id: order.order_id,
        medicine_name: medicineName,
        quantity: quantityNum,
        unit_price: unitPrice || totalPriceNum / quantityNum,
        created_at: now,
      },
    ]);

    return order.order_id;
  };

  /* =========================
     UPDATE STOCK
  ========================= */
  const updateStocks = async () => {
    // 1️⃣ Update medicine current stock
    if (medicineId) {
      const { data, error } = await supabase
        .from("medicines")
        .select("current_stock")
        .eq("medicine_id", medicineId)
        .single();
      if (!error && data) {
        const newStock = data.current_stock + quantityNum;
        await supabase
          .from("medicines")
          .update({ current_stock: newStock })
          .eq("medicine_id", medicineId);
      }
    }

    // 2️⃣ Deduct stock from pharmacy
    if (pharmacyId && referenceId) {
      const { data, error } = await supabase
        .from("pharmacy_medicine")
        .select("id, stock")
        .eq("pharmacy_id", pharmacyId)
        .eq("reference_id", referenceId)
        .single();

      if (!error && data) {
        const newStock = Math.max(0, data.stock - quantityNum);
        await supabase
          .from("pharmacy_medicine")
          .update({ stock: newStock })
          .eq("id", data.id);
      }
    }
  };

  /* =========================
     HANDLE PAYMENT
  ========================= */
  const handlePayment = async () => {
    if (quantityNum <= 0 || totalPriceNum <= 0) {
      Alert.alert("Error", "Invalid order details.");
      return;
    }

    setIsProcessing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("User not logged in");

      // Create payment intent
      const { data, error } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: JSON.stringify({ amount: Math.round(totalPriceNum * 100) }),
        }
      );
      if (error) throw error;

      // Initialize Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: pharmacyName,
        paymentIntentClientSecret: data.clientSecret,
      });
      if (initError) throw initError;

      // Present payment sheet
      const paymentResult = await presentPaymentSheet();
      if (paymentResult.error) throw paymentResult.error;

      // Save order
      const orderId = await saveOrderAndItems(userId);

      // Update stocks
      await updateStocks();

      // Get pharmacy info
      const { data: pharmacy, error: pharmacyError } = await supabase
        .from("pharmacy")
        .select("pharmacy_name, pharmacy_address")
        .eq("pharmacy_id", pharmacyId)
        .single();
      if (pharmacyError || !pharmacy) throw pharmacyError;

      // Save receipt
      const receiptData = await saveReceipt({
        orderId,
        userId,
        pharmacyId,
        pharmacyName: pharmacy.pharmacy_name,
        pharmacyAddress: pharmacy.pharmacy_address,
        medicineName,
        quantity: quantityNum,
        unitPrice: unitPrice || totalPriceNum / quantityNum,
        totalAmount: totalPriceNum,
      });

      // Redirect to receipt page
      router.push({
        pathname: "/receipt",
        params: { receipt: JSON.stringify(receiptData) },
      });
    } catch (err: any) {
      Alert.alert("Payment Error", err.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Image source={backArrow} style={styles.backIcon} />
          </Pressable>
          <View>
            <Text style={styles.title}>Refill Medicine</Text>
            <Text style={styles.medicineName}>{medicineName}</Text>
            <Text style={styles.pharmacyText}>From: {pharmacyName}</Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Quantity</Text>
            <Text style={styles.value}>{quantityNum} units</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Unit Price</Text>
            <Text style={styles.value}>RM {unitPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>RM {totalPriceNum.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Button */}
        <Pressable
          style={[styles.paymentButton, isProcessing && styles.disabledButton]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.paymentButtonText}>
              Pay RM {totalPriceNum.toFixed(2)}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerSection: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backButton: { marginRight: 12, padding: 8 },
  backIcon: { width: 24, height: 24 },
  title: { fontSize: 18, color: "#64748b" },
  medicineName: { fontSize: 24, fontWeight: "bold", color: "#0f172a" },
  pharmacyText: { fontSize: 14, color: "#64748b", marginTop: 2 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  summaryTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  label: { fontSize: 14, color: "#64748b" },
  value: { fontSize: 14, fontWeight: "500", color: "#0f172a" },
  summaryDivider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 12 },
  totalRow: { alignItems: "center" },
  totalLabel: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  totalValue: { fontSize: 22, fontWeight: "bold", color: "#0ea5e9" },
  paymentButton: {
    backgroundColor: "#0ea5e9",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: { opacity: 0.6 },
  paymentButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default OnlineRefillOrder3;