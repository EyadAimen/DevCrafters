import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { generateReceiptPDF } from "../utils/generateReceiptPDF";
import { useState } from "react";

export default function ReceiptScreen() {
  const router = useRouter();
  const { receipt } = useLocalSearchParams();
  const data = JSON.parse(receipt as string);

  const [isShared, setIsShared] = useState(false);

  const handleShare = async () => {
    const fileName = await generateReceiptPDF(data);
    if (fileName) setIsShared(true);
  };

  const goBackToMedicine = () => {
    router.push("/meds"); // replace with your actual medicine screen route
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Payment Receipt</Text>

      {/* Receipt Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Receipt No:</Text>
        <Text style={styles.value}>{data.receiptNumber}</Text>

        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{data.date}</Text>
      </View>

      {/* Pharmacy Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Pharmacy</Text>
        <Text style={styles.value}>{data.pharmacy.name}</Text>
        <Text style={styles.value}>{data.pharmacy.address}</Text>
      </View>

      {/* Items */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items</Text>
        {data.items.map((item: any, index: number) => (
          <Text key={index} style={styles.value}>
            {index + 1}. {item.medicineName} - {item.quantity} x RM{" "}
            {item.unitPrice.toFixed(2)} = RM {item.total.toFixed(2)}
          </Text>
        ))}
        <Text style={styles.total}>Total Paid: RM {data.summary.total.toFixed(2)}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {!isShared ? (
          <>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share Receipt</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={goBackToMedicine}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.successButton} onPress={goBackToMedicine}>
            <Text style={styles.successButtonText}>Share Success! Back to Medicines</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f1f5f9" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20, color: "#0f172a", textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: { fontSize: 20, fontWeight: "600", color: "#0f172a", marginBottom: 10 },
  label: { fontWeight: "600", marginTop: 10, color: "#64748b" },
  value: { fontSize: 16, marginBottom: 5, color: "#0f172a" },
  total: { marginTop: 15, fontSize: 18, fontWeight: "bold", color: "#0ea5e9", textAlign: "right" },
  buttonContainer: { marginTop: 10, marginBottom: 30 },
  shareButton: {
    backgroundColor: "#0ea5e9",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  shareButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cancelButton: {
    backgroundColor: "#f87171",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  successButton: {
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  successButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});