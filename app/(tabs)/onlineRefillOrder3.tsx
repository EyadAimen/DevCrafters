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

// Helper function to check if medicine stock is sufficient
const checkMedicineStock = async (
  pharmacyId: string,
  medicineId: string,
  requestedQuantity: number
) => {
  try {
    // Get reference_id from medicine
    const { data: medicineData, error: medicineError } = await supabase
      .from("medicines")
      .select("reference_id")
      .eq("medicine_id", medicineId)
      .maybeSingle();

    if (medicineError || !medicineData?.reference_id) {
      return {
        isAvailable: false,
        availableStock: 0,
        error: medicineError?.message || "Medicine not found",
      };
    }

    const referenceId = medicineData.reference_id;

    // Check stock in pharmacy_medicine
    const { data: stockData, error } = await supabase
      .from("pharmacy_medicine")
      .select("stock")
      .eq("pharmacy_id", pharmacyId)
      .eq("reference_id", referenceId)
      .maybeSingle();

    if (error) {
      return {
        isAvailable: false,
        availableStock: 0,
        error: error.message,
      };
    }

    const availableStock = stockData?.stock || 0;
    return {
      isAvailable: availableStock >= requestedQuantity,
      availableStock,
      error: null,
    };
  } catch (error: any) {
    return { isAvailable: false, availableStock: 0, error: error.message };
  }
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
  const referenceId = getParam("referenceId"); // Get the referenceId
  const pharmacyName = getParam("pharmacyName");

  const quantityNum = parseInt(quantity) || 0;
  const totalPriceNum = parseFloat(totalPrice) || 0;

  // Save order & order items
  const saveOrderAndItems = async (userId: string) => {
    const now = new Date().toISOString();

    const orderData = {
      user_id: userId,
      pharmacy_name: pharmacyName || "Unknown Pharmacy",
      status: "completed",
      total_amount: totalPriceNum,
      quantity: quantityNum,
      medicine_name: medicineName || "Unknown Medicine",
      payment_method: "stripe",
      created_at: now,
      updated_at: now,
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([orderData])
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItemsData = {
      order_id: order.order_id,
      medicine_name: medicineName,
      quantity: quantityNum,
      unit_price: unitPrice || totalPriceNum / quantityNum,
      created_at: now,
    };

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert([orderItemsData]);

    if (itemsError) throw itemsError;

    return order.order_id;
  };

  // Update medicine stock
  const updateMedicineStock = async (medicineId: string, qty: number) => {
    const { data, error } = await supabase
      .from("medicines")
      .select("current_stock")
      .eq("medicine_id", medicineId)
      .single();
    if (error) throw error;

    const newStock = (data?.current_stock || 0) + qty;
    const { error: updateError } = await supabase
      .from("medicines")
      .update({ current_stock: newStock })
      .eq("medicine_id", medicineId);

    if (updateError) throw updateError;
  };

  // Deduct stock from pharmacy inventory
  const deductPharmacyStock = async () => {
    if (!pharmacyId || !referenceId) return;

    // Get the pharmacy_medicine record to update its stock
    const { data: pm, error: pmError } = await supabase
      .from("pharmacy_medicine")
      .select("id, stock")
      .eq("pharmacy_id", pharmacyId)
      .eq("reference_id", referenceId)
      .single();

    if (pmError || !pm) {
      console.error("Could not find pharmacy medicine to deduct stock:", pmError);
      // Continue without throwing error, as order is already placed. Log this for review.
      return;
    }

    const newStock = Math.max(0, pm.stock - quantityNum);
    await supabase.from("pharmacy_medicine").update({ stock: newStock }).eq("id", pm.id);
  };

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

      // Create PaymentIntent via Edge Function
      const { data, error } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: JSON.stringify({
            amount: Math.round(totalPriceNum * 100),
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      if (error) throw error;
      const clientSecret = data.clientSecret;

      // Initialize sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: pharmacyName || "Pharmacy",
        paymentIntentClientSecret: clientSecret,
        paymentMethodTypes: ["card", "grabpay"],
      });

      if (initError) throw initError;

      // Present sheet
      const paymentResult = await presentPaymentSheet();
      if (paymentResult.error) {
        if (paymentResult.error.code === "Canceled") {
          setIsProcessing(false);
          return;
        }
        throw new Error(paymentResult.error.message);
      }

      // Save order
      const orderId = await saveOrderAndItems(userId);

      // Update stock
      if (medicineId) {
        await updateMedicineStock(medicineId, quantityNum);
      }

      // Deduct stock from pharmacy
      await deductPharmacyStock();

      Alert.alert(
        "Payment Successful",
        `${medicineName} refilled successfully.`,
        [{ text: "View My Medicines", onPress: () => router.push("/(tabs)/meds") }]
      );
    } catch (err: any) {
      Alert.alert("Payment Error", err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerSection}>
          <Pressable onPress={() => router.push("/(tabs)/meds")} style={styles.backButton}>
            <Image source={backArrow} style={styles.backIcon} />
          </Pressable>

          <View>
            <Text style={styles.requestRefill}>Request Refill</Text>
            <Text style={styles.medicineName}>{medicineName}</Text>
            <Text style={styles.pharmacyText}>From: {pharmacyName}</Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.summaryTitle}>Order Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Medicine:</Text>
            <Text style={styles.summaryValue}>{medicineName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Quantity:</Text>
            <Text style={styles.summaryValue}>{quantity} units</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Unit Price:</Text>
            <Text style={styles.summaryValue}>RM {unitPrice.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>RM {totalPriceNum.toFixed(2)}</Text>
          </View>
        </View>

        {/* Pay Button */}
        <Pressable
          style={[
            styles.paymentButton,
            !(quantityNum > 0 && !isProcessing) && styles.paymentButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.paymentButtonText}>Processing…</Text>
            </View>
          ) : (
            <Text style={styles.paymentButtonText}>
              Pay RM {totalPriceNum.toFixed(2)}
            </Text>
          )}
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          onPress={() => router.push("/(tabs)/meds")}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>Cancel Order</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: { padding: 8, marginRight: 12 },
  backIcon: { width: 24, height: 24 },
  requestRefill: { fontSize: 18, color: "#64748b", marginBottom: 4 },
  medicineName: { fontSize: 24, fontWeight: "bold", color: "#0f172a" },
  pharmacyText: { fontSize: 14, color: "#64748b", marginTop: 4 },

  orderSummary: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 14, color: "#64748b" },
  summaryValue: { fontSize: 14, color: "#0f172a", fontWeight: "500" },
  summaryDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
  },
  totalRow: { alignItems: "center" },
  totalLabel: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  totalValue: { fontSize: 24, fontWeight: "bold", color: "#0ea5e9" },

  paymentButton: {
    backgroundColor: "#0ea5e9",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  paymentButtonDisabled: { opacity: 0.5 },
  paymentButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  processingRow: { flexDirection: "row", gap: 10, alignItems: "center" },

  cancelButton: { alignItems: "center", padding: 12 },
  cancelButtonText: { color: "#64748b", fontSize: 16 },
});

export default OnlineRefillOrder3;
