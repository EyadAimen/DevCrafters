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
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import {
  initPaymentSheet,
  presentPaymentSheet,
} from "@stripe/stripe-react-native";

const backArrow = require("../../assets/backArrow.png");

// Helper function to check if medicine stock is sufficient at a pharmacy
const checkMedicineStock = async (pharmacyId: string, medicineId: string, requestedQuantity: number) => {
  try {
    // First, get the reference_id from the medicines table using the medicine_id
    const { data: medicineData, error: medicineError } = await supabase
      .from('medicines')
      .select('reference_id')
      .eq('medicine_id', medicineId)
      .maybeSingle();

    if (medicineError || !medicineData?.reference_id) {
      console.error('Error finding medicine reference_id:', medicineError);
      return { isAvailable: false, availableStock: 0, error: `Could not find medicine reference_id: ${medicineError?.message}` };
    }

    const referenceId = medicineData.reference_id;

    // Now use the reference_id to check stock in pharmacy_medicine table
    const { data: stockData, error } = await supabase
      .from('pharmacy_medicine')
      .select('stock')
      .eq('pharmacy_id', pharmacyId)
      .eq('reference_id', referenceId)
      .maybeSingle();

    if (error) {
      console.error('Error checking medicine stock:', error);
      return { isAvailable: false, availableStock: 0, error: error.message };
    }

    const availableStock = stockData?.stock || 0;
    const isAvailable = availableStock >= requestedQuantity;

    return {
      isAvailable,
      availableStock,
      error: null,
      message: isAvailable
        ? `Stock available: ${availableStock} units`
        : `Insufficient stock. Available: ${availableStock}, Requested: ${requestedQuantity}`
    };
  } catch (error: any) {
    console.error('Unexpected error checking stock:', error);
    return { isAvailable: false, availableStock: 0, error: error.message };
  }
};

