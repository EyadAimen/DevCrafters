import * as React from "react";
import {Text, StyleSheet, View, Pressable, Image, ScrollView, ActivityIndicator} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from '../../lib/supabase';

const backArrow = require("../../assets/backArrow.png");
const locationIcon = require("../../assets/locationIcon.png");
const nearestIcon = require("../../assets/nearest.png");
const forwardIcon = require("../../assets/forwardIcon.png");

interface Pharmacy {
  pharmacy_id: number;
  pharmacy_name: string;
  pharmacy_address: string;
  latitude: number;
  longitude: number;
  phone: string;
  distance?: number;
  ready_time?: string;
}

interface MedicineInfo {
  medicine_id: string;
  medicine_name: string;
  generic_name: string;
  dosage: string;
  unit_price: number;
}

const OnlineRefillOrder = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Helper to get params safely
  const getParam = (key: string): string => {
    const value = params[key];
    if (Array.isArray(value)) return value[0] || "";
    return value || "";
  };
  
  // Get medicine data from params
  const medicineId = getParam("medicineId");
  const passedMedicineName = getParam("medicineName");
  const passedDosage = getParam("dosage");
  const passedGenericName = getParam("genericName");
  const passedUnitPrice = parseFloat(getParam("unitPrice")) || 0;
  const currentStock = parseInt(getParam("currentStock")) || 0;
  
  const [selectedPharmacy, setSelectedPharmacy] = React.useState<Pharmacy | null>(null);
  const [pharmacies, setPharmacies] = React.useState<Pharmacy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [medicineInfo, setMedicineInfo] = React.useState<MedicineInfo | null>(null);
  
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  const getReadyTime = (distance: number) => {
    if (distance < 1) return '1 hour';
    if (distance < 3) return '2 hours';
    if (distance < 5) return '3 hours';
    return '4 hours';
  };
  
  // Function to fetch price from medicine_prices table
  const fetchMedicinePrice = async (medicineName: string, dosage: string, genericName: string) => {
    let finalPrice = passedUnitPrice;
    
    try {
      // Strategy 1: Try exact match with medicine_name and dosage
      const { data: exactMatch } = await supabase
        .from('medicine_prices')
        .select('unit_price')
        .eq('medicine_name', medicineName)
        .eq('dosage', dosage)
        .maybeSingle();
      
      if (exactMatch?.unit_price) {
        return exactMatch.unit_price;
      }
      
      // Strategy 2: Try case-insensitive medicine_name match
      const { data: caseInsensitiveMatch } = await supabase
        .from('medicine_prices')
        .select('unit_price')
        .ilike('medicine_name', medicineName)
        .maybeSingle();
      
      if (caseInsensitiveMatch?.unit_price) {
        return caseInsensitiveMatch.unit_price;
      }
      
      // Strategy 3: Try generic name match
      if (genericName) {
        const { data: genericMatch } = await supabase
          .from('medicine_prices')
          .select('unit_price')
          .ilike('generic_name', genericName)
          .maybeSingle();
        
        if (genericMatch?.unit_price) {
          return genericMatch.unit_price;
        }
      }
      
      // Strategy 4: Try any medicine_name containing the search term
      const { data: partialMatch } = await supabase
        .from('medicine_prices')
        .select('unit_price')
        .ilike('medicine_name', `%${medicineName}%`)
        .limit(1)
        .maybeSingle();
      
      if (partialMatch?.unit_price) {
        return partialMatch.unit_price;
      }
      
      return finalPrice; // Return passed price if nothing found
      
    } catch (error) {
      console.error('Error fetching price:', error);
      return finalPrice; // Return passed price on error
    }
  };
  
  React.useEffect(() => {
    console.log("OnlineRefillOrder - Received params:", {
      medicineId,
      passedMedicineName,
      passedDosage,
      passedGenericName,
      passedUnitPrice,
      currentStock
    });
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // If no medicineId, show error
        if (!medicineId) {
          throw new Error("No medicine selected. Please go back and select a medicine.");
        }
        
        let finalMedicineInfo: MedicineInfo;
        
        // Try to fetch fresh medicine data from database
        try {
          const { data: medicineData, error: medicineError } = await supabase
            .from('medicines')
            .select('medicine_id, medicine_name, generic_name, dosage')
            .eq('medicine_id', medicineId)
            .single();
          
          if (medicineError) throw medicineError;
          
          // Fetch price using our new function
          const fetchedPrice = await fetchMedicinePrice(
            medicineData.medicine_name,
            medicineData.dosage || '',
            medicineData.generic_name || ''
          );
          
          finalMedicineInfo = {
            medicine_id: medicineData.medicine_id,
            medicine_name: medicineData.medicine_name,
            generic_name: medicineData.generic_name || "",
            dosage: medicineData.dosage || "",
            unit_price: fetchedPrice
          };
          
          console.log('Fetched medicine info:', {
            name: medicineData.medicine_name,
            price: fetchedPrice,
            source: fetchedPrice === passedUnitPrice ? 'passed param' : 'database'
          });
          
        } catch (dbError) {
          console.log("Using passed data instead of database:", dbError);
          // Use passed data if database fetch fails
          finalMedicineInfo = {
            medicine_id: medicineId,
            medicine_name: passedMedicineName || "Medicine",
            generic_name: passedGenericName || "",
            dosage: passedDosage || "",
            unit_price: passedUnitPrice || 0
          };
        }
        
        setMedicineInfo(finalMedicineInfo);
        
        // Fetch pharmacies
        const { data: pharmacyData, error: pharmacyError } = await supabase
          .from('pharmacy')
          .select('*')
          .order('pharmacy_name');
        
        if (pharmacyError) throw pharmacyError;
        
        if (pharmacyData) {
          // Calculate distance and ready time for each pharmacy
          const pharmaciesWithDetails = pharmacyData.map((pharmacy: any) => {
            const distance = calculateDistance(
              1.4923, 103.7413, // User location (placeholder)
              pharmacy.latitude,
              pharmacy.longitude
            );
            
            const ready_time = getReadyTime(distance);
            
            return {
              ...pharmacy,
              pharmacy_id: pharmacy.pharmacy_id,
              distance: distance,
              ready_time: ready_time
            };
          });
          
          // Sort by distance
          pharmaciesWithDetails.sort((a, b) => (a.distance || 0) - (b.distance || 0));
          setPharmacies(pharmaciesWithDetails);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError('Failed to load data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [medicineId]);
  
  const handleContinue = () => {
    if (!selectedPharmacy || !medicineInfo) {
      alert("Please select a pharmacy first");
      return;
    }
    
    // Pass ALL data to next screen
    router.push({
      pathname: "/(tabs)/onlineRefillOrder2",
      params: {
        // Medicine info
        medicineId: medicineInfo.medicine_id,
        medicineName: medicineInfo.medicine_name,
        dosage: medicineInfo.dosage,
        genericName: medicineInfo.generic_name,
        unitPrice: medicineInfo.unit_price.toString(),
        currentStock: currentStock.toString(),
        
        // Pharmacy info
        pharmacyId: selectedPharmacy.pharmacy_id.toString(),
        pharmacyName: selectedPharmacy.pharmacy_name,
        pharmacyAddress: selectedPharmacy.pharmacy_address,
        readyTime: selectedPharmacy.ready_time || "Within 4 hours",
        distance: selectedPharmacy.distance?.toFixed(1) || "0"
      }
    });
  };

  const handlePharmacySelect = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
  };
  
  const formatReadyTime = (pharmacy: Pharmacy) => {
    // Check if distance is a valid number
    if (typeof pharmacy.distance !== 'number' || isNaN(pharmacy.distance)) {
      return 'Ready in 4 hours';
    }
    
    const distance = `${pharmacy.distance.toFixed(1)} km`;
    const readyTime = pharmacy.ready_time || '4 hours';
    return `${distance} · Ready in ${readyTime}`;
  };
  
  const formatPrice = () => {
    if (!medicineInfo) return "Loading price...";
    if (medicineInfo.unit_price <= 0) return "Price not available";
    return `RM ${medicineInfo.unit_price.toFixed(2)} per unit`;
  };
  
  const formatMedicinePrice = () => {
    if (!medicineInfo) return "Loading price...";
    if (medicineInfo.unit_price <= 0) return "Price not available";
    return `RM ${medicineInfo.unit_price.toFixed(2)} per unit`;
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading pharmacies...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => window.location.reload()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <View style={styles.backButtonContainer}>
              <Pressable onPress={() => router.back()}>
                <Image source={backArrow} style={styles.backIcon} resizeMode="contain" />
              </Pressable>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.requestRefill}>Request Refill</Text>
              {medicineInfo ? (
                <>
                  <Text style={styles.medicineName}>{medicineInfo.medicine_name} {medicineInfo.dosage}</Text>
                  <Text style={styles.genericName}>{medicineInfo.generic_name || "Generic name not available"}</Text>
                  <Text style={styles.medicinePrice}>{formatMedicinePrice()}</Text>
                  {currentStock > 0 && (
                    <Text style={styles.currentStock}>Current stock: {currentStock} units</Text>
                  )}
                </>
              ) : (
                <Text style={styles.medicineName}>Loading medicine info...</Text>
              )}
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Text style={styles.stepTextActive}>1</Text>
              </View>
              <Text style={styles.stepLabelActive}>Pharmacy</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.progressStep}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepText}>2</Text>
              </View>
              <Text style={styles.stepLabel}>Quantity</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.progressStep}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepText}>3</Text>
              </View>
              <Text style={styles.stepLabel}>Payment</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Pharmacy</Text>
            
            <View style={styles.pharmacyCards}>
              {pharmacies.map((pharmacy) => {
                const isSelected = selectedPharmacy?.pharmacy_id === pharmacy.pharmacy_id;
                
                return (
                  <Pressable 
                    key={pharmacy.pharmacy_id}
                    style={[
                      styles.pharmacyCard,
                      isSelected && styles.pharmacyCardSelected
                    ]} 
                    onPress={() => handlePharmacySelect(pharmacy)}
                  >
                    <View style={styles.pharmacyHeader}>
                      <Text style={styles.pharmacyName}>{pharmacy.pharmacy_name}</Text>
                      {/* FIXED: Check if distance is a valid number and less than 1 */}
                      {typeof pharmacy.distance === 'number' && !isNaN(pharmacy.distance) && pharmacy.distance < 1 && (
                        <View style={styles.nearestBadge}>
                          <Text style={styles.nearestBadgeText}>Nearest</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.pharmacyInfo}>
                      <Image source={locationIcon} style={styles.icon} resizeMode="contain" />
                      <Text style={styles.pharmacyAddress}>{pharmacy.pharmacy_address || "Address not available"}</Text>
                    </View>
                    <View style={styles.readyTimeContainer}>
                      <Image source={nearestIcon} style={styles.icon} resizeMode="contain" />
                      <Text style={styles.readyTime}>{formatReadyTime(pharmacy)}</Text>
                    </View>
                    
                    {/* Show the fixed medicine price */}
                    {medicineInfo && medicineInfo.unit_price > 0 && (
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceText}>
                          {formatPrice()}
                        </Text>
                      </View>
                    )}
                    
                    {isSelected && (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedIndicatorText}>✓ Selected</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
              
              {pharmacies.length === 0 && (
                <View style={styles.noPharmaciesContainer}>
                  <Text style={styles.noPharmaciesText}>No pharmacies available in your area</Text>
                </View>
              )}
            </View>
          </View>

          {selectedPharmacy && medicineInfo && medicineInfo.unit_price > 0 && (
            <View style={styles.totalPreview}>
              <Text style={styles.totalPreviewText}>
                Unit Price: <Text style={styles.totalPreviewPrice}>RM {medicineInfo.unit_price.toFixed(2)}</Text>
              </Text>
              <Text style={styles.totalPreviewNote}>
                Total = RM {medicineInfo.unit_price.toFixed(2)} × Quantity
              </Text>
            </View>
          )}

          <Pressable 
            style={[
              styles.continueButton,
              !selectedPharmacy && styles.continueButtonDisabled
            ]} 
            onPress={handleContinue}
            disabled={!selectedPharmacy}
          >
            <Text style={styles.continueButtonText}>
              {selectedPharmacy ? 'Continue to Quantity' : 'Select a Pharmacy to Continue'}
            </Text>
            <Image source={forwardIcon} style={styles.arrowIcon} resizeMode="contain" />
          </Pressable>
        </View>
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
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  backButtonContainer: {
    marginRight: 12,
    marginTop: 4,
  },
  backIcon: {
    width: 24,
    height: 24,
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
  genericName: {
    fontSize: 14,
    color: "#94a3b8",
    fontStyle: 'italic',
  },
  medicinePrice: {
    fontSize: 14,
    color: "#0ea5e9",
    fontWeight: "600",
    marginTop: 2,
  },
  currentStock: {
    fontSize: 12,
    color: "#64748b",
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
  stepActive: {
    backgroundColor: "#0ea5e9",
  },
  stepText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 16,
  },
  pharmacyCards: {
    gap: 16,
  },
  pharmacyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
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
  pharmacyCardSelected: {
    borderColor: "#0ea5e9",
    backgroundColor: "#f0f9ff",
    borderWidth: 2,
  },
  pharmacyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
  },
  nearestBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nearestBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
  },
  pharmacyInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  readyTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  icon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  pharmacyAddress: {
    fontSize: 14,
    color: "#475569",
    flex: 1,
  },
  readyTime: {
    fontSize: 14,
    color: "#475569",
  },
  priceContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0ea5e9",
  },
  selectedIndicator: {
    marginTop: 8,
    padding: 6,
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  selectedIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065f46",
  },
  totalPreview: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  totalPreviewText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  totalPreviewPrice: {
    color: "#0ea5e9",
  },
  totalPreviewNote: {
    fontSize: 12,
    color: "#64748b",
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  noPharmaciesContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noPharmaciesText: {
    fontSize: 16,
    color: '#64748b',
  },
});

export default OnlineRefillOrder;