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
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  type UploadResult = {
    data: any;
    error: Error | null;
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

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo) {
        setImage(photo.uri);
        setShowCamera(false);
        console.log("✅ Photo taken successfully:", photo.uri);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          Alert.alert("Error", "User not logged in");
          return;
        }

        const fileName = `${user.id}-${Date.now()}.jpg`;
        
        console.log("⬆️ Uploading camera photo to medicine-images bucket...");
        const { data: uploadData, error: uploadError } = await uploadImageToSupabase(photo.uri, fileName, (photo as any).base64);

        if (uploadError) {
          console.error("❌ Storage upload error:", uploadError);
          Alert.alert("Upload failed", uploadError.message);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('medicine-images')
          .getPublicUrl(fileName);
        
        console.log("🌐 Public URL:", publicUrl);

        console.log("💾 Saving camera photo to database...");
        const { data: insertData, error: insertError } = await supabase
          .from('user_captured_images_scan')
          .insert({
            user_id: user.id,
            image_url: publicUrl
          })
          .select();

        if (insertError) {
          console.error("❌ Database insert error:", insertError);
          Alert.alert("Database Error", insertError.message);
          return;
        }

        console.log("✅ SUCCESS! Camera photo uploaded and saved to database!");
        Alert.alert("Success", "Photo captured and saved successfully!");

        setTimeout(() => {
          router.replace("/AfterAnalysingMedicine");
        }, 1000);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  }, [router]);

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
        quality: 0.8,
        aspect: [4, 3],
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photoUri = result.assets[0].uri;
        setImage(photoUri);
        setShowCamera(false);
        console.log("✅ Photo selected for upload:", photoUri);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          Alert.alert("Error", "User not logged in");
          return;
        }

        const fileName = `${user.id}-${Date.now()}.jpg`;
        
        console.log("⬆️ Uploading selected photo to medicine-images bucket...");
        const { data: uploadData, error: uploadError } = await uploadImageToSupabase(photoUri, fileName, result.assets[0].base64 as unknown as string | undefined);

        if (uploadError) {
          console.error("❌ Storage upload error:", uploadError);
          Alert.alert("Upload failed", uploadError.message);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('medicine-images')
          .getPublicUrl(fileName);
        
        console.log("🌐 Public URL:", publicUrl);

        console.log("💾 Saving uploaded photo to database...");
        const { data: insertData, error: insertError } = await supabase
          .from('user_captured_images_scan')
          .insert({
            user_id: user.id,
            image_url: publicUrl
          })
          .select();

        if (insertError) {
          console.error("❌ Database insert error:", insertError);
          Alert.alert("Database Error", insertError.message);
          return;
        }

        console.log("✅ SUCCESS! Uploaded photo saved to database!");
        Alert.alert("Success", "Photo uploaded successfully!");
        
        setTimeout(() => {
          router.replace("/AfterAnalysingMedicine");
        }, 1000);
      } else {
        console.log("Image selection was cancelled");
      }
    } catch (error) {
      console.error("Error opening image library:", error);
      Alert.alert("Error", "Failed to open image library. Please try again.");
    }
  }, [router]);

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
              <View style={styles.spinner} />
              <Text style={[
                styles.analyzingText,
                isLargeScreen && { fontSize: 18 }
              ]}>
                Analyzing medicine...
              </Text>
            </View>
          </View>

          <View style={[
            styles.buttonRow,
            isLargeScreen && styles.buttonRowLarge
          ]}>
            <Pressable
              style={[
                styles.primaryButton,
                isLargeScreen && styles.buttonLarge
              ]}
              onPress={() => setShowCamera(true)}
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
                isLargeScreen && styles.buttonLarge
              ]}
              onPress={uploadPhoto}
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
                Tips for best results:
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
            </View>
          </View>
        </ScrollView>

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
});

export default TakePhotoAndAnalyseMedicine;