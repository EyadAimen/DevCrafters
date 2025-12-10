import * as React from "react";
import {Text, StyleSheet, View, Pressable, Image, TextInput, ScrollView} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";

// Import your actual images
const backArrow = require("../../assets/backArrow.png");
const forwardIcon = require("../../assets/forwardIcon.png");

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
      return { isAvailable: false, availableStock: 0, referenceId: null, error: `Could not find medicine reference_id: ${medicineError?.message}` };
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
      return { isAvailable: false, availableStock: 0, referenceId, error: error.message };
    }

    const availableStock = stockData?.stock || 0;
    const isAvailable = availableStock >= requestedQuantity;

    return {
      referenceId,
      isAvailable,
      availableStock,
      error: null,
      message: isAvailable
        ? `Stock available: ${availableStock} units`
        : `Insufficient stock. Available: ${availableStock}, Requested: ${requestedQuantity}`
    };
  } catch (error: any) {
    console.error('Unexpected error checking stock:', error);
    return { isAvailable: false, availableStock: 0, referenceId: null, error: error.message };
  }
};

// Helper function to fetch medicine price
const fetchMedicinePrice = async (medicineId: string) => {
  try {
    // 1. Get medicine details from medicines table
    const { data: medicineData, error: medicineError } = await supabase
      .from('medicines')
      .select('medicine_name, dosage, generic_name, unit_price')
      .eq('medicine_id', medicineId)
      .single();

    if (medicineError || !medicineData) {
      console.error("Failed to fetch medicine details:", medicineError);
      return { price: null, message: "Could not find medicine details." };
    }

    const { medicine_name, dosage, generic_name, unit_price: medTablePrice } = medicineData;

    // 2. Try to get price from medicine_prices table
    let priceFromPriceTable = null;

    // Try exact match first
    const { data: exactMatch } = await supabase
      .from('medicine_prices')
      .select('unit_price')
      .eq('medicine_name', medicine_name)
      .maybeSingle();

    if (exactMatch?.unit_price) {
      priceFromPriceTable = exactMatch.unit_price;
    } else {
      // Try case-insensitive match
      const { data: similarMatch } = await supabase
        .from('medicine_prices')
        .select('unit_price')
        .ilike('medicine_name', medicine_name)
        .maybeSingle();

      if (similarMatch?.unit_price) {
        priceFromPriceTable = similarMatch.unit_price;
      } else if (generic_name) {
        // Try generic name match
        const { data: genericMatch } = await supabase
          .from('medicine_prices')
          .select('unit_price')
          .ilike('generic_name', generic_name)
          .maybeSingle();

        if (genericMatch?.unit_price) {
          priceFromPriceTable = genericMatch.unit_price;
        }
      }
    }

    // 3. Return the best available price
    const finalPrice = priceFromPriceTable || medTablePrice || 0;
    
    return {
      price: finalPrice,
      message: finalPrice ? "" : "Price not available",
      source: priceFromPriceTable ? "price_table" : medTablePrice ? "medicines_table" : "none"
    };
    
  } catch (error) {
    console.error("Error fetching medicine price:", error);
    return { price: 0, message: "Error fetching price." };
  }
};

