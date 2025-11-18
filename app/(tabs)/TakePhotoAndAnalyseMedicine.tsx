import * as React from "react";
import { supabase } from "../../lib/supabase";
import { useCallback, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

const TakePhotoAndAnalyseMedicine = () => {
  // All hooks must be called at the top, before any conditional returns
  const params = useLocalSearchParams();
  const [image, setImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(params.fromUpload !== "true");
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  type UploadResult = {
    data: any;
    error: Error | null;
  };

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

  // OCR.space API configuration
  const OCR_API_KEY = 'K81090469888957'; // max 25000 requests/month (Free tier)
  const OCR_API_URL = 'https://api.ocr.space/parse/image';

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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
    // Brand names (common pain relievers, antibiotics, etc.)
    /\b(?:paracetamol|acetaminophen|ibuprofen|aspirin|amoxicillin|penicillin|vitamin c|omeprazole|atorvastatin|metformin|lisinopril|levothyroxine)\b/gi,
    // Generic names with common prefixes/suffixes
    /\b(?:[a-z]*(?:pril|mycin|cycline|oxacin|pram|azole|statin|olol|dipine|tidine|pramine|oxetine))\b/gi,
    // Words that often appear in medicine names
    /\b(?:advil|tylenol|motrin|nexium|lipitor|synthroid|ventolin|prozac|xanax|valium|cipro|zithromax|augmentin)\b/gi
  ];

  // Dosage patterns
  const dosagePatterns = [
    // mg patterns
    /\b(\d+(?:\.\d+)?)\s*mg\b/gi,
    /\b(\d+)\s*milligrams?\b/gi,
    // mcg patterns
    /\b(\d+(?:\.\d+)?)\s*mcg\b/gi,
    /\b(\d+)\s*micrograms?\b/gi,
    // g patterns
    /\b(\d+(?:\.\d+)?)\s*g\b/gi,
    /\b(\d+)\s*grams?\b/gi,
    // IU patterns (for vitamins)
    /\b(\d+(?:,\d+)*)\s*IU\b/gi,
    // Percentage patterns
    /\b(\d+(?:\.\d+)?)\s*%\b/gi,
    // Tablet/capsule patterns
    /\b(\d+(?:\.\d+)?)\s*tablets?\b/gi,
    /\b(\d+(?:\.\d+)?)\s*capsules?\b/gi,
    // Combined dosage patterns (e.g., 500mg/5mL)
    /\b(\d+(?:\.\d+)?\s*mg\s*\/\s*\d+(?:\.\d+)?\s*ml)\b/gi,
    // Strength patterns
    /\b(\d+(?:\.\d+)?)\s*(?:strength|potency|power)\b/gi
  ];

  // Extract medicine name
  for (const pattern of medicineNamePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Take the first match and capitalize it properly
      name = matches[0].replace(/\b\w/g, l => l.toUpperCase());
      confidence = confidence === 'low' ? 'medium' : confidence;
      break;
    }
  }

  // If no common names found, look for capitalized words that might be medicine names
  if (!name) {
    const capitalizedWords = ocrText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedWords) {
      // Filter out common non-medicine words and take the most likely candidate
      const commonNonMedicine = new Set([
        'tablet', 'capsule', 'injection', 'solution', 'suspension', 'cream', 'ointment',
        'powder', 'syrup', 'drops', 'spray', 'inhaler', 'patch', 'suppository',
        'bottle', 'package', 'container', 'label', 'instructions', 'warning',
        'caution', 'storage', 'expiry', 'manufacturer', 'distributor', 'limited',
        'pharmaceuticals', 'healthcare', 'medical', 'prescription'
      ]);

      const potentialNames = capitalizedWords.filter(word => 
        word.split(' ').length <= 3 && // Avoid very long phrases
        !commonNonMedicine.has(word.toLowerCase()) &&
        word.length > 3 // Avoid very short words
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

  const uploadImageToSupabase = useCallback(async (uri: string, fileName: string, base64Data?: string): Promise<UploadResult> => {
    try {
      const b64 = base64Data ?? await FileSystem.readAsStringAsync(uri, { encoding: "base64" as any });
      const bytes = decodeBase64ToUint8Array(b64);

      const { data, error } = await supabase.storage
        .from('medicine-images')
        .upload(fileName, bytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        return { data, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("❌ Error preparing image for upload:", error);
      Alert.alert("Upload failed", "Unable to prepare image for upload.");
      return { data: null, error: error instanceof Error ? error : new Error("Unknown upload error") };
    }
  }, []);

  const processAndSaveImage = useCallback(async (imageUri: string, base64Data?: string, source: 'camera' | 'upload' = 'camera') => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("Error", "User not logged in");
        return;
      }

      const fileName = `${user.id}-${Date.now()}.jpg`;
      
      console.log(`⬆️ Uploading ${source} photo to medicine-images bucket...`);
      const { data: uploadData, error: uploadError } = await uploadImageToSupabase(imageUri, fileName, base64Data);

      if (uploadError) {
        console.error("❌ Storage upload error:", uploadError);
        Alert.alert("Upload failed", uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('medicine-images')
        .getPublicUrl(fileName);
      
      console.log("🌐 Public URL:", publicUrl);

      // Perform OCR analysis
      console.log("🔍 Starting OCR analysis...");
      const ocrResult = await analyzeImageWithOCR(imageUri, base64Data);

       // Extract medicine information from OCR text
    let medicineInfo: MedicineInfo = { name: null, dosage: null, confidence: 'low' };
    if (ocrResult.success && ocrResult.text) {
      medicineInfo = extractMedicineInfo(ocrResult.text);
    }

    console.log("💾 Saving photo and medicine info to database...");
    const { data: insertData, error: insertError } = await supabase
      .from('user_captured_images_scan')
      .insert({
        user_id: user.id,
        image_url: publicUrl,
        medicine_name: medicineInfo.name,
        medicine_dosage: medicineInfo.dosage,
        confidence_level: medicineInfo.confidence
      })
      .select();

    if (insertError) {
      console.error("❌ Database insert error:", insertError);
      Alert.alert("Database Error", insertError.message);
      return;
    }

    // Create appropriate alert message based on extraction results
    if (ocrResult.success) {
      if (medicineInfo.name && medicineInfo.dosage) {
        Alert.alert(
          "Analysis Complete", 
          `Medicine identified: ${medicineInfo.name}\nDosage: ${medicineInfo.dosage}\n\nFull label text has been extracted and saved.`
        );
      } else if (medicineInfo.name) {
        Alert.alert(
          "Analysis Complete", 
          `Medicine identified: ${medicineInfo.name}\n\nDosage information not found in the label. Full label text has been extracted and saved.`
        );
      } else if (medicineInfo.dosage) {
        Alert.alert(
          "Analysis Complete", 
          `Dosage identified: ${medicineInfo.dosage}\n\nMedicine name not clearly identified. Full label text has been extracted and saved.`
        );
      } else {
        Alert.alert(
          "Analysis Complete", 
          "Medicine package scanned successfully! Text extracted but specific medicine name and dosage couldn't be identified automatically."
        );
      }
    } else {
      console.log("⚠️ Photo uploaded but OCR analysis failed:", ocrResult.error);
      Alert.alert(
        "Upload Complete", 
        "Photo saved but we couldn't read text from the image. Please ensure the package label is clear and try again."
      );
    }

    setTimeout(() => {
      router.replace("/AfterAnalysingMedicine");
    }, 1500);

  } catch (error) {
    console.error("❌ Error in processAndSaveImage:", error);
    Alert.alert("Error", "Failed to process image. Please try again.");
  }
  }, [router, uploadImageToSupabase, analyzeImageWithOCR]);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        exif: false,
      });

      if (photo) {
        setImage(photo.uri);
        setShowCamera(false);
        console.log("✅ Photo taken successfully:", photo.uri);

        // Process the image with OCR
        await processAndSaveImage(photo.uri, (photo as any).base64, 'camera');
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  }, [processAndSaveImage]);

  const toggleCameraFacing = useCallback(() => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }, []);

  const uploadPhoto = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Photo library access is needed to upload a photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
        aspect: [4, 3],
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photoUri = result.assets[0].uri;
        setImage(photoUri);
        setShowCamera(false);
        console.log("✅ Photo selected for upload:", photoUri);

        // Process the image with OCR
        await processAndSaveImage(photoUri, result.assets[0].base64 as unknown as string | undefined, 'upload');
      } else {
        console.log("Image selection was cancelled");
      }
    } catch (error) {
      console.error("Error opening image library:", error);
      Alert.alert("Error", "Failed to open image library. Please try again.");
    }
  }, [processAndSaveImage]);

  React.useEffect(() => {
    if (!permission && showCamera) {
      requestPermission();
    }
  }, [permission, requestPermission, showCamera]);

  React.useEffect(() => {
    if (params.fromUpload === "true" && !showCamera) {
      const timer = setTimeout(() => {
        router.replace("/AfterAnalysingMedicine");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [params.fromUpload, showCamera, router]);
  
  const isSmallScreen = width < 375;
  const isMediumScreen = width >= 375 && width < 768;
  const isLargeScreen = width >= 768;
  const isExtraLarge = width >= 1024;

  const getHorizontalPadding = () => {
    if (isExtraLarge) return width * 0.25;
    if (isLargeScreen) return width * 0.15;
    return 16;
  };

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

  if (showCamera && permission?.granted) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: "#000" }]} edges={['top']}>
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => {
                    setShowCamera(false);
                    router.back();
                  }}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </Pressable>
                <Text style={styles.cameraTitle}>Position medicine package</Text>
                <Pressable
                  style={styles.flipButton}
                  onPress={toggleCameraFacing}
                >
                  <Text style={styles.flipButtonText}>🔄</Text>
                </Pressable>
              </View>

              <View style={styles.cameraFrame} />

              <View style={styles.cameraControls}>
                <Pressable
                  style={styles.captureButton}
                  onPress={takePicture}
                >
                  <View style={styles.captureButtonInner} />
                </Pressable>
              </View>
            </View>
          </CameraView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: "#fff" }]} edges={['top']}>
      <View style={[styles.container, dynamicStyles.container]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Platform.OS === 'ios' ? 90 : 80 }
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, dynamicStyles.title]}>
              Scan Package
            </Text>
            <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
              Scan medicine packaging to identify and get information
            </Text>
          </View>

          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.loadingContainer}>
              <View style={[
                styles.spinner, 
                isAnalyzing && { borderTopColor: "transparent" }
              ]} />
              <Text style={[
                styles.analyzingText,
                isLargeScreen && { fontSize: 18 }
              ]}>
                {isAnalyzing ? "Analyzing medicine with OCR..." : "Ready to scan..."}
              </Text>
              {image && (
                <Image 
                  source={{ uri: image }} 
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </View>

          <View style={[
            styles.buttonRow,
            isLargeScreen && styles.buttonRowLarge
          ]}>
            <Pressable
              style={[
                styles.primaryButton,
                isLargeScreen && styles.buttonLarge,
                isAnalyzing && styles.buttonDisabled
              ]}
              onPress={() => setShowCamera(true)}
              disabled={isAnalyzing}
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
                isAnalyzing && styles.buttonDisabled
              ]}
              onPress={uploadPhoto}
              disabled={isAnalyzing}
            >
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
            </Pressable>
          </View>

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

        {/* Bottom Navigation - unchanged from your original code */}
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
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  cameraTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  flipButtonText: {
    fontSize: 20,
  },
  cameraFrame: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#0ea5e9",
    borderRadius: 20,
    margin: 40,
    borderStyle: "dashed",
  },
  cameraControls: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#0ea5e9",
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0ea5e9",
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
  loadingContainer: {
    alignItems: "center",
  },
  spinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: "#0ea5e9",
    borderTopColor: "transparent",
    marginBottom: 16,
  },
  analyzingText: {
    fontSize: 14,
    textAlign: "center",
    color: "#0f172a",
    fontFamily: "Inter-Medium",
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginTop: 16,
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
  buttonDisabled: {
    opacity: 0.6,
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
});

export default TakePhotoAndAnalyseMedicine;