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
  const pharmacyName = getParam("pharmacyName");

  const quantityNum = parseInt(quantity) || 0;
  const totalPriceNum = parseFloat(totalPrice) || 0;

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

  const saveOrderAfterPayment = async (shippingAddress: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) throw new Error("User not logged in");

    const { error } = await supabase.from("orders").insert([
      {
        user_id: userId,
        pharmacy_name: pharmacyName || "Unknown Pharmacy",
        status: "completed",
        total_amount: totalPriceNum,
        quantity: quantityNum,
        medicine_name: medicineName,
        shipping_address: shippingAddress,
        payment_method: "stripe",
      },
    ]);
    if (error) throw error;
    console.log("✅ Order saved successfully");
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

    setIsProcessing(true);

    try {
      const amountInCents = Math.round(totalPriceNum * 100);
      if (amountInCents < 50) throw new Error("Amount too small. Minimum RM 0.50");

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("User not logged in");

      let shippingAddress = await getShippingAddress(userId);
      if (!shippingAddress) {
        Alert.alert("Error", "Shipping address is required.");
        setIsProcessing(false);
        return;
      }

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

      // ✅ Payment successful
      await saveOrderAfterPayment(shippingAddress);
      if (medicineId) await updateMedicineStock(medicineId, quantityNum);

      Alert.alert(
        "🎉 Payment Successful!",
        `${medicineName} has been refilled.\nPharmacy: ${pharmacyName}\n\nPayment: RM ${totalPriceNum.toFixed(
          2
        )}`,
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
  container: { flex: 1, backgroundColor: "#fff" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  headerSection: { flexDirection: "row", alignItems: "center", padding: 15 },
  backButton: { paddingRight: 10 },
  backIcon: { width: 24, height: 24 },
  requestRefill: { fontSize: 16, color: "#888" },
  medicineName: { fontSize: 22, fontWeight: "bold" },
  pharmacyText: { fontSize: 14, color: "#555", marginTop: 4 },
  paymentButton: { backgroundColor: "#2196F3", padding: 15, margin: 20, marginTop: 15, borderRadius: 10, alignItems: "center" },
  paymentButtonDisabled: { opacity: 0.5 },
  paymentButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  processingRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  cancelButton: { alignItems: "center", padding: 12, marginHorizontal: 20 },
  cancelButtonText: { color: "#888", fontSize: 16 },

  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "85%", backgroundColor: "#fff", borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  modalInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 15 },
  modalButton: { backgroundColor: "#2196F3", padding: 12, borderRadius: 8, alignItems: "center" },
  modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default OnlineRefillOrder3;
