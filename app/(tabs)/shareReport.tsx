import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
    Platform,
    Linking
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { Feather } from "@expo/vector-icons";
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

export default function ShareReportScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [localUri, setLocalUri] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const isPreparingFile = useRef(false);

    const report = params.report ? JSON.parse(params.report as string) : null;

    useEffect(() => {
        if (!report) {
            setError("No report data found");
            setLoading(false);
            return;
        }

        prepareFile();
    }, [report]);

    const prepareFile = async () => {
        if (isPreparingFile.current || localUri) return;
        
        isPreparingFile.current = true;
        setLoading(true);
        setError(null);

        try {
            let finalUri: string | null = null;

            // First check if we already have a local file URI
            if (report.file_url && report.file_url.startsWith("file://")) {
                const fileInfo = await FileSystem.getInfoAsync(report.file_url);
                if (fileInfo.exists) {
                    console.log("Using existing local file:", report.file_url);
                    finalUri = report.file_url;
                }
            }

            // If no local file, download from storage
            if (!finalUri && report.storage_path) {
                console.log("Downloading from storage:", report.storage_path);
                const { data, error: downloadError } = await supabase.storage
                    .from("medical-reports")
                    .download(report.storage_path);

                if (downloadError) throw downloadError;
                if (!data) throw new Error("Downloaded file data is empty.");

                const fileName = report.file_name || `report_${report.id}.pdf`;
                const uri = FileSystem.cacheDirectory + fileName;

                // Clean up any existing file with the same name
                try {
                    const existingFile = await FileSystem.getInfoAsync(uri);
                    if (existingFile.exists) {
                        await FileSystem.deleteAsync(uri);
                    }
                } catch (e) {
                    console.log("No existing file to delete");
                }

                // Convert blob to base64
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(data);
                    reader.onload = () => {
                        if (typeof reader.result === 'string') {
                            const base64Data = reader.result.split(',')[1];
                            if (base64Data) {
                                resolve(base64Data);
                            } else {
                                reject(new Error("Failed to extract base64 data."));
                            }
                        } else {
                            reject(new Error("Failed to read file as base64 data URL."));
                        }
                    };
                    reader.onerror = (error) => reject(error);
                });

                await FileSystem.writeAsStringAsync(uri, base64, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                
                // Verify the file was written
                const fileInfo = await FileSystem.getInfoAsync(uri);
                if (!fileInfo.exists) {
                    throw new Error("Failed to save file locally.");
                }
                
                console.log("File saved successfully:", uri);
                finalUri = uri;
            } 
            // Try external URL as fallback
            else if (!finalUri && report.file_url) {
                console.log("Downloading from external URL:", report.file_url);
                const fileName = `report_${report.id}.pdf`;
                const uri = FileSystem.cacheDirectory + fileName;
                
                // Clean up any existing file with the same name
                try {
                    const existingFile = await FileSystem.getInfoAsync(uri);
                    if (existingFile.exists) {
                        await FileSystem.deleteAsync(uri);
                    }
                } catch (e) {
                    console.log("No existing file to delete");
                }
                
                const { uri: downloadedUri } = await FileSystem.downloadAsync(report.file_url, uri);
                
                // Verify download
                const fileInfo = await FileSystem.getInfoAsync(downloadedUri);
                if (!fileInfo.exists) {
                    throw new Error("Failed to download file.");
                }
                
                console.log("File downloaded successfully:", downloadedUri);
                finalUri = downloadedUri;
            } 
            else if (!finalUri) {
                throw new Error("No file URL or storage path found");
            }

            setLocalUri(finalUri);
            setError(null);
        } catch (error: any) {
            console.error("Error preparing file:", error);
            setError(error.message || "Failed to prepare file");
            setLocalUri(null);
        } finally {
            setLoading(false);
            isPreparingFile.current = false;
        }
    };

    const shareToWhatsApp = async () => {
        if (!localUri) {
            Alert.alert("Error", "File is not ready yet. Please wait.");
            return;
        }

        try {
            // Verify file exists
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (!fileInfo.exists) {
                Alert.alert("Error", "File not found. Please try again.");
                setLocalUri(null);
                prepareFile();
                return;
            }

            console.log("Sharing to WhatsApp:", localUri);
            
            if (Platform.OS === 'android') {
                // For Android - Get content URI
                const contentUri = await FileSystem.getContentUriAsync(localUri);
                
                // Try to open WhatsApp directly
                try {
                    // Method 1: Direct intent to WhatsApp
                    await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
                        type: 'application/pdf',
                        packageName: 'com.whatsapp',
                        extra: {
                            'android.intent.extra.STREAM': contentUri,
                            'android.intent.extra.TEXT': `Medical Report: ${report?.title || ''}`,
                        },
                        data: contentUri
                    });
                } catch (error) {
                    console.log("Direct intent failed, trying alternative method");
                    
                    // Method 2: Alternative approach
                    try {
                        await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
                            type: 'application/pdf',
                            extra: {
                                'android.intent.extra.STREAM': contentUri,
                                'android.intent.extra.TEXT': `Medical Report: ${report?.title || ''}`,
                                'android.intent.extra.SUBJECT': report?.title || 'Medical Report'
                            }
                        });
                    } catch (error2) {
                        console.log("Alternative method failed, trying system share");
                        // Last resort: System share sheet
                        await Sharing.shareAsync(contentUri, {
                            mimeType: 'application/pdf',
                            dialogTitle: 'Share via WhatsApp',
                            UTI: 'com.adobe.pdf'
                        });
                    }
                }
            } else {
                // For iOS
                try {
                    // Method 1: Try to open WhatsApp directly
                    const message = encodeURIComponent(`Medical Report: ${report?.title || ''}`);
                    const whatsappUrl = `whatsapp://send?text=${message}`;
                    
                    // Don't check if it can open first, just try to open it
                    const opened = await Linking.openURL(whatsappUrl);
                    
                    if (!opened) {
                        throw new Error("Could not open WhatsApp");
                    }
                    
                    // Show instruction after a delay
                    setTimeout(() => {
                        Alert.alert(
                            "Attach File",
                            "Please tap the attachment icon (📎) in WhatsApp and select 'Document' to attach the PDF file.",
                            [{ text: "OK" }]
                        );
                    }, 1000);
                    
                } catch (error) {
                    console.log("Direct WhatsApp opening failed:", error);
                    
                    // Method 2: Use system share with WhatsApp as an option
                    await Sharing.shareAsync(localUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share via WhatsApp',
                        UTI: 'com.adobe.pdf'
                    });
                }
            }
        } catch (error: any) {
            console.error("WhatsApp share error:", error);
            
            // Don't show error about WhatsApp not installed
            // Just fall back to system share
            try {
                if (Platform.OS === 'android') {
                    const contentUri = await FileSystem.getContentUriAsync(localUri!);
                    await Sharing.shareAsync(contentUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share Medical Report',
                        UTI: 'com.adobe.pdf'
                    });
                } else {
                    await Sharing.shareAsync(localUri!, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share Medical Report',
                        UTI: 'com.adobe.pdf'
                    });
                }
            } catch (shareError) {
                Alert.alert("Error", "Failed to share the file. Please try again.");
            }
        }
    };

    const shareToTelegram = async () => {
        if (!localUri) {
            Alert.alert("Error", "File is not ready yet. Please wait.");
            return;
        }

        try {
            // Verify file exists
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (!fileInfo.exists) {
                Alert.alert("Error", "File not found. Please try again.");
                setLocalUri(null);
                prepareFile();
                return;
            }

            console.log("Sharing to Telegram:", localUri);
            
            if (Platform.OS === 'android') {
                // For Android - Get content URI
                const contentUri = await FileSystem.getContentUriAsync(localUri);
                
                // Try to open Telegram directly
                try {
                    await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
                        type: 'application/pdf',
                        packageName: 'org.telegram.messenger',
                        extra: {
                            'android.intent.extra.STREAM': contentUri,
                            'android.intent.extra.TEXT': `Medical Report: ${report?.title || ''}`,
                        },
                        data: contentUri
                    });
                } catch (error) {
                    console.log("Direct intent failed, trying alternative");
                    // Fall back to system share
                    await Sharing.shareAsync(contentUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share via Telegram',
                        UTI: 'com.adobe.pdf'
                    });
                }
            } else {
                // For iOS
                try {
                    // Try to open Telegram directly
                    const message = encodeURIComponent(`Medical Report: ${report?.title || ''}`);
                    const telegramUrl = `tg://msg?text=${message}`;
                    
                    // Don't check first, just try to open
                    const opened = await Linking.openURL(telegramUrl);
                    
                    if (!opened) {
                        throw new Error("Could not open Telegram");
                    }
                    
                    // Show instruction after a delay
                    setTimeout(() => {
                        Alert.alert(
                            "Attach File",
                            "Please tap the attachment icon (📎) in Telegram to attach the PDF file.",
                            [{ text: "OK" }]
                        );
                    }, 1000);
                    
                } catch (error) {
                    console.log("Direct Telegram opening failed:", error);
                    
                    // Fall back to system share
                    await Sharing.shareAsync(localUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share via Telegram',
                        UTI: 'com.adobe.pdf'
                    });
                }
            }
        } catch (error: any) {
            console.error("Telegram share error:", error);
            
            // Fall back to system share without error message
            try {
                if (Platform.OS === 'android') {
                    const contentUri = await FileSystem.getContentUriAsync(localUri!);
                    await Sharing.shareAsync(contentUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share Medical Report',
                        UTI: 'com.adobe.pdf'
                    });
                } else {
                    await Sharing.shareAsync(localUri!, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share Medical Report',
                        UTI: 'com.adobe.pdf'
                    });
                }
            } catch (shareError) {
                Alert.alert("Error", "Failed to share the file. Please try again.");
            }
        }
    };

    const shareToDefault = async () => {
        if (!localUri) {
            Alert.alert("Error", "File is not ready yet. Please wait.");
            return;
        }

        try {
            // Verify file exists
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (!fileInfo.exists) {
                Alert.alert("Error", "File not found. Please try again.");
                setLocalUri(null);
                prepareFile();
                return;
            }

            console.log("Sharing via system share sheet:", localUri);
            
            if (Platform.OS === 'android') {
                const contentUri = await FileSystem.getContentUriAsync(localUri);
                await Sharing.shareAsync(contentUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Share ${report?.title || 'Medical Report'}`,
                    UTI: 'com.adobe.pdf'
                });
            } else {
                await Sharing.shareAsync(localUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Share ${report?.title || 'Medical Report'}`,
                    UTI: 'com.adobe.pdf'
                });
            }
        } catch (error: any) {
            console.error("Share error:", error);
            Alert.alert("Error", "Failed to share file: " + (error.message || "Unknown error"));
        }
    };

    // Show error if no report
    if (!report) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Image
                            source={require("../../assets/backArrow.png")}
                            style={styles.backIcon}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Share Report</Text>
                </View>
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>No report data available</Text>
                    <TouchableOpacity 
                        style={styles.button}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image
                        source={require("../../assets/backArrow.png")}
                        style={styles.backIcon}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Share Report</Text>
            </View>

            <ScrollView 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <Image
                        source={require("../../assets/PDFB.png")}
                        style={styles.pdfIcon}
                        resizeMode="contain"
                    />
                    <Text style={styles.reportTitle}>{report?.title || "Medical Report"}</Text>
                    <Text style={styles.reportDate}>
                        {report?.start_date} - {report?.end_date}
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>Share via</Text>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#0ea5e9" />
                        <Text style={styles.loadingText}>Preparing file...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerContainer}>
                        <Feather name="alert-circle" size={48} color="#ef4444" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity 
                            style={styles.button}
                            onPress={prepareFile}
                        >
                            <Text style={styles.buttonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : localUri ? (
                    <View style={styles.optionsContainer}>
                        <TouchableOpacity
                            style={[styles.optionButton, styles.whatsappButton]}
                            onPress={shareToWhatsApp}
                            activeOpacity={0.8}
                        >
                            <Feather name="message-circle" size={24} color="#fff" />
                            <Text style={styles.optionText}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.optionButton, styles.telegramButton]}
                            onPress={shareToTelegram}
                            activeOpacity={0.8}
                        >
                            <Feather name="send" size={24} color="#fff" />
                            <Text style={styles.optionText}>Telegram</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.optionButton, styles.defaultButton]}
                            onPress={shareToDefault}
                            activeOpacity={0.8}
                        >
                            <Feather name="share-2" size={24} color="#0f172a" />
                            <Text style={[styles.optionText, styles.defaultOptionText]}>More Options</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.centerContainer}>
                        <Text style={styles.infoText}>File not prepared</Text>
                        <TouchableOpacity 
                            style={styles.button}
                            onPress={prepareFile}
                        >
                            <Text style={styles.buttonText}>Prepare File</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// Styles remain the same...
