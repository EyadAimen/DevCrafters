import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";

const backArrow = require("../../assets/backArrow.png");

const HandlePaymentCart = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const pharmacyId = Array.isArray(params.pharmacyId) ? params.pharmacyId[0] : params.pharmacyId;
  const pharmacyName = Array.isArray(params.pharmacyName) ? params.pharmacyName[0] : params.pharmacyName;
  const pharmacyAddress = Array.isArray(params.pharmacyAddress) ? params.pharmacyAddress[0] : params.pharmacyAddress;

  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login first");
      setUserId(user.id);

      const { data: cartData, error } = await supabase
        .from("cart_item")
        .select(`
          pharmacy_medicine_id,
          quantity,
          pharmacy_medicine (
            id,
            reference_id,
            price,
            stock,
            medicine_reference (
              drug_id,
              medicine_name,
              generic_name,
              dosage,
              category
            )
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      setCartItems(cartData ?? []);
    } catch (err: any) {
      console.error("Error fetching cart:", err);
      Alert.alert("Error", err.message || "Failed to load cart.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const cartTotal = cartItems.reduce((sum, item) => {
    const pm = Array.isArray(item.pharmacy_medicine) 
      ? item.pharmacy_medicine[0] 
      : item.pharmacy_medicine;
    const price = pm?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const handlePayment = async () => {
    if (!userId) {
      Alert.alert("Login required", "Please login first.");
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert("Cart empty", "Add at least one medicine to continue.");
      return;
    }

    setIsProcessing(true);

    try {
      const amountInCents = Math.round(cartTotal * 100);
      if (amountInCents < 50) {
        throw new Error("Amount too small. Minimum RM 0.50");
      }

      // 1️⃣ Create PaymentIntent via Supabase Edge Function
      const { data, error: paymentIntentError } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: JSON.stringify({ amount: amountInCents }),
          headers: { "Content-Type": "application/json" },
        }
      );

      if (paymentIntentError) throw paymentIntentError;
      if (!data?.clientSecret) {
        throw new Error("Invalid response from payment service.");
      }

      const clientSecret = data.clientSecret;

      // 2️⃣ Initialize Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Pillora Pharmacy",
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: { name: "Customer" },
      });
      if (initError) throw initError;

      // 3️⃣ Present Payment Sheet
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

      // 4️⃣ Payment successful, create order
      const totalAmount = cartTotal;
      const orderData = {
        user_id: userId,
        status: "completed",
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pharmacy_name: pharmacyName || "Unknown Pharmacy",
        payment_method: "stripe",
        quantity: cartItems.reduce((acc, i) => acc + i.quantity, 0),
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();
      if (orderError) {
        console.error("❌ Order creation error:", orderError);
        throw new Error(`Order creation failed: ${orderError.message}`);
      }

      console.log("✅ Order created with ID:", order.order_id);

      // 5️⃣ Create order_items & deduct stock
      for (const item of cartItems) {
        const pm = Array.isArray(item.pharmacy_medicine) 
          ? item.pharmacy_medicine[0] 
          : item.pharmacy_medicine;
        const ref = Array.isArray(pm?.medicine_reference) 
          ? pm.medicine_reference[0] 
          : pm?.medicine_reference;
        const quantity = item.quantity;
        const unitPrice = pm?.price || 0;

        if (!pm) {
          console.warn("⚠️ Skipping item with missing pharmacy_medicine data");
          continue;
        }

        // Insert order_item
        await supabase.from("order_items").insert([{
          order_id: order.order_id,
          medicine_name: ref?.medicine_name || "Unknown",
          quantity,
          unit_price: unitPrice,
          subtotal: unitPrice * quantity,
          created_at: new Date().toISOString(),
        }]);

        // Deduct stock
        const newStock = Math.max((pm.stock || 0) - quantity, 0);
        await supabase
          .from("pharmacy_medicine")
          .update({ stock: newStock })
          .eq("id", pm.id);
      }

      // 6️⃣ Clear cart
      await supabase.from("cart_item").delete().eq("user_id", userId);

      Alert.alert(
        "🎉 Payment Successful!",
        `Your order has been placed.\nPharmacy: ${pharmacyName}\nTotal: RM ${totalAmount.toFixed(2)}`,
        [
          {
            text: "View Orders",
            onPress: () => router.replace("/orderHistory"),
          },
        ]
      );
    } catch (err: any) {
      console.error("Payment error:", err);
      Alert.alert("Payment Failed", err.message || "Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerSection}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Image source={backArrow} style={styles.backIcon} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Payment</Text>
            <Text style={styles.pharmacyText}>{pharmacyName || "Pharmacy"}</Text>
          </View>
        </View>

        <View style={styles.orderSummary}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          {cartItems.map((item, idx) => {
            const pm = Array.isArray(item.pharmacy_medicine)
              ? item.pharmacy_medicine[0]
              : item.pharmacy_medicine;
            const med = Array.isArray(pm?.medicine_reference)
              ? pm.medicine_reference[0]
              : pm?.medicine_reference;
            const qty = item.quantity;
            const price = pm?.price || 0;
            return (
              <View key={idx} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medicineName}>{med?.medicine_name || "Unknown Medicine"}</Text>
                  <Text style={styles.quantityText}>
                    Qty: {qty} × RM {price.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>RM {(price * qty).toFixed(2)}</Text>
              </View>
            );
          })}
          <View style={styles.summaryDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>RM {cartTotal.toFixed(2)}</Text>
          </View>
        </View>

      <TouchableOpacity
        style={[styles.payButton, (isProcessing || cartItems.length === 0) && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={isProcessing || cartItems.length === 0}
      >
        {isProcessing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.payButtonText}>Processing…</Text>
          </View>
        ) : (
          <Text style={styles.payButtonText}>Pay RM {cartTotal.toFixed(2)}</Text>
        )}
      </TouchableOpacity>

      <Pressable style={styles.cancelButton} onPress={handleBack} disabled={isProcessing}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HandlePaymentCart;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 16,
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
  },
  pharmacyText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
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
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  medicineName: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  quantityText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    color: "#2563EB",
  },
  payButton: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  processingRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  cancelButton: {
    alignItems: "center",
    padding: 12,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 16,
  },
});
