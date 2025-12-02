import {  View, 
  Text, 
  Button, // Add Button here
  Alert,} from "react-native"; // Add this import

const handlePayment = async () => {
  try {
    setIsProcessing(true);
    console.log("🔵 handlePayment STARTED");

    // 1️⃣ Get user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user.id;
    if (!userId) {
      console.log("❌ No user ID found");
      throw new Error("Please login first");
    }
    console.log("✅ User ID:", userId);

    // Log props at the beginning
    console.log("🔍 Payment component received props:", {
      medicineName,
      quantity: quantityNum,
      total: totalPriceNum,
      hasShippingAddress: !!shippingAddress,
      hasPassedUnitPrice: passedUnitPrice !== undefined,
      medicineId,
      pharmacyName
    });

    // DEBUG: Log all available data
    console.log("📊 Payment debug data:", {
      userId,
      medicineId,
      medicineName,
      quantityNum: quantityNum || "undefined",
      totalPriceNum: totalPriceNum || "undefined",
      passedUnitPrice: passedUnitPrice !== undefined ? passedUnitPrice : "UNDEFINED",
      unitPrice: totalPriceNum / quantityNum,
      pharmacyName: pharmacyName || "undefined",
      shippingAddress: shippingAddress || "NOT PROVIDED"
    });

    // 2️⃣ Call Supabase Edge Function to create PaymentIntent
    console.log("📤 Creating payment intent...");
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ amount: totalPriceNum * 100, currency: "myr" })
    });

    const paymentIntentData = await res.json();
    console.log("Payment intent response:", paymentIntentData);

    const { clientSecret, error: paymentIntentError } = paymentIntentData;
    if (paymentIntentError) throw new Error(paymentIntentError);

    // 3️⃣ Initialize Payment Sheet
    console.log("🔄 Initializing payment sheet...");
    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      returnURL: "yourapp://stripe-redirect" // Add this line
    });
    if (initError) {
      console.error("❌ Payment sheet init error:", initError);
      throw new Error(initError.message);
    }

    // 4️⃣ Present Payment Sheet
    console.log("💳 Presenting payment sheet...");
    const { error: paymentError } = await presentPaymentSheet();
    if (paymentError) {
      console.error("❌ Payment sheet error:", paymentError);
      throw new Error(paymentError.message);
    }

    console.log("✅ Payment successful!");

    // 5️⃣ Payment success → update Supabase
    console.log("📦 Updating stock...");
    const newStock = currentStockNum + quantityNum;
    console.log("Stock update:", { medicineId, currentStockNum, quantityNum, newStock });

    const { error: stockError } = await supabase
      .from("medicines")
      .update({ current_stock: newStock })
      .eq("medicine_id", medicineId);

    if (stockError) {
      console.error("❌ Stock update error:", stockError);
      throw new Error(`Stock update failed: ${stockError.message}`);
    }
    console.log("✅ Stock updated");

    // 6️⃣ Calculate unit price
    const unitPrice = passedUnitPrice !== undefined ? passedUnitPrice : (totalPriceNum / quantityNum);
    console.log("💰 Unit price:", unitPrice);

    // 7️⃣ Create order
    const orderData = {
      user_id: userId,
      status: "completed",
      total_amount: totalPriceNum,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pharmacy_name: pharmacyName || "Unknown Pharmacy",
      shipping_address: shippingAddress || "Address not provided",
      payment_method: "stripe",
      quantity: quantityNum,
      medicine_name: medicineName || "Unknown Medicine",
    };

    console.log("📝 Creating order with data:", orderData);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      console.error("❌ Order creation error:", orderError);
      console.error("Error details:", orderError.message, orderError.details);
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    console.log("✅ Order created with ID:", order.order_id);

    // 8️⃣ Create order item(s)
    const orderItemsData = {
      order_id: order.order_id,
      medicine_name: medicineName || "Unknown Medicine",
      quantity: quantityNum,
      unit_price: unitPrice,
      created_at: new Date().toISOString(),
    };

    console.log("📦 Creating order item with data:", orderItemsData);

    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert([orderItemsData])
      .select();

    if (itemsError) {
      console.error("❌ Order items creation error:", itemsError);
      console.error("Error details:", itemsError.message, itemsError.details, itemsError.hint);
      throw new Error(`Order items creation failed: ${itemsError.message}`);
    }

    console.log("✅ Order items created successfully:", insertedItems);

    // 9️⃣ VERIFY IMMEDIATELY
    console.log("🔍 Verifying order items in database...");
    const { data: verifyData, error: verifyError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.order_id);

    if (verifyError) {
      console.error("❌ Verification error:", verifyError);
    } else {
      console.log("✅ Verification successful. Items found:", verifyData.length);
      console.log("Items:", verifyData);
    }

    console.log("🎉 Payment process COMPLETE!");
    Alert.alert("Success", "Payment complete! Order saved.");

    // Delay navigation to ensure logs are captured
    setTimeout(() => {
      router.push("/(tabs)/meds");
    }, 100);

  } catch (error: any) {
    console.error("💥 Payment error:", error);
    console.error("Error stack:", error.stack);
    Alert.alert("Payment Failed", error.message || "Something went wrong");
  } finally {
    console.log("🏁 handlePayment FINISHED");
    setIsProcessing(false);
  }
};

// SEPARATE FUNCTION - Outside handlePayment
const testDirectInsertion = async () => {
  try {
    console.log("🧪 TEST: Direct order items insertion");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No user");
      return;
    }

    // Create a test order first
    const orderData = {
      user_id: user.id,
      status: "completed",
      total_amount: 99.99,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pharmacy_name: "Test Pharmacy",
      shipping_address: "Test Address",
      payment_method: "test",
      quantity: 5,
      medicine_name: "Test Medicine",
    };

    const { data: testOrder, error: orderError } = await supabase
      .from("orders")
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      console.error("Test order error:", orderError);
      return;
    }

    console.log("Test order created:", testOrder.order_id);

    // Now test order_items insertion
    const testItemData = {
      order_id: testOrder.order_id,
      medicine_name: "Test Medicine",
      quantity: 5,
      unit_price: 19.998,
      created_at: new Date().toISOString(),
    };

    console.log("Test inserting order item:", testItemData);

    const { data: inserted, error: insertError } = await supabase
      .from("order_items")
      .insert([testItemData])
      .select();

    if (insertError) {
      console.error("❌ Test insertion failed:", insertError);
    } else {
      console.log("✅ Test insertion successful:", inserted);
    }

  } catch (error) {
    console.error("Test error:", error);
  }
};
