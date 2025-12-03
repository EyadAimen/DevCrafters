import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { initPaymentSheet, presentPaymentSheet } from "@stripe/stripe-react-native";

const handlePaymentCart = () => {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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
    const price = item.pharmacy_medicine?.price || 0;
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
      // 1️⃣ Create PaymentIntent via Supabase Edge Function
      const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: process.env.SUPABASE_ANON_KEY! },
        body: JSON.stringify({ amount: cartTotal * 100, currency: "myr" }),
      });

      const { clientSecret, error: paymentIntentError } = await res.json();
      if (paymentIntentError) throw new Error(paymentIntentError);

      // 2️⃣ Initialize Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        returnURL: "pillora://stripe-redirect",
      });
      if (initError) throw new Error(initError.message);

      // 3️⃣ Present Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) throw new Error(paymentError.message);

      // 4️⃣ Payment successful, create order
      const totalAmount = cartTotal;
      const orderData = {
        user_id: userId,
        status: "completed",
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pharmacy_name: cartItems[0]?.pharmacy_medicine?.pharmacy_name || "Unknown Pharmacy",
        shipping_address: "Address not provided",
        payment_method: "stripe",
        quantity: cartItems.reduce((acc, i) => acc + i.quantity, 0),
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([orderData])
        .select()
        .single();
      if (orderError) throw orderError;

      // 5️⃣ Create order_items & deduct stock
      for (const item of cartItems) {
        const medicine = item.pharmacy_medicine;
        const ref = medicine.medicine_reference;
        const quantity = item.quantity;

        // Insert order_item
        await supabase.from("order_items").insert([{
          order_id: order.order_id,
          medicine_name: ref?.medicine_name || "Unknown",
          quantity,
          unit_price: medicine.price,
          created_at: new Date().toISOString(),
        }]);

        // Deduct stock
        const newStock = Math.max((medicine.stock || 0) - quantity, 0);
        await supabase
          .from("pharmacy_medicine")
          .update({ stock: newStock })
          .eq("id", medicine.id);
      }

      // 6️⃣ Clear cart
      await supabase.from("cart_item").delete().eq("user_id", userId);

      Alert.alert("Success", "Payment complete! Order saved.");
      router.replace("/(tabs)/meds");
    } catch (err: any) {
      console.error("Payment error:", err);
      Alert.alert("Payment Failed", err.message || "Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text>Loading cart...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cart Summary</Text>
      {cartItems.map((item, idx) => {
        const med = item.pharmacy_medicine.medicine_reference;
        const qty = item.quantity;
        const price = item.pharmacy_medicine.price;
        return (
          <View key={idx} style={styles.cartItem}>
            <Text style={styles.cartText}>{med?.medicine_name || "Unknown"} x {qty}</Text>
            <Text style={styles.cartText}>RM {(price * qty).toFixed(2)}</Text>
          </View>
        );
      })}
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>Total:</Text>
        <Text style={styles.totalText}>RM {cartTotal.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={styles.payButton}
        onPress={handlePayment}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>Proceed to Payment</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default handlePaymentCart;

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 100 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  cartItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cartText: { fontSize: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 20 },
  totalText: { fontSize: 18, fontWeight: "bold" },
  payButton: { backgroundColor: "#2563EB", padding: 15, borderRadius: 8, alignItems: "center" },
  payButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