const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: "#f8fafc" 
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    backButton: { 
        marginRight: 16,
        padding: 4,
    },
    backIcon: { 
        width: 24, 
        height: 24,
        tintColor: "#0f172a",
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: "bold", 
        color: "#0f172a" 
    },
    content: { 
        padding: 20, 
        flexGrow: 1,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginBottom: 32,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    pdfIcon: { 
        width: 80, 
        height: 80, 
        marginBottom: 16 
    },
    reportTitle: { 
        fontSize: 20, 
        fontWeight: "bold", 
        color: "#0f172a", 
        textAlign: "center", 
        marginBottom: 8 
    },
    reportDate: { 
        fontSize: 14, 
        color: "#64748b" 
    },
    sectionTitle: { 
        fontSize: 18, 
        fontWeight: "600", 
        color: "#0f172a", 
        marginBottom: 24,
        marginLeft: 4,
    },
    centerContainer: { 
        alignItems: "center", 
        justifyContent: "center",
        padding: 40,
    },
    loadingText: { 
        marginTop: 16, 
        color: "#64748b",
        fontSize: 16,
    },
    optionsContainer: { 
        gap: 16,
        marginTop: 8,
    },
    optionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        borderRadius: 16,
        gap: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    whatsappButton: { 
        backgroundColor: "#25D366" 
    },
    telegramButton: { 
        backgroundColor: "#0088cc" 
    },
    defaultButton: { 
        backgroundColor: "#fff", 
        borderWidth: 1, 
        borderColor: "#e2e8f0",
    },
    optionText: { 
        fontSize: 17, 
        fontWeight: "600", 
        color: "#fff" 
    },
    defaultOptionText: {
        color: "#0f172a",
    },
    errorText: { 
        fontSize: 16, 
        color: "#ef4444", 
        textAlign: "center",
        marginBottom: 20,
        marginTop: 16,
    },
    infoText: {
        fontSize: 16,
        color: "#64748b",
        textAlign: "center",
        marginBottom: 20,
        marginTop: 16,
    },
    button: {
        backgroundColor: "#0ea5e9",
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 8,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
});