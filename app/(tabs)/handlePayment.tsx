import { Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useRouter } from "expo-router";

// Main Payment Function
export const handlePayment = async ({
  medicineName,
  quantityNum,
  totalPriceNum,
  passedUnitPrice,
  medicineId,
  pharmacyId,
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
    const userId = sessionData?.session?.user?.id;
    if (!userId) throw new Error("Please login first");

    // 2️⃣ Verify pharmacy + get address
    const { data: pharmacy, error: pharmacyError } = await supabase
      .from("pharmacy")
      .select("pharmacy_id, pharmacy_name, pharmacy_address")
      .eq("pharmacy_id", pharmacyId)
      .single();

    if (pharmacyError || !pharmacy) {
      throw new Error("Invalid pharmacy_id provided");
    }

    // 3️⃣ Create Stripe PaymentIntent via Edge Function
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/create-payment-intent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          amount: totalPriceNum * 100,
          currency: "myr",
        }),
      }
    );

    const paymentIntentData = await res.json();
    if (paymentIntentData.error) throw new Error(paymentIntentData.error);

    // 4️⃣ Init payment sheet
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: "Pillora Pharmacy",
      paymentIntentClientSecret: paymentIntentData.clientSecret,
      returnURL: "yourapp://stripe-redirect",
    });
    if (initError) throw new Error(initError.message);

    // 5️⃣ Present payment sheet
    const { error: paymentError } = await presentPaymentSheet();
    if (paymentError) throw new Error(paymentError.message);

    console.log("✅ Payment successful");

    // 6️⃣ Update stock
    const newStock = currentStockNum + quantityNum;
    const { error: stockError } = await supabase
      .from("medicines")
      .update({ current_stock: newStock })
      .eq("medicine_id", medicineId);

    if (stockError) throw new Error(`Stock update failed: ${stockError.message}`);

    // 7️⃣ Calculate unit price
    const unitPrice =
      passedUnitPrice !== undefined ? passedUnitPrice : totalPriceNum / quantityNum;

    // 8️⃣ Create order
    const orderData = {
      user_id: userId,
      status: "completed",
      total_amount: totalPriceNum,
      pharmacy_id: pharmacyId,
      payment_method: "stripe",
      quantity: quantityNum,
      medicine_name: medicineName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert([orderData])
      .select()
      .single();

    if (orderError) throw new Error(`Order creation failed: ${orderError.message}`);

    // 9️⃣ Create order item
    const orderItemData = {
      order_id: order.order_id,
      medicine_name: medicineName,
      quantity: quantityNum,
      unit_price: unitPrice,
      created_at: new Date().toISOString(),
    };

    const { error: itemError } = await supabase
      .from("order_items")
      .insert([orderItemData]);

    if (itemError) throw new Error(`Order item creation failed: ${itemError.message}`);

    // 🔟 Build receipt data
    const receiptData = {
      receiptNumber: `RCPT-${order.order_id}`,
      date: new Date().toLocaleString(),
      pharmacy: {
        name: pharmacy.pharmacy_name,
        address: pharmacy.pharmacy_address,
      },
      items: [
        {
          medicineName,
          quantity: quantityNum,
          unitPrice,
          total: unitPrice * quantityNum,
        },
      ],
      payment: {
        method: "Stripe",
        status: "Paid",
      },
      summary: {
        total: totalPriceNum,
      },
    };

    // 1️⃣1️⃣ Save receipt to database
    const receiptInsertData = {
      order_id: order.order_id,
      user_id: userId,
      pharmacy_id: pharmacyId,
      receipt_number: receiptData.receiptNumber,
      total_amount: totalPriceNum,
      payment_method: "stripe",
      receipt_data: receiptData,
    };

    const { error: receiptError } = await supabase
      .from("receipts")
      .insert([receiptInsertData]);

    if (receiptError) throw new Error(`Receipt save failed: ${receiptError.message}`);

    console.log("✅ Receipt saved");

    Alert.alert("Success", "Payment complete!");

    // 1️⃣2️⃣ Redirect to receipt page
    router.push({
      pathname: "/receipt",
      params: {
        receipt: JSON.stringify(receiptData),
      },
    });
  } catch (error: any) {
    console.error("💥 Payment error:", error);
    Alert.alert("Payment Failed", error.message || "Something went wrong");
  } finally {
    setIsProcessing(false);
  }
};

