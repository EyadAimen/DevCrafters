import * as React from "react";
import {
  Text,
  StyleSheet,
  View,
  Pressable,
  Image,
  ScrollView,
  useWindowDimensions,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";

const AfterAnalysingMedicine = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width, height } = useWindowDimensions();
  
  // State for medicine data
  const [medicineData, setMedicineData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [extractedMedicineName, setExtractedMedicineName] = React.useState<string | null>(null);

  // Responsive breakpoints
  const isSmallScreen = width < 375;
  const isMediumScreen = width >= 375 && width < 768;
  const isLargeScreen = width >= 768;
  const isExtraLarge = width >= 1024;

  // Dynamic padding based on screen size
  const getHorizontalPadding = () => {
    if (isExtraLarge) return width * 0.25;
    if (isLargeScreen) return width * 0.15;
    return 16;
  };

  // Function to fetch medicine data from Supabase
  const fetchMedicineData = async (medicineName: string) => {
    try {
      setLoading(true);
      console.log("🔍 Searching for medicine:", medicineName);

      // First, try exact match
      let { data, error } = await supabase
        .from('medicine_reference')
        .select('*')
        .or(`medicine_name.ilike.%${medicineName}%,generic_name.ilike.%${medicineName}%`)
        .limit(1);

      if (error) {
        console.error("❌ Supabase query error:", error);
        throw error;
      }

      // If no exact match found, try partial match
      if (!data || data.length === 0) {
        console.log("🔍 No exact match found, trying partial search...");
        const { data: partialData, error: partialError } = await supabase
          .from('medicine_reference')
          .select('*')
          .or(`medicine_name.ilike.%${medicineName.split(' ')[0]}%,generic_name.ilike.%${medicineName.split(' ')[0]}%`)
          .limit(1);

        if (partialError) {
          console.error("❌ Supabase partial query error:", partialError);
          throw partialError;
        }

        data = partialData;
      }

      if (data && data.length > 0) {
        console.log("✅ Medicine data found:", data[0].medicine_name);
        setMedicineData(data[0]);
      } else {
        console.log("❌ No medicine data found in database");
        setMedicineData(null);
      }
    } catch (error) {
      console.error("❌ Error fetching medicine data:", error);
      Alert.alert("Error", "Failed to fetch medicine information");
      setMedicineData(null);
    } finally {
      setLoading(false);
    }
  };

  // Extract medicine name from params and fetch data
  React.useEffect(() => {
    // Get medicine name from navigation params
    const medicineName = params.medicineName as string || null;
    setExtractedMedicineName(medicineName);
    
    if (medicineName) {
      fetchMedicineData(medicineName);
    } else {
      setLoading(false);
    }
  }, [params.medicineName]);

  const dynamicStyles = {
    container: {
      paddingHorizontal: getHorizontalPadding(),
    },
    title: {
      fontSize: isLargeScreen ? 24 : isSmallScreen ? 16 : 18,
    },
    subtitle: {
      fontSize: isLargeScreen ? 16 : isSmallScreen ? 13 : 14,
    },
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.container, dynamicStyles.container]}>
          <View style={styles.loadingContainer}>
            <View style={styles.spinner} />
            <Text style={styles.loadingText}>Loading medicine information...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.container, dynamicStyles.container]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Platform.OS === 'ios' ? 90 : 80 }
          ]}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={[styles.title, dynamicStyles.title]}>
              Scan Package
            </Text>
            <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
              Scan medicine packaging to identify and get information
            </Text>
          </View>

          {/* Status Card */}
          <View style={[
            styles.statusCard,
            isLargeScreen && { padding: 16 }
          ]}>
            <Image
              source={require("../../assets/identifiedSuccess.png")}
              style={[
                styles.statusIcon,
                isLargeScreen && { width: 26, height: 26 }
              ]}
              resizeMode="contain"
            />
            <Text style={[
              styles.statusText,
              isLargeScreen && { fontSize: 17 }
            ]}>
              {medicineData ? "Medicine Identified" : "Medicine Information Not Found"}
            </Text>
          </View>

          {/* Medicine Info Card */}
          <View style={[
            styles.medicineCard,
            isLargeScreen && { padding: 20 }
          ]}>
            <Text style={[
              styles.medicineName,
              isLargeScreen && { fontSize: 22 }
            ]}>
              {medicineData?.medicine_name || extractedMedicineName || "Unknown Medicine"}
            </Text>
            
            {medicineData?.generic_name && (
              <Text style={[
                styles.medicineGeneric,
                isLargeScreen && { fontSize: 16 }
              ]}>
                {medicineData.generic_name}
              </Text>
            )}

            {medicineData?.dosage && (
              <View style={[
                styles.badge,
                isLargeScreen && { paddingHorizontal: 12, paddingVertical: 6 }
              ]}>
                <Text style={[
                  styles.badgeText,
                  isLargeScreen && { fontSize: 14 }
                ]}>
                  {medicineData.dosage}
                </Text>
              </View>
            )}

            {medicineData ? (
              <>
                {/* Common Uses Section */}
                {medicineData.purpose && (
                  <View style={styles.section}>
                    <Text style={[
                      styles.sectionTitle,
                      isLargeScreen && { fontSize: 16 }
                    ]}>
                      Common Uses
                    </Text>
                    <Text style={[
                      styles.sectionText,
                      isLargeScreen && { fontSize: 15, lineHeight: 22 }
                    ]}>
                      {medicineData.purpose}
                    </Text>
                  </View>
                )}

                {/* How to Use Section */}
                {medicineData.how_to_lake && (
                  <View style={styles.section}>
                    <Text style={[
                      styles.sectionTitle,
                      isLargeScreen && { fontSize: 16 }
                    ]}>
                      How to Use
                    </Text>
                    <Text style={[
                      styles.sectionText,
                      isLargeScreen && { fontSize: 15, lineHeight: 22 }
                    ]}>
                      {medicineData.how_to_lake}
                    </Text>
                  </View>
                )}

                {/* Common Side Effects Section */}
                {medicineData.common_side_effects && (
                  <View style={styles.section}>
                    <Text style={[
                      styles.sectionTitle,
                      isLargeScreen && { fontSize: 16 }
                    ]}>
                      Common Side Effects
                    </Text>
                    <Text style={[
                      styles.sectionText,
                      isLargeScreen && { fontSize: 15, lineHeight: 22 }
                    ]}>
                      {medicineData.common_side_effects}
                    </Text>
                  </View>
                )}

                {/* Serious Side Effects Section */}
                {medicineData.serious_side_effects && (
                  <View style={styles.section}>
                    <Text style={[
                      styles.sectionTitle,
                      isLargeScreen && { fontSize: 16 }
                    ]}>
                      Serious Side Effects
                    </Text>
                    <Text style={[
                      styles.sectionText,
                      isLargeScreen && { fontSize: 15, lineHeight: 22 }
                    ]}>
                      {medicineData.serious_side_effects}
                    </Text>
                  </View>
                )}

                {/* Warnings Section */}
                {medicineData.warnings && (
                  <View style={styles.section}>
                    <Text style={[
                      styles.sectionTitle,
                      isLargeScreen && { fontSize: 16 }
                    ]}>
                      Important Warnings
                    </Text>
                    <Text style={[
                      styles.sectionText,
                      isLargeScreen && { fontSize: 15, lineHeight: 22 }
                    ]}>
                      {medicineData.warnings}
                    </Text>
                  </View>
                )}

                {/* Drug Interactions Section */}
                {medicineData.drug_interactions && (
                  <View style={styles.section}>
                    <Text style={[
                      styles.sectionTitle,
                      isLargeScreen && { fontSize: 16 }
                    ]}>
                      Drug Interactions
                    </Text>
                    <Text style={[
                      styles.sectionText,
                      isLargeScreen && { fontSize: 15, lineHeight: 22 }
                    ]}>
                      {medicineData.drug_interactions}
                    </Text>
                  </View>
                )}

                {/* Storage Section */}
                {medicineData.storage && (
                  <View style={styles.section}>
                    <Text style={[
                      styles.sectionTitle,
                      isLargeScreen && { fontSize: 16 }
                    ]}>
                      Storage Instructions
                    </Text>
                    <Text style={[
                      styles.sectionText,
                      isLargeScreen && { fontSize: 15, lineHeight: 22 }
                    ]}>
                      {medicineData.storage}
                    </Text>
                  </View>
                )}

                {/* Manufacturer */}
                {medicineData.manufacturer && (
                  <Text style={[
                    styles.manufacturer,
                    isLargeScreen && { fontSize: 14 }
                  ]}>
                    Manufacturer: {medicineData.manufacturer}
                  </Text>
                )}
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>
                  No detailed information found for this medicine in our database.
                </Text>
                <Text style={styles.noDataSubtext}>
                  The medicine was identified but detailed information is not available.
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={[
            styles.buttonRow,
            isLargeScreen && styles.buttonRowLarge
          ]}>
            <Pressable
              style={[
                styles.secondaryButton,
                isLargeScreen && styles.buttonLarge
              ]}
              onPress={() => router.replace("./scan")}
            >
              <Text style={[
                styles.buttonTextSecondary,
                isLargeScreen && { fontSize: 16 }
              ]}>
                Scan Again
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.primaryButton,
                isLargeScreen && styles.buttonLarge
              ]}
              onPress={() => router.push("/meds")}
            >
              <Text style={[
                styles.buttonTextPrimary,
                isLargeScreen && { fontSize: 16 }
              ]}>
                Add to My Meds
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Bottom Navigation - unchanged */}
        <View style={[
          styles.bottomNav,
          isLargeScreen && styles.bottomNavLarge
        ]}>
          <Pressable
            style={styles.navItem}
            onPress={() => router.push("/home")}
          >
            <Image
              source={require("../../assets/homeIcon.png")}
              style={[
                styles.navIcon,
                isLargeScreen && { width: 24, height: 24 }
              ]}
              resizeMode="contain"
            />
            <Text style={[
              styles.navText,
              isLargeScreen && { fontSize: 12 }
            ]}>
              Home
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() => router.push("/meds")}
          >
            <Image
              source={require("../../assets/pillIcon.png")}
              style={[
                styles.navIcon,
                isLargeScreen && { width: 24, height: 24 }
              ]}
              resizeMode="contain"
            />
            <Text style={[
              styles.navText,
              isLargeScreen && { fontSize: 12 }
            ]}>
              Meds
            </Text>
          </Pressable>

          <View style={[
            styles.navItemActive,
            isLargeScreen && styles.navItemActiveLarge
          ]}>
            <Image
              source={require("../../assets/scanIcon.png")}
              style={[
                styles.navIconActive,
                isLargeScreen && { width: 28, height: 28 }
              ]}
              resizeMode="contain"
            />
            <Text style={[
              styles.navTextActive,
              isLargeScreen && { fontSize: 12 }
            ]}>
              Scan
            </Text>
          </View>

          <Pressable
            style={styles.navItem}
            onPress={() => router.push("/analytics" as any)}
          >
            <Image
              source={require("../../assets/chartIcon.png")}
              style={[
                styles.navIcon,
                isLargeScreen && { width: 24, height: 24 }
              ]}
              resizeMode="contain"
            />
            <Text style={[
              styles.navText,
              isLargeScreen && { fontSize: 12 }
            ]}>
              Analytics
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() => router.push("/profile")}
          >
            <Image
              source={require("../../assets/profileIcon.png")}
              style={[
                styles.navIcon,
                isLargeScreen && { width: 24, height: 24 }
              ]}
              resizeMode="contain"
            />
            <Text style={[
              styles.navText,
              isLargeScreen && { fontSize: 12 }
            ]}>
              Profile
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    fontFamily: "Inter-SemiBold",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    fontFamily: "Inter-Regular",
    lineHeight: 20,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderColor: "#b9f8cf",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  statusIcon: {
    width: 22,
    height: 22,
    marginRight: 8,
  },
  statusText: {
    fontSize: 15,
    color: "#0f172a",
    fontFamily: "Inter-Medium",
    fontWeight: "500",
  },
  medicineCard: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    fontFamily: "Inter-SemiBold",
  },
  medicineGeneric: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
    marginBottom: 8,
    fontFamily: "Inter-Regular",
  },
  badge: {
    backgroundColor: "#0ea5e9",
    alignSelf: "flex-start",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter-Medium",
    fontWeight: "500",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#0f172a",
    fontFamily: "Inter-Medium",
    fontWeight: "500",
    marginBottom: 4,
  },
  sectionText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter-Regular",
  },
  manufacturer: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 6,
    fontFamily: "Inter-Regular",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#0ea5e9",
    borderTopColor: "transparent",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748b",
    fontFamily: "Inter-Regular",
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    fontFamily: "Inter-Medium",
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    fontFamily: "Inter-Regular",
  },
  buttonRow: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 12,
  },
  buttonRowLarge: {
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flex: 1,
    minHeight: 44,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flex: 1,
    minHeight: 44,
  },
  buttonLarge: {
    paddingVertical: 14,
    minHeight: 50,
  },
  buttonTextPrimary: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter-Medium",
    fontWeight: "500",
  },
  buttonTextSecondary: {
    color: "#0f172a",
    fontSize: 14,
    fontFamily: "Inter-Medium",
    fontWeight: "500",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 72,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNavLarge: {
    height: 80,
    paddingHorizontal: 40,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
    paddingVertical: 8,
  },
  navIcon: {
    width: 20,
    height: 20,
    marginBottom: 4,
  },
  navText: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "Inter-Regular",
    letterSpacing: 0.1,
  },
  navItemActive: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
  },
  navItemActiveLarge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navIconActive: {
    width: 23,
    height: 23,
    marginBottom: 4,
  },
  navTextActive: {
    fontSize: 10,
    color: "#0ea5e9",
    fontFamily: "Inter-Medium",
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});

export default AfterAnalysingMedicine;