const OnlineRefillOrder3 = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [manualAddress, setManualAddress] = React.useState("");
  const [isAddressModalVisible, setIsAddressModalVisible] = React.useState(false);
  const [addressSubmitCallback, setAddressSubmitCallback] = React.useState<(addr: string) => void>(() => {});

  const getParam = (key: string): string => {
    const value = params[key];
    if (Array.isArray(value)) return value[0] || "";
    return value || "";
  };

  const medicineId = getParam("medicineId");
  const medicineName = getParam("medicineName");
  const quantity = getParam("quantity");
  const totalPrice = getParam("totalPrice");
  const unitPrice = parseFloat(getParam("unitPrice")) || 0;
  const pharmacyId = getParam("pharmacyId");
  const pharmacyName = getParam("pharmacyName");
  const currentStock = getParam("currentStock");

  const quantityNum = parseInt(quantity) || 0;
  const totalPriceNum = parseFloat(totalPrice) || 0;

  // DEBUG: Log all params
  React.useEffect(() => {
    console.log("📋 OnlineRefillOrder3 received params:", {
      medicineId,
      medicineName,
      quantity,
      totalPrice,
      unitPrice,
      pharmacyName,
      currentStock
    });
  }, []);

  const getShippingAddress = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("address")
      .eq("user_id", userId)
      .single();
    if (error) throw error;

    if (!data.address) {
      return await new Promise<string>((resolve) => {
        setIsAddressModalVisible(true);
        const callback = (addr: string) => {
          setIsAddressModalVisible(false);
          resolve(addr);
        };
        setAddressSubmitCallback(() => callback);
      });
    }

    return data.address;
  };

  const saveOrderAndItems = async (userId: string, shippingAddress: string) => {
    try {
      console.log("💾 Starting to save order and items...");

      // 1. Create the order
      const orderData = {
        user_id: userId,
        pharmacy_name: pharmacyName || "Unknown Pharmacy",
        status: "completed",
        total_amount: totalPriceNum,
        quantity: quantityNum,
        medicine_name: medicineName || "Unknown Medicine",
        shipping_address: shippingAddress,
        payment_method: "stripe",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating order with data:", orderData);

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error("❌ Order creation error:", orderError);
        throw orderError;
      }

      console.log("✅ Order saved successfully with ID:", order.order_id);

      // 2. Create order item(s)
      const orderItemsData = {
        order_id: order.order_id,
        medicine_name: medicineName || "Unknown Medicine",
        quantity: quantityNum,
        unit_price: unitPrice || (totalPriceNum / quantityNum),
        created_at: new Date().toISOString(),
      };

      console.log("Creating order item with data:", orderItemsData);

      const { data: insertedItems, error: itemsError } = await supabase
        .from("order_items")
        .insert([orderItemsData])
        .select();

      if (itemsError) {
        console.error("❌ Order items creation error:", itemsError);
        throw itemsError;
      }

      console.log("✅ Order items created successfully:", insertedItems);

      return order.order_id;

    } catch (error) {
      console.error("Error saving order and items:", error);
      throw error;
    }
  };

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

    console.log("✅ Stock updated:", newStock);
  };

  const handlePayment = async () => {
    if (quantityNum <= 0 || totalPriceNum <= 0) {
      Alert.alert("Error", "Invalid order details.");
      return;
    }

    // Stock check before proceeding with payment
    if (pharmacyId && medicineId && quantityNum > 0) {
      console.log("Checking final stock availability before payment");
      const stockCheck = await checkMedicineStock(pharmacyId, medicineId, quantityNum);

      if (!stockCheck.isAvailable) {
        console.log("Stock check failed before payment:", stockCheck);
        Alert.alert(
          "Stock Issue Detected",
          `The pharmacy stock has changed since you selected quantity.\n\nAvailable: ${stockCheck.availableStock} units\nRequested: ${quantityNum} units\n\nPlease go back and select a different quantity or pharmacy.`
        );
        return;
      }

      console.log("Final stock check passed:", stockCheck.message);
    } else {
      console.log("No pharmacy/medicines information available for stock check");
    }

    setIsProcessing(true);

    try {
      const amountInCents = Math.round(totalPriceNum * 100);
      if (amountInCents < 50) throw new Error("Amount too small. Minimum RM 0.50");

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("User not logged in");

      console.log("👤 User ID:", userId);

      let shippingAddress = await getShippingAddress(userId);
      if (!shippingAddress) {
        Alert.alert("Error", "Shipping address is required.");
        setIsProcessing(false);
        return;
      }

      console.log("📦 Shipping address:", shippingAddress);

      // ✅ Call Edge Function to create PaymentIntent with live keys
      const { data, error } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: JSON.stringify({ amount: amountInCents }),
          headers: { "Content-Type": "application/json" },
        }
      );

      if (error) throw error;
      if (!data?.clientSecret) throw new Error("Invalid response from payment service.");
      const clientSecret = data.clientSecret;

      // ✅ Initialize Stripe Payment Sheet (supports cards, GrabPay, etc.)
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "MindBridge Pharmacy",
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: { name: "Customer" },
        // Supported payment methods (card + GrabPay if enabled)
        paymentMethodTypes: ["card", "grabpay"],
      });

      if (initError) throw initError;

      // ✅ Present Payment Sheet
      const paymentResult = await presentPaymentSheet();
      if (paymentResult.error) {
        if (paymentResult.error.code === "Canceled") {
          setIsProcessing(false);
          return;
        }
        Alert.alert("Payment Failed", paymentResult.error.message || "Payment unsuccessful.");
        setIsProcessing(false);
        return;
      }

      // ✅ Payment successful - SAVE BOTH ORDER AND ORDER ITEMS
      console.log("💳 Payment successful, saving order data...");
      const orderId = await saveOrderAndItems(userId, shippingAddress);
      
      if (medicineId) {
        await updateMedicineStock(medicineId, quantityNum);
      }

      console.log("🎉 All database operations completed successfully!");

      Alert.alert(
        "🎉 Payment Successful!",
        `${medicineName} has been refilled.\nPharmacy: ${pharmacyName}\n\nPayment: RM ${totalPriceNum.toFixed(2)}`,
        [{ text: "View My Medicines", onPress: () => router.push("/(tabs)/meds") }]
      );
    } catch (err: any) {
      console.error("🔥 Payment Error:", err);
      Alert.alert("Payment Error", err.message || "Unexpected error.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => router.push("/(tabs)/meds");
  const isPaymentEnabled = quantityNum > 0 && totalPriceNum > 0 && !isProcessing;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerSection}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Image source={backArrow} style={styles.backIcon} />
          </Pressable>
          <View>
            <Text style={styles.requestRefill}>Request Refill</Text>
            <Text style={styles.medicineName}>{medicineName || "Medicine"}</Text>
            <Text style={styles.pharmacyText}>
              From: {pharmacyName || "Not selected"}
            </Text>
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

        <Pressable
          style={[styles.paymentButton, !isPaymentEnabled && styles.paymentButtonDisabled]}
          onPress={handlePayment}
          disabled={!isPaymentEnabled}
        >
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.paymentButtonText}>Processing…</Text>
            </View>
          ) : (
            <Text style={styles.paymentButtonText}>Pay RM {totalPriceNum.toFixed(2)}</Text>
          )}
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={handleBack} disabled={isProcessing}>
          <Text style={styles.cancelButtonText}>Cancel Order</Text>
        </Pressable>
      </ScrollView>

      {/* Modal for manual address */}
      <Modal visible={isAddressModalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Shipping Address</Text>
            <TextInput
              placeholder="Shipping Address"
              style={styles.modalInput}
              value={manualAddress}
              onChangeText={setManualAddress}
            />
            <Pressable
              style={styles.modalButton}
              onPress={() => {
                if (!manualAddress.trim()) {
                  Alert.alert("Error", "Address cannot be empty");
                  return;
                }
                addressSubmitCallback(manualAddress.trim());
                setManualAddress("");
              }}
            >
              <Text style={styles.modalButtonText}>Save Address</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    marginBottom: 30 
  },
  backButton: { 
    padding: 8, 
    marginRight: 12 
  },
  backIcon: { 
    width: 24, 
    height: 24 
  },
  requestRefill: { 
    fontSize: 18, 
    color: "#64748b",
    marginBottom: 4 
  },
  medicineName: { 
    fontSize: 24, 
    fontWeight: "bold",
    color: "#0f172a" 
  },
  pharmacyText: { 
    fontSize: 14, 
    color: "#64748b", 
    marginTop: 4 
  },
  
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
  summaryLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  summaryValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
  },
  totalRow: {
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0ea5e9",
  },
  
  paymentButton: { 
    backgroundColor: "#0ea5e9", 
    padding: 18, 
    borderRadius: 14, 
    alignItems: "center",
    marginBottom: 16,
  },
  paymentButtonDisabled: { 
    opacity: 0.5 
  },
  paymentButtonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
  processingRow: { 
    flexDirection: "row", 
    gap: 10, 
    alignItems: "center" 
  },
  cancelButton: { 
    alignItems: "center", 
    padding: 12 
  },
  cancelButtonText: { 
    color: "#64748b", 
    fontSize: 16 
  },

  modalContainer: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  modalContent: { 
    width: "85%", 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 24 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginBottom: 16,
    color: "#0f172a"
  },
  modalInput: { 
    borderWidth: 1, 
    borderColor: "#cbd5e1", 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: "#f8fafc"
  },
  modalButton: { 
    backgroundColor: "#0ea5e9", 
    padding: 16, 
    borderRadius: 12, 
    alignItems: "center" 
  },
  modalButtonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
});

export default OnlineRefillOrder3;
