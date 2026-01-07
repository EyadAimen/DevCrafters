import * as React from "react";
import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";
import * as FileSystem from "expo-file-system/legacy";
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
  ActivityIndicator,
} from "react-native";
import BottomNavigation from "../../components/BottomNavigation";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const ScanPackage = () => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // OCR.space API configuration
  const OCR_API_KEY = 'K81090469888957';
  const OCR_API_URL = 'https://api.ocr.space/parse/image';

  type OCRResult = {
    success: boolean;
    text: string;
    error?: string;
  };

  type MedicineInfo = {
    name: string | null;
    dosage: string | null;
    confidence: 'high' | 'medium' | 'low';
  };

  const decodeBase64ToUint8Array = (base64: string): Uint8Array => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let outputLength = (base64.length / 4) * 3;
    if (base64.endsWith("==")) outputLength -= 2;
    else if (base64.endsWith("=")) outputLength -= 1;

    const bytes = new Uint8Array(outputLength);
    let byteIndex = 0;

    for (let i = 0; i < base64.length; i += 4) {
      const enc1 = chars.indexOf(base64[i]);
      const enc2 = chars.indexOf(base64[i + 1]);
      const enc3 = chars.indexOf(base64[i + 2]);
      const enc4 = chars.indexOf(base64[i + 3]);

      const triplet = (enc1 << 18) | (enc2 << 12) | ((enc3 & 63) << 6) | (enc4 & 63);

      if (enc3 === 64) {
        bytes[byteIndex++] = (triplet >> 16) & 255;
      } else if (enc4 === 64) {
        bytes[byteIndex++] = (triplet >> 16) & 255;
        bytes[byteIndex++] = (triplet >> 8) & 255;
      } else {
        bytes[byteIndex++] = (triplet >> 16) & 255;
        bytes[byteIndex++] = (triplet >> 8) & 255;
        bytes[byteIndex++] = triplet & 255;
      }
    }

    return bytes;
  };

  // OCR Analysis Function
  const analyzeImageWithOCR = useCallback(async (imageUri: string, base64Data?: string): Promise<OCRResult> => {
    try {
      setIsAnalyzing(true);
      
      let base64String = base64Data;
      if (!base64String) {
        base64String = await FileSystem.readAsStringAsync(imageUri, { 
          encoding: FileSystem.EncodingType.Base64 
        });
      }

      // Prepare form data for OCR.space API
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64String}`);
      formData.append('apikey', OCR_API_KEY);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('OCREngine', '1');
      formData.append('scale', 'true');
      formData.append('isTable', 'false');

      console.log("🔍 Sending image to OCR API...");

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.IsErroredOnProcessing) {
        console.error("❌ OCR API Error:", result.ErrorMessage);
        return {
          success: false,
          text: '',
          error: result.ErrorMessage || 'OCR processing failed'
        };
      }

      if (result.ParsedResults && result.ParsedResults.length > 0) {
        const extractedText = result.ParsedResults[0].ParsedText;
        console.log("✅ OCR Analysis Successful");
        console.log("📝 Extracted Text:", extractedText.substring(0, 200) + "...");
        
        return {
          success: true,
          text: extractedText
        };
      } else {
        console.error("❌ No OCR results found");
        return {
          success: false,
          text: '',
          error: 'No text detected in image'
        };
      }
    } catch (error) {
      console.error("❌ OCR Analysis Error:", error);
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Unknown OCR error'
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const extractMedicineInfo = useCallback((ocrText: string): MedicineInfo => {
    if (!ocrText || ocrText.trim().length === 0) {
      return { name: null, dosage: null, confidence: 'low' };
    }

    console.log("🔍 Analyzing OCR text for medicine information...");
    
    const text = ocrText.toLowerCase();
    let name: string | null = null;
    let dosage: string | null = null;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Common medicine name patterns
    const medicineNamePatterns = [
      /\b(?:paracetamol|acetaminophen|ibuprofen|aspirin|amoxicillin|penicillin|vitamin c|omeprazole|atorvastatin|metformin|lisinopril|levothyroxine)\b/gi,
      /\b(?:[a-z]*(?:pril|mycin|cycline|oxacin|pram|azole|statin|olol|dipine|tidine|pramine|oxetine))\b/gi,
      /\b(?:advil|tylenol|motrin|nexium|lipitor|synthroid|ventolin|prozac|xanax|valium|cipro|zithromax|augmentin)\b/gi
    ];

    // Dosage patterns
    const dosagePatterns = [
      /\b(\d+(?:\.\d+)?)\s*mg\b/gi,
      /\b(\d+)\s*milligrams?\b/gi,
      /\b(\d+(?:\.\d+)?)\s*mcg\b/gi,
      /\b(\d+)\s*micrograms?\b/gi,
      /\b(\d+(?:\.\d+)?)\s*g\b/gi,
      /\b(\d+)\s*grams?\b/gi,
      /\b(\d+(?:,\d+)*)\s*IU\b/gi,
      /\b(\d+(?:\.\d+)?)\s*%\b/gi,
      /\b(\d+(?:\.\d+)?)\s*tablets?\b/gi,
      /\b(\d+(?:\.\d+)?)\s*capsules?\b/gi,
      /\b(\d+(?:\.\d+)?\s*mg\s*\/\s*\d+(?:\.\d+)?\s*ml)\b/gi,
      /\b(\d+(?:\.\d+)?)\s*(?:strength|potency|power)\b/gi
    ];

    // Extract medicine name
    for (const pattern of medicineNamePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        name = matches[0].replace(/\b\w/g, l => l.toUpperCase());
        confidence = confidence === 'low' ? 'medium' : confidence;
        break;
      }
    }

    // If no common names found, look for capitalized words
    if (!name) {
      const capitalizedWords = ocrText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
      if (capitalizedWords) {
        const commonNonMedicine = new Set([
          'tablet', 'capsule', 'injection', 'solution', 'suspension', 'cream', 'ointment',
          'powder', 'syrup', 'drops', 'spray', 'inhaler', 'patch', 'suppository',
          'bottle', 'package', 'container', 'label', 'instructions', 'warning',
          'caution', 'storage', 'expiry', 'manufacturer', 'distributor', 'limited',
          'pharmaceuticals', 'healthcare', 'medical', 'prescription'
        ]);

        const potentialNames = capitalizedWords.filter(word => 
          word.split(' ').length <= 3 &&
          !commonNonMedicine.has(word.toLowerCase()) &&
          word.length > 3
        );

        if (potentialNames.length > 0) {
          name = potentialNames[0];
          confidence = 'medium';
        }
      }
    }

    // Extract dosage
    for (const pattern of dosagePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        dosage = matches[0];
        confidence = confidence === 'low' ? 'medium' : 'high';
        break;
      }
    }

    // Look for dosage in common formats if not found with patterns
    if (!dosage) {
      const numberUnits = text.match(/\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|tablet|capsule|iu|%)\b/gi);
      if (numberUnits && numberUnits.length > 0) {
        dosage = numberUnits[0];
        confidence = confidence === 'low' ? 'medium' : confidence;
      }
    }

    console.log("💊 Extracted Medicine Info:", { name, dosage, confidence });
    return { name, dosage, confidence };
  }, []);

  const uploadImageToSupabase = useCallback(async (uri: string, fileName: string, base64Data?: string) => {
    try {
      const b64 = base64Data ?? await FileSystem.readAsStringAsync(uri, { encoding: "base64" as any });
      const bytes = decodeBase64ToUint8Array(b64);

      const { data, error } = await supabase.storage
        .from('medicine-images')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      return { data, error };
    } catch (error) {
      console.error("❌ Error preparing image for upload:", error);
      return { data: null, error: error instanceof Error ? error : new Error("Unknown upload error") };
    }
  }, []);

  const uploadPhoto = useCallback(async () => {
    try {
      console.log("🚀 Starting upload with OCR processing...");
      setIsUploading(true);

      // Ask for permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Photo library access is needed to upload a photo.");
        setIsUploading(false);
        return;
      }

      // Pick image with compression to stay under OCR.space 1MB limit
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,  // Compress to 50% quality
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log("Image selection was cancelled");
        setIsUploading(false);
        return;
      }

      const photoUri = result.assets[0].uri;
      const base64Data = (result.assets[0] as any).base64;
      setImage(photoUri);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("Error", "User not logged in");
        setIsUploading(false);
        return;
      }

      // Step 1: Perform OCR analysis first
      console.log("🔍 Starting OCR analysis...");
      const ocrResult = await analyzeImageWithOCR(photoUri, base64Data);

      // Step 2: Extract medicine information from OCR text
      let medicineInfo: MedicineInfo = { name: null, dosage: null, confidence: 'low' };
      if (ocrResult.success && ocrResult.text) {
        medicineInfo = extractMedicineInfo(ocrResult.text);
      }

      // Step 3: Upload image to Supabase Storage
      const fileName = `${user.id}-${Date.now()}.jpg`;
      console.log("⬆️ Uploading to medicine-images bucket...");
      
      const { data: uploadData, error: uploadError } = await uploadImageToSupabase(
        photoUri, 
        fileName, 
        base64Data
      );

      if (uploadError) {
        console.error("❌ Storage upload error:", uploadError);
        Alert.alert("Upload failed", uploadError.message);
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('medicine-images')
        .getPublicUrl(fileName);
      
      console.log("🌐 Public URL:", publicUrl);

      // Step 4: Save everything to database
      console.log("💾 Saving photo and medicine info to database...");
      const { data: insertData, error: insertError } = await supabase
        .from('user_captured_images_scan')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          medicine_name: medicineInfo.name,
          medicine_dosage: medicineInfo.dosage,
          confidence_level: medicineInfo.confidence,
          //ocr_raw_text: ocrResult.success ? ocrResult.text : null
        })
        .select();

      if (insertError) {
        console.error("❌ Database insert error:", insertError);
        Alert.alert("Database Error", insertError.message);
        setIsUploading(false);
        return;
      }

      // Step 5: Show appropriate alert based on results
      if (ocrResult.success) {
        if (medicineInfo.name && medicineInfo.dosage) {
          Alert.alert(
            "Analysis Complete", 
            `Medicine identified: ${medicineInfo.name}\nDosage: ${medicineInfo.dosage}`,
            [
              {
                text: "View Details",
                onPress: () => {
                  router.push({
                    pathname: "/AfterAnalysingMedicine",
                    params: { 
                      medicineName: medicineInfo.name,
                      medicineDosage: medicineInfo.dosage,
                      imageUrl: publicUrl
                    }
                  });
                }
              },
            ]
          );
        } else if (medicineInfo.name) {
          Alert.alert(
            "Analysis Complete", 
            `Medicine identified: ${medicineInfo.name}\n\nDosage information not found in the label.`,
            [
              {
                text: "View Details",
                onPress: () => {
                  router.push({
                    pathname: "/AfterAnalysingMedicine",
                    params: { 
                      medicineName: medicineInfo.name,
                      imageUrl: publicUrl
                    }
                  });
                }
              },
            ]
          );
        } else if (medicineInfo.dosage) {
          Alert.alert(
            "Analysis Complete", 
            `Dosage identified: ${medicineInfo.dosage}\n\nMedicine name not clearly identified.`,
            [
              {
                text: "View Details",
                onPress: () => {
                  router.push({
                    pathname: "/AfterAnalysingMedicine",
                    params: { 
                      medicineDosage: medicineInfo.dosage,
                      imageUrl: publicUrl
                    }
                  });
                }
              },
            ]
          );
        } else {
          Alert.alert(
            "Analysis Complete", 
            "Medicine package scanned successfully! Text extracted but specific medicine name and dosage couldn't be identified automatically.",
            [
              {
                text: "View Details",
                onPress: () => {
                  router.push({
                    pathname: "/AfterAnalysingMedicine",
                    params: { imageUrl: publicUrl }
                  });
                }
              },
            ]
          );
        }
      } else {
        console.log("⚠️ Photo uploaded but OCR analysis failed:", ocrResult.error);
        Alert.alert(
          "Upload Complete", 
          "Photo saved but we couldn't read text from the image. Please ensure the package label is clear and try again.",
          [
            {
              text: "View Photo",
              onPress: () => {
                router.push({
                  pathname: "/AfterAnalysingMedicine",
                  params: { imageUrl: publicUrl }
                });
              }
            },
          ]
        );
      }

      console.log("✅ SUCCESS! Image uploaded, analyzed, and saved!");
      
    } catch (error) {
      console.error("💥 Unexpected error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [router, analyzeImageWithOCR, extractMedicineInfo, uploadImageToSupabase]);

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

  // Dynamic card height based on screen size
  const getCardHeight = () => {
    if (isSmallScreen) return height * 0.35;
    if (isMediumScreen) return height * 0.4;
    if (isLargeScreen) return height * 0.45;
    return 380;
  };

  const dynamicStyles = {
    container: {
      paddingHorizontal: getHorizontalPadding(),
    },
    card: {
      height: getCardHeight(),
    },
    title: {
      fontSize: isLargeScreen ? 24 : isSmallScreen ? 16 : 18,
    },
    subtitle: {
      fontSize: isLargeScreen ? 16 : isSmallScreen ? 13 : 14,
    },
  };

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

          {/* Camera Frame Card - Now shows processing status */}
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.cameraIconContainer}>
              {(isUploading || isAnalyzing) ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0ea5e9" />
                  <Text style={[
                    styles.analyzingText,
                    isLargeScreen && { fontSize: 16 }
                  ]}>
                    {isAnalyzing ? "Analyzing medicine with OCR..." : "Uploading image..."}
                  </Text>
                </View>
              ) : (
                <>
                  <Image
                    source={require("../../assets/cameraIcon.png")}
                    style={[
                      styles.cameraIcon,
                      isLargeScreen && { width: 80, height: 80 }
                    ]}
                    resizeMode="contain"
                  />
                  <Text style={[
                    styles.cardText,
                    isLargeScreen && { fontSize: 16 }
                  ]}>
                    Position medicine package in the frame
                  </Text>
                  <Text style={[
                    styles.cardSubText,
                    isLargeScreen && { fontSize: 14 }
                  ]}>
                    Make sure the label is readable
                  </Text>
                </>
              )}
            </View>
            
            {image && !isUploading && !isAnalyzing && (
              <Image 
                source={{ uri: image }} 
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Action Buttons */}
          <View style={[
            styles.buttonRow,
            isLargeScreen && styles.buttonRowLarge
          ]}>
            <Pressable
              style={[
                styles.primaryButton,
                isLargeScreen && styles.buttonLarge,
                (isUploading || isAnalyzing) && styles.buttonDisabled
              ]}
              onPress={() => router.push("./TakePhotoAndAnalyseMedicine")}
              disabled={isUploading || isAnalyzing}
            >
              <Image
                source={require("../../assets/cameraIcon.png")}
                style={styles.buttonIcon}
                resizeMode="contain"
              />
              <Text style={[
                styles.buttonTextPrimary,
                isLargeScreen && { fontSize: 16 }
              ]}>
                Take Photo
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.secondaryButton,
                isLargeScreen && styles.buttonLarge,
                (isUploading || isAnalyzing) && styles.buttonDisabled
              ]}
              onPress={uploadPhoto}
              disabled={isUploading || isAnalyzing}
            >
              {isUploading || isAnalyzing ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <>
                  <Image
                    source={require("../../assets/arrowIcon.png")}
                    style={styles.buttonIcon}
                    resizeMode="contain"
                  />
                  <Text style={[
                    styles.buttonTextSecondary,
                    isLargeScreen && { fontSize: 16 }
                  ]}>
                    Upload
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Tips Card */}
          <View style={[
            styles.tipsCard,
            isLargeScreen && { padding: 20 }
          ]}>
            <View style={styles.tipsHeader}>
              <Image
                source={require("../../assets/infoIcon.png")}
                style={[
                  styles.infoIcon,
                  isLargeScreen && { width: 20, height: 20 }
                ]}
                resizeMode="contain"
              />
              <Text style={[
                styles.tipsTitle,
                isLargeScreen && { fontSize: 16 }
              ]}>
                Tips for best OCR results:
              </Text>
            </View>
            <View style={styles.tipsList}>
              <Text style={[
                styles.tip,
                isLargeScreen && { fontSize: 14, lineHeight: 22 }
              ]}>
                • Use good lighting
              </Text>
              <Text style={[
                styles.tip,
                isLargeScreen && { fontSize: 14, lineHeight: 22 }
              ]}>
                • Ensure package label is clearly visible
              </Text>
              <Text style={[
                styles.tip,
                isLargeScreen && { fontSize: 14, lineHeight: 22 }
              ]}>
                • Include barcode if possible
              </Text>
              <Text style={[
                styles.tip,
                isLargeScreen && { fontSize: 14, lineHeight: 22 }
              ]}>
                • Hold camera steady
              </Text>
              <Text style={[
                styles.tip,
                isLargeScreen && { fontSize: 14, lineHeight: 22 }
              ]}>
                • Avoid glare on reflective surfaces
              </Text>
              <Text style={[
                styles.tip,
                isLargeScreen && { fontSize: 14, lineHeight: 22 }
              ]}>
                • Focus on text areas for better OCR accuracy
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNavWrapper}>
          <BottomNavigation />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomNavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
  },
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
  card: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  cameraIconContainer: {
    marginBottom: 12,
  },
  cameraIcon: {
    width: 64,
    height: 64,
    alignSelf: "center",
  },
  cardText: {
    fontSize: 14,
    textAlign: "center",
    color: "#0f172a",
    fontFamily: "Inter-Medium",
    marginBottom: 4,
  },
  cardSubText: {
    fontSize: 12,
    color: "#64748b",
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
  buttonIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
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
  tipsCard: {
    backgroundColor: "#eff6ff",
    borderColor: "#bedbff",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  tipsTitle: {
    fontSize: 14,
    color: "#0f172a",
    fontFamily: "Inter-Medium",
    fontWeight: "500",
  },
  tipsList: {
    marginTop: 4,
    gap: 4,
  },
  tip: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
    fontFamily: "Inter-Regular",
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  analyzingText: {
    fontSize: 14,
    textAlign: "center",
    color: "#0f172a",
    fontFamily: "Inter-Medium",
    marginTop: 12,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ScanPackage;