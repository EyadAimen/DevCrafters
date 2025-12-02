import * as React from "react";
import {Text, StyleSheet, View, Pressable, Image, ScrollView, Alert, ActivityIndicator} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from '../../lib/supabase';

// Import your actual images
const backArrow = require("../../assets/backArrow.png");

const OnlineRefillOrder3 = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  // Helper function to safely get params
  const getParam = (key: string): string => {
    const value = params[key];
    if (Array.isArray(value)) {
      return value[0] || "";
    }
    return value || "";
  };
  
  // Get data from params
  const medicineId = getParam("medicineId");
  const medicineName = getParam("medicineName");
  const dosage = getParam("dosage");
  const pharmacyId = getParam("pharmacyId");
  const pharmacyName = getParam("pharmacyName");
  const quantity = getParam("quantity");
  const totalPrice = getParam("totalPrice");
  const unitPrice = getParam("unitPrice");
  const currentStock = getParam("currentStock");
  
  // Convert to numbers
  const quantityNum = parseInt(quantity) || 0;
  const unitPriceNum = parseFloat(unitPrice) || 0;
  const totalPriceNum = parseFloat(totalPrice) || 0;
  const currentStockNum = parseInt(currentStock) || 0;
  
  const handlePayment = async () => {
    console.log("Starting payment process...");
    
    // Validate inputs
    if (!medicineId) {
      Alert.alert("Error", "Medicine information is missing.");
      return;
    }
    
    if (quantityNum <= 0) {
      Alert.alert("Error", "Please enter a valid quantity.");
      return;
    }
    
    if (totalPriceNum <= 0) {
      Alert.alert("Error", "Total price must be greater than 0.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // 1. Get current user session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        throw new Error("Please login to complete your purchase.");
      }
      
      const userId = sessionData.session.user.id;
      console.log("User ID:", userId);
      
      // 2. Get current medicine stock from database
      const { data: medicineData, error: medicineError } = await supabase
        .from('medicines')
        .select('current_stock')
        .eq('medicine_id', medicineId)
        .single();
      
      const currentStockBefore = medicineData?.current_stock || currentStockNum;
      const newStock = currentStockBefore + quantityNum;
      
      console.log("Stock update:", {
        currentStockBefore,
        quantityNum,
        newStock
      });
      
      // 3. Update medicine stock in medicines table - SIMPLE VERSION
      const { error: updateError } = await supabase
        .from('medicines')
        .update({ current_stock: newStock })
        .eq('medicine_id', medicineId);
      
      if (updateError) {
        throw new Error(`Failed to update medicine stock: ${updateError.message}`);
      }
      
      console.log("✅ Medicine stock updated!");
      
      // 4. Save order to orders table - USING ONLY COLUMNS WE KNOW EXIST
      const orderData = {
        user_id: userId,
        medicine_id: medicineId,
        pharmacy_id: pharmacyId || null,
        pharmacy_name: pharmacyName || "Unknown Pharmacy",
        medicine_name: medicineName || "Unknown Medicine",
        quantity: quantityNum,
        status: "completed",
        total_amount: totalPriceNum,
        created_at: new Date().toISOString()
      };
      
      console.log("Saving order data:", orderData);
      
      // Try insert WITHOUT .select() first
      const { error: orderError } = await supabase
        .from('orders')
        .insert([orderData]);
      
      if (orderError) {
        console.error("Order save error:", orderError);
        
        // Try one more time with minimal data
        const minimalOrderData = {
          user_id: userId,
          medicine_id: medicineId,
          pharmacy_id: pharmacyId || null,
          medicine_name: medicineName || "Medicine",
          quantity: quantityNum,
          created_at: new Date().toISOString()
        };
        
        console.log("Trying minimal order:", minimalOrderData);
        
        const { error: minimalError } = await supabase
          .from('orders')
          .insert([minimalOrderData]);
        
        if (minimalError) {
          console.error("Minimal order failed:", minimalError);
          // Show the exact error
          Alert.alert(
            "Order Save Failed",
            `Error: ${minimalError.message}\n\n` +
            `Tried to insert: ${JSON.stringify(minimalOrderData, null, 2)}`
          );
          return;
        }
      }
      
      console.log("✅ Order saved to database!");
      
      // 5. Show success message
      Alert.alert(
        "✅ SUCCESS! Order Saved to Database",
        `Your order has been processed!\n\n` +
        `Medicine: ${medicineName}\n` +
        `Quantity: ${quantityNum} units\n` +
        `Total: RM ${totalPriceNum.toFixed(2)}\n` +
        `Stock updated: ${currentStockBefore} → ${newStock} units\n\n` +
        `✅ Order saved to 'orders' table\n` +
        `✅ Medicine stock updated`,
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate directly to medicine list
              router.push("/(tabs)/meds");
            }
          }
        ]
      );
      
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert(
        "Error",
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleBack = () => {
    // Direct navigation to avoid back issues
    router.push("/(tabs)/meds");
  };
  
  // Check if payment button should be enabled
  const isPaymentEnabled = quantityNum > 0 && totalPriceNum > 0 && medicineId;
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Image source={backArrow} style={styles.backIcon} resizeMode="contain" />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.requestRefill}>Request Refill</Text>
            <Text style={styles.medicineName}>{medicineName || "Medicine"}</Text>
          </View>
        </View>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, styles.stepCompleted]}>
              <Text style={styles.stepTextCompleted}>✓</Text>
            </View>
            <Text style={styles.stepLabelCompleted}>Pharmacy</Text>
          </View>
          <View style={styles.stepLineCompleted} />
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, styles.stepCompleted]}>
              <Text style={styles.stepTextCompleted}>✓</Text>
            </View>
            <Text style={styles.stepLabelCompleted}>Quantity</Text>
          </View>
          <View style={styles.stepLineCompleted} />
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Text style={styles.stepTextActive}>3</Text>
            </View>
            <Text style={styles.stepLabelActive}>Payment</Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Medicine:</Text>
              <Text style={styles.summaryValue}>{medicineName || "N/A"}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Quantity:</Text>
              <Text style={styles.summaryValue}>{quantityNum} units</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Unit Price:</Text>
              <Text style={styles.summaryValue}>RM {unitPriceNum.toFixed(2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Price:</Text>
              <Text style={[styles.summaryValue, styles.highlightText]}>
                RM {totalPriceNum.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pharmacy:</Text>
              <Text style={styles.summaryValue}>{pharmacyName || "Not specified"}</Text>
            </View>
            
            {pharmacyId ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pharmacy ID:</Text>
                <Text style={styles.summaryValue}>{pharmacyId}</Text>
              </View>
            ) : null}
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Stock Update:</Text>
              <Text style={[styles.summaryValue, styles.stockUpdateText]}>
                {currentStockNum} + {quantityNum} = {currentStockNum + quantityNum} units
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Button */}
        <Pressable 
          style={[
            styles.paymentButton,
            (!isPaymentEnabled || isProcessing) && styles.paymentButtonDisabled
          ]} 
          onPress={handlePayment}
          disabled={!isPaymentEnabled || isProcessing}
        >
          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.paymentButtonText}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.paymentButtonText}>
              {isPaymentEnabled 
                ? `Pay RM ${totalPriceNum.toFixed(2)} & Save Order` 
                : 'Complete order details'
              }
            </Text>
          )}
        </Pressable>
        
        {/* Cancel Button */}
        <Pressable 
          style={[
            styles.cancelButton,
            isProcessing && styles.cancelButtonDisabled
          ]} 
          onPress={handleBack}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>Cancel Order</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  requestRefill: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  medicineName: {
    fontSize: 16,
    color: "#64748b",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  progressStep: {
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepCompleted: {
    backgroundColor: "#0ea5e9",
  },
  stepActive: {
    backgroundColor: "#0ea5e9",
  },
  stepText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  stepTextCompleted: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  stepTextActive: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  stepLabel: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  stepLabelCompleted: {
    fontSize: 12,
    color: "#0ea5e9",
    fontWeight: "600",
    textAlign: "center",
  },
  stepLabelActive: {
    fontSize: 12,
    color: "#0ea5e9",
    fontWeight: "600",
    textAlign: "center",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 8,
    marginBottom: 20,
  },
  stepLineCompleted: {
    flex: 1,
    height: 2,
    backgroundColor: "#0ea5e9",
    marginHorizontal: 8,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#64748b",
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
    flex: 2,
    textAlign: "right",
  },
  highlightText: {
    color: "#0ea5e9",
    fontWeight: "600",
  },
  stockUpdateText: {
    color: "#10b981",
    fontWeight: "600",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
  },
  paymentButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#0ea5e9",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentButtonDisabled: {
    backgroundColor: "#cbd5e1",
    shadowColor: "#cbd5e1",
  },
  paymentButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default OnlineRefillOrder3;