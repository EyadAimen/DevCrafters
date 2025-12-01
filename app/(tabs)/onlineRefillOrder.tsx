import * as React from "react";
import {Text, StyleSheet, View, Pressable, Image, ScrollView, ActivityIndicator, Alert} from "react-native";
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
  price_source: 'database' | 'passed' | 'estimated' | 'not_found';
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
  
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (!medicineId) {
          throw new Error("No medicine selected. Please go back and select a medicine.");
        }
        
        // 1. Get medicine details from medicines table
        const { data: medicineData, error: medicineError } = await supabase
          .from('medicines')
          .select('medicine_name, generic_name, dosage')
          .eq('medicine_id', medicineId)
          .single();
        
        if (medicineError) throw medicineError;
        
        const medicineName = medicineData.medicine_name || passedMedicineName;
        const dosage = medicineData.dosage || passedDosage;
        const genericName = medicineData.generic_name || passedGenericName;
        
        console.log("Looking for price for:", { medicineName, dosage });
        
        // 2. Try to fetch price from medicine_prices table
        let price = passedUnitPrice;
        let priceSource: 'database' | 'passed' | 'estimated' | 'not_found' = 'not_found';
        
        if (medicineName && medicineName !== "Medicine") {
          const { data: priceData, error: priceError } = await supabase
            .from('medicine_prices')
            .select('unit_price')
            .ilike('medicine_name', `%${medicineName}%`)
            .limit(1)
            .maybeSingle();
          
          if (!priceError && priceData) {
            price = priceData.unit_price;
            priceSource = 'database';
            console.log("✅ Found price in database:", price);
          }
        }
        
        // 3. Create medicine info object
        const finalMedicineInfo: MedicineInfo = {
          medicine_id: medicineId,
          medicine_name: medicineName,
          generic_name: genericName,
          dosage: dosage,
          unit_price: price,
          price_source: priceSource
        };
        
        setMedicineInfo(finalMedicineInfo);
        
        // 4. Fetch pharmacies
        const { data: pharmacyData, error: pharmacyError } = await supabase
          .from('pharmacy')
          .select('*');
        
        if (pharmacyError) throw pharmacyError;
        
        if (pharmacyData) {
          const pharmaciesWithDetails = pharmacyData.map((pharmacy: any) => {
            const distance = calculateDistance(1.4923, 103.7413, pharmacy.latitude, pharmacy.longitude);
            return {
              ...pharmacy,
              distance: distance,
              ready_time: getReadyTime(distance)
            };
          });
          
          pharmaciesWithDetails.sort((a, b) => (a.distance || 0) - (b.distance || 0));
          setPharmacies(pharmaciesWithDetails);
        }
        
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
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
    
    router.push({
      pathname: "/(tabs)/onlineRefillOrder2",
      params: {
        medicineId: medicineInfo.medicine_id,
        medicineName: medicineInfo.medicine_name,
        dosage: medicineInfo.dosage,
        genericName: medicineInfo.generic_name,
        unitPrice: medicineInfo.unit_price.toString(),
        currentStock: currentStock.toString(),
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
    if (typeof pharmacy.distance !== 'number' || isNaN(pharmacy.distance)) {
      return 'Ready in 4 hours';
    }
    return `${pharmacy.distance.toFixed(1)} km · Ready in ${pharmacy.ready_time}`;
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Loading...</Text>
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
                <Image source={backArrow} style={styles.backIcon} />
              </Pressable>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.requestRefill}>Request Refill</Text>
              {medicineInfo && (
                <>
                  <Text style={styles.medicineName}>{medicineInfo.medicine_name} {medicineInfo.dosage}</Text>
                  <Text style={styles.medicinePrice}>
                    Price: {medicineInfo.unit_price > 0 ? `RM ${medicineInfo.unit_price.toFixed(2)}` : 'Not available'}
                  </Text>
                  {currentStock > 0 && (
                    <Text style={styles.currentStock}>Current stock: {currentStock} units</Text>
                  )}
                </>
              )}
            </View>
          </View>

          {/* PROGRESS STEPS - ADDED THIS SECTION */}
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
                    style={[styles.pharmacyCard, isSelected && styles.pharmacyCardSelected]}
                    onPress={() => handlePharmacySelect(pharmacy)}
                  >
                    <Text style={styles.pharmacyName}>{pharmacy.pharmacy_name}</Text>
                    <View style={styles.pharmacyInfo}>
                      <Image source={locationIcon} style={styles.icon} />
                      <Text style={styles.pharmacyAddress}>{pharmacy.pharmacy_address}</Text>
                    </View>
                    <Text style={styles.readyTime}>{formatReadyTime(pharmacy)}</Text>
                    
                    {medicineInfo && medicineInfo.unit_price > 0 && (
                      <Text style={styles.priceText}>
                        RM {medicineInfo.unit_price.toFixed(2)} per unit
                      </Text>
                    )}
                    
                    {isSelected && (
                      <Text style={styles.selectedIndicator}>✓ Selected</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable 
            style={[styles.continueButton, !selectedPharmacy && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!selectedPharmacy}
          >
            <Text style={styles.continueButtonText}>
              {selectedPharmacy ? 'Continue' : 'Select a Pharmacy'}
            </Text>
            <Image source={forwardIcon} style={styles.arrowIcon} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  content: { flex: 1, padding: 16 },
  headerSection: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  backButtonContainer: { marginRight: 12, marginTop: 4 },
  backIcon: { width: 24, height: 24 },
  headerTextContainer: { flex: 1 },
  requestRefill: { fontSize: 24, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  medicineName: { fontSize: 16, color: "#64748b" },
  medicinePrice: { fontSize: 14, color: "#0ea5e9", fontWeight: "600", marginTop: 2 },
  currentStock: { fontSize: 12, color: "#64748b", marginTop: 2 },
  
  // Progress Steps Styles - ADDED THESE
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
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#0f172a", marginBottom: 16 },
  pharmacyCards: { gap: 16 },
  pharmacyCard: { 
    backgroundColor: "#ffffff", 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: "#e2e8f0" 
  },
  pharmacyCardSelected: { 
    borderColor: "#0ea5e9", 
    backgroundColor: "#f0f9ff", 
    borderWidth: 2 
  },
  pharmacyName: { fontSize: 16, fontWeight: "600", color: "#0f172a", marginBottom: 8 },
  pharmacyInfo: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  icon: { width: 16, height: 16, marginRight: 8 },
  pharmacyAddress: { fontSize: 14, color: "#475569", flex: 1 },
  readyTime: { fontSize: 14, color: "#475569", marginBottom: 8 },
  priceText: { fontSize: 14, fontWeight: "600", color: "#0ea5e9" },
  selectedIndicator: { 
    marginTop: 8, 
    padding: 6, 
    backgroundColor: "#d1fae5", 
    borderRadius: 8, 
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: "600",
    color: "#065f46"
  },
  continueButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24
  },
  continueButtonDisabled: {
    backgroundColor: "#94a3b8"
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8
  },
  arrowIcon: {
    width: 16,
    height: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default OnlineRefillOrder;