import { useStripe } from "@stripe/stripe-react-native";
const { initPaymentSheet, presentPaymentSheet } = useStripe();
const handlePayment = async () => {
  try {
    setIsProcessing(true);

    // 1️⃣ Get user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user.id;
    if (!userId) throw new Error("Please login first");

    // 2️⃣ Call Supabase Edge Function to create PaymentIntent
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ amount: totalPriceNum * 100, currency: "myr" })
    });

    const { clientSecret, error } = await res.json();
    if (error) throw new Error(error);

    // 3️⃣ Initialize Payment Sheet
    const { error: initError } = await initPaymentSheet({ paymentIntentClientSecret: clientSecret });
    if (initError) throw new Error(initError.message);

    // 4️⃣ Present Payment Sheet
    const { error: paymentError } = await presentPaymentSheet();
    if (paymentError) throw new Error(paymentError.message);

    // 5️⃣ Payment success → update Supabase
    const newStock = currentStockNum + quantityNum;

    await supabase.from("medicines").update({ current_stock: newStock }).eq("medicine_id", medicineId);

    await supabase.from("orders").insert([{
      user_id: userId,
      medicine_id: medicineId,
      pharmacy_id: pharmacyId || null,
      pharmacy_name: pharmacyName || "Unknown Pharmacy",
      medicine_name: medicineName || "Unknown Medicine",
      quantity: quantityNum,
      status: "completed",
      total_amount: totalPriceNum,
      created_at: new Date().toISOString(),
    }]);

    Alert.alert("Success", "Payment complete! Order saved.");
    router.push("/(tabs)/meds");

  } catch (error: any) {
    Alert.alert("Payment Failed", error.message || "Something went wrong");
  } finally {
    setIsProcessing(false);
  }
};
