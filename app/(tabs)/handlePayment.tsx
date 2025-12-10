import { View, Text, Button, Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";

// Main Payment Function
export const handlePayment = async ({
  medicineName,
  quantityNum,
  totalPriceNum,
  passedUnitPrice,
  medicineId,
  pharmacyId, // required foreign key
  currentStockNum,
  initPaymentSheet,
  presentPaymentSheet,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  setIsProcessing,
}: any) => {
  const router = useRouter();

  try {
    setIsProcessing(true);
    console.log("🔵 handlePayment STARTED");

    // 1️⃣ Get user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user.id;
    if (!userId) throw new Error("Please login first");
    console.log("✅ User ID:", userId);

    // 1a️⃣ Verify pharmacy exists
    const { data: pharmacy, error: pharmacyError } = await supabase
      .from("pharmacy")
      .select("pharmacy_id, name")
      .eq("pharmacy_id", pharmacyId)
      .single();

    if (pharmacyError || !pharmacy) throw new Error("Invalid pharmacy_id provided");
    console.log("✅ Pharmacy verified:", pharmacy.name);

    // 2️⃣ Create PaymentIntent via Supabase Edge Function
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ amount: totalPriceNum * 100, currency: "myr" }),
    });

    const paymentIntentData = await res.json();
    const { clientSecret, error: paymentIntentError } = paymentIntentData;
    if (paymentIntentError) throw new Error(paymentIntentError);

    // 3️⃣ Initialize Payment Sheet
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: "Pillora Pharmacy",
      paymentIntentClientSecret: clientSecret,
      returnURL: "yourapp://stripe-redirect",
    });
    if (initError) throw new Error(initError.message);

    // 4️⃣ Present Payment Sheet
    const { error: paymentError } = await presentPaymentSheet();
    if (paymentError) throw new Error(paymentError.message);
    console.log("✅ Payment successful!");

    // 5️⃣ Update stock
    const newStock = currentStockNum + quantityNum;
    const { error: stockError } = await supabase
      .from("medicines")
      .update({ current_stock: newStock })
      .eq("medicine_id", medicineId);
    if (stockError) throw new Error(`Stock update failed: ${stockError.message}`);
    console.log("✅ Stock updated");

    // 6️⃣ Calculate unit price
    const unitPrice = passedUnitPrice !== undefined ? passedUnitPrice : totalPriceNum / quantityNum;

    // 7️⃣ Create order with valid pharmacy_id
    const orderData = {
      user_id: userId,
      status: "completed",
      total_amount: totalPriceNum,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pharmacy_id: pharmacyId,
      payment_method: "stripe",
      quantity: quantityNum,
      medicine_name: medicineName || "Unknown Medicine",
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([orderData])
      .select()
      .single();
    if (orderError) throw new Error(`Order creation failed: ${orderError.message}`);
    console.log("✅ Order created with ID:", order.order_id);

    // 8️⃣ Create order item(s)
    const orderItemsData = {
      order_id: order.order_id,
      medicine_name: medicineName || "Unknown Medicine",
      quantity: quantityNum,
      unit_price: unitPrice,
      created_at: new Date().toISOString(),
    };

    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert([orderItemsData])
      .select();
    if (itemsError) throw new Error(`Order items creation failed: ${itemsError.message}`);
    console.log("✅ Order items created successfully:", insertedItems);

    Alert.alert("Success", "Payment complete! Order saved.");
    router.push("/(tabs)/meds");

  } catch (error: any) {
    console.error("💥 Payment error:", error);
    Alert.alert("Payment Failed", error.message || "Something went wrong");
  } finally {
    setIsProcessing(false);
  }
};

// TEST FUNCTION
export const testDirectInsertion = async (pharmacyId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!pharmacyId) throw new Error("pharmacy_id is required for test insertion");

    // Verify pharmacy exists
    const { data: pharmacy, error: pharmacyError } = await supabase
      .from("pharmacy")
      .select("pharmacy_id, name")
      .eq("pharmacy_id", pharmacyId)
      .single();
    if (pharmacyError || !pharmacy) throw new Error("Invalid pharmacy_id for test");

    // Test order creation
    const orderData = {
      user_id: user.id,
      status: "completed",
      total_amount: 99.99,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pharmacy_id: pharmacyId,
      payment_method: "test",
      quantity: 5,
      medicine_name: "Test Medicine",
    };

    const { data: testOrder, error: orderError } = await supabase
      .from("orders")
      .insert([orderData])
      .select()
      .single();
    if (orderError) throw new Error(orderError.message);

    // Test order_items insertion
    const testItemData = {
      order_id: testOrder.order_id,
      medicine_name: "Test Medicine",
      quantity: 5,
      unit_price: 19.998,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from("order_items")
      .insert([testItemData])
      .select();

    if (insertError) console.error("❌ Test insertion failed:", insertError);
    else console.log("✅ Test insertion successful:", inserted);

  } catch (error) {
    console.error("Test error:", error);
  }
};