const OnlineRefillOrder2 = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Helper function to safely get params
  const getParam = (key: string): string => {
    const value = params[key];
    if (Array.isArray(value)) {
      return value[0] || "";
    }
    return value || "";
  };
  
  // Get data with safe defaults
  const medicineId = getParam("medicineId");
  const medicineName = getParam("medicineName");
  const dosage = getParam("dosage");
  const genericName = getParam("genericName");
  const pharmacyId = getParam("pharmacyId");
  const pharmacyName = getParam("pharmacyName");
  const pharmacyAddress = getParam("pharmacyAddress");
  const readyTime = getParam("readyTime");
  const distanceParam = getParam("distance");
  const currentStock = getParam("currentStock");
  const passedUnitPrice = parseFloat(getParam("unitPrice")) || 0;
  
  // Fix: Parse distance safely and check for NaN
  const distanceNum = parseFloat(distanceParam);
  const distance = isNaN(distanceNum) ? "" : distanceNum.toFixed(1);
  
  const [quantity, setQuantity] = React.useState("30");
  const [unitPrice, setUnitPrice] = React.useState<number>(passedUnitPrice);
  const [priceMessage, setPriceMessage] = React.useState<string>("");
  
  // Calculate total
  const quantityNum = parseInt(quantity) || 0;
  const totalPrice = unitPrice * quantityNum;
  
  // Debug log to check params
  React.useEffect(() => {
    console.log("OnlineRefillOrder2 - Received params:", {
      medicineId,
      passedUnitPrice,
      medicineName,
      dosage,
      genericName,
      pharmacyId,
      pharmacyName,
      pharmacyAddress,
      readyTime,
      distance,
      currentStock
    });
  }, [medicineId, passedUnitPrice, params]);

  React.useEffect(() => {
    let isMounted = true;

    const fetchPrice = async () => {
      if (!medicineId) {
        if (isMounted) {
          setPriceMessage("No medicine selected. Please go back and pick a medicine.");
        }
        return;
      }

      if (isMounted) {
        setPriceMessage("Fetching latest price...");
      }

      const { price, message } = await fetchMedicinePrice(medicineId);

      if (isMounted) {
        setUnitPrice(price || 0);
        setPriceMessage(message);
        console.log("Price fetched:", { price, message });
      }
    };

    fetchPrice();

    return () => {
      isMounted = false;
    };
  }, [medicineId]);
  
  const handleContinue = async () => {
    if (quantityNum === 0) {
      alert("Please enter a valid quantity");
      return;
    }

    if (unitPrice <= 0) {
      alert("Price not available. Please try again later.");
      return;
    }

    // Check if pharmacy stock is sufficient before proceeding
    if (!pharmacyId) {
      alert("Pharmacy information is missing. Please go back and select a pharmacy.");
      return;
    }

    console.log("Checking pharmacy stock for:", {
      pharmacyId,
      medicineId,
      quantity: quantityNum
    });

    const stockCheck = await checkMedicineStock(pharmacyId, medicineId, quantityNum);

    if (!stockCheck.isAvailable) {
      console.log("Stock check failed:", stockCheck);
      alert(`Insufficient stock at pharmacy!\n\nAvailable: ${stockCheck.availableStock} units\nRequested: ${quantityNum} units\n\nPlease select a different pharmacy or reduce quantity.`);
      return;
    }

    console.log("Stock check passed:", stockCheck.message);

    // Pass data to next screen
    const paramsToPass: Record<string, string> = {
      medicineId: medicineId,
      referenceId: stockCheck.referenceId || "", // Pass the referenceId
      unitPrice: unitPrice.toString(),
      medicineName,
      dosage,
      genericName,
      pharmacyName,
      pharmacyAddress,
      quantity: quantity,
      totalPrice: totalPrice.toFixed(2)
    };

    // Only add optional fields if they exist and are valid
    if (readyTime) paramsToPass.readyTime = readyTime;
    if (distance) paramsToPass.distance = distance;
    if (currentStock) paramsToPass.currentStock = currentStock;
    if (pharmacyId) paramsToPass.pharmacyId = pharmacyId;

    console.log("Passing to OnlineRefillOrder3:", paramsToPass);

    router.push({
      pathname: "/(tabs)/onlineRefillOrder3",
      params: paramsToPass
    });
  };
  
  const handleBack = () => {
    router.back();
  };
  
  const handleQuantityChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setQuantity(numericText);
  };
  
  // Function to safely display distance
  const formatDistance = () => {
    if (!distance) return "";
    return `${distance} km`;
  };
  
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
            <Text style={styles.medicineName}>
              {medicineName || "Medicine"} {dosage || ""}
            </Text>
            <Text style={styles.priceDisplay}>
              {unitPrice > 0 ? `RM ${unitPrice.toFixed(2)} per unit` : "Price loading..."}
            </Text>
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
            <View style={[styles.stepCircle, styles.stepActive]}>
              <Text style={styles.stepTextActive}>2</Text>
            </View>
            <Text style={styles.stepLabelActive}>Quantity</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.progressStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepText}>3</Text>
            </View>
            <Text style={styles.stepLabel}>Payment</Text>
          </View>
        </View>

        {/* Quantity Selection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Quantity</Text>
          
          <View style={styles.quantityCard}>
            <View style={styles.quantityInputContainer}>
              <Text style={styles.quantityLabel}>Number of pills/units</Text>
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="numeric"
                placeholder="Enter quantity"
                placeholderTextColor="#94A3B8"
                maxLength={4}
              />
              {quantityNum > 0 && unitPrice > 0 && (
                <Text style={styles.pricePreview}>
                  RM {unitPrice.toFixed(2)} × {quantity} = RM {totalPrice.toFixed(2)}
                </Text>
              )}
              {priceMessage ? (
                <Text style={styles.priceStatusText}>{priceMessage}</Text>
              ) : null}
            </View>
            
            {/* Quick Quantity Buttons */}
            <View style={styles.quickQuantityContainer}>
              <Text style={styles.quickQuantityLabel}>Quick select:</Text>
              <View style={styles.quantityButtons}>
                <Pressable style={styles.quantityButton} onPress={() => setQuantity("15")}>
                  <Text style={styles.quantityButtonText}>15</Text>
                </Pressable>
                <Pressable style={styles.quantityButton} onPress={() => setQuantity("30")}>
                  <Text style={styles.quantityButtonText}>30</Text>
                </Pressable>
                <Pressable style={styles.quantityButton} onPress={() => setQuantity("60")}>
                  <Text style={styles.quantityButtonText}>60</Text>
                </Pressable>
                <Pressable style={styles.quantityButton} onPress={() => setQuantity("90")}>
                  <Text style={styles.quantityButtonText}>90</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.summaryCard}>
            {/* Medicine Info */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Medicine:</Text>
              <Text style={styles.summaryValue}>
                {medicineName || "Not specified"} {dosage || ""}
              </Text>
            </View>
            
            {/* Generic Name - Only show if available */}
            {genericName ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Generic Name:</Text>
                <Text style={styles.summaryValue}>{genericName}</Text>
              </View>
            ) : null}
            
            {/* Pharmacy Info */}
            {pharmacyName ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pharmacy:</Text>
                <Text style={styles.summaryValue}>{pharmacyName}</Text>
              </View>
            ) : null}
            
            {/* Pharmacy Address - Only show if available */}
            {pharmacyAddress ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Address:</Text>
                <Text style={styles.summaryValueAddress}>{pharmacyAddress}</Text>
              </View>
            ) : null}
            
            {/* Ready Time - Only show if available */}
            {readyTime ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ready Time:</Text>
                <Text style={styles.summaryValue}>{readyTime}</Text>
              </View>
            ) : null}
            
            {/* Distance - Only show if valid */}
            {distance ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Distance:</Text>
                <Text style={styles.summaryValue}>{formatDistance()}</Text>
              </View>
            ) : null}
            
            {/* Current Stock - Only show if available */}
            {currentStock ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Current Stock:</Text>
                <Text style={styles.summaryValue}>{currentStock} units</Text>
              </View>
            ) : null}
            
            <View style={styles.summaryDivider} />
            
            {/* Price Breakdown */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Unit Price:</Text>
              <View style={styles.summaryValueColumn}>
                <Text style={styles.summaryValue}>
                  {unitPrice > 0 ? `RM ${unitPrice.toFixed(2)}` : "Price not available"}
                </Text>
                {priceMessage ? (
                  <Text style={styles.priceStatusText}>{priceMessage}</Text>
                ) : null}
              </View>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Quantity:</Text>
              <Text style={styles.summaryValue}>
                {quantityNum > 0 ? `${quantity} units` : "Not set"}
              </Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            {/* Total */}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.summaryTotalLabel}>Total Amount:</Text>
              <Text style={styles.summaryTotalValue}>
                {unitPrice > 0 && totalPrice > 0 ? `RM ${totalPrice.toFixed(2)}` : "RM 0.00"}
              </Text>
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <Pressable 
          style={[
            styles.continueButton,
            (quantityNum === 0 || unitPrice <= 0) && styles.continueButtonDisabled
          ]} 
          onPress={handleContinue}
          disabled={quantityNum === 0 || unitPrice <= 0}
        >
          <Text style={styles.continueButtonText}>
            Continue to Payment
          </Text>
          <Image source={forwardIcon} style={styles.arrowIcon} resizeMode="contain" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles remain the same...
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
  priceDisplay: {
    fontSize: 14,
    color: "#0ea5e9",
    fontWeight: "600",
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
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
  quantityCard: {
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
  quantityInputContainer: {
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    marginBottom: 8,
  },
  pricePreview: {
    fontSize: 14,
    color: "#0ea5e9",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "right",
  },
  quickQuantityContainer: {
    marginTop: 8,
  },
  quickQuantityLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
  },
  quantityButtons: {
    flexDirection: "row",
    gap: 12,
  },
  quantityButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  quantityButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
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
  totalRow: {
    alignItems: "center",
    marginBottom: 0,
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
  summaryValueColumn: {
    flex: 2,
    alignItems: "flex-end",
  },
  summaryValueAddress: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
    flex: 2,
    textAlign: "right",
    flexWrap: "wrap",
  },
  missingDataText: {
    color: "#ef4444",
    fontWeight: "600",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 16,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0ea5e9",
  },
  continueButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
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
  continueButtonDisabled: {
    backgroundColor: "#94a3b8",
    shadowColor: "#94a3b8",
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  arrowIcon: {
    width: 16,
    height: 16,
  },
  priceStatusText: {
    fontSize: 12,
    color: "#f97316",
    marginTop: 6,
    textAlign: "right",
  },
});

export default OnlineRefillOrder2;
