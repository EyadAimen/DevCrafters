import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function SendResetLink() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSendResetLink = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      // Use your actual Expo development URL
      const redirectUrl = __DEV__
        ? 'exp://192.168.0.10:8081/--/create-new-password' //change the ip again during testing
        : 'pillora://create-new-password';

      console.log('Sending reset email with redirect:', redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setResetSent(true);
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!resetSent) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={["#F8FBFF", "#E9F6FF"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradient}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoid}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.content}>
                {/* Back Button */}
                <Pressable
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>

                {/* Icon */}
                <Image
                  source={require("../../assets/sendSuccess.png")}
                  style={styles.icon}
                />

                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter your email address and we'll send you a link to reset your password
                </Text>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    editable={!loading}
                  />
                </View>

                <Pressable
                  style={[
                    styles.primaryButton,
                    (!email || loading) && styles.buttonDisabled
                  ]}
                  onPress={handleSendResetLink}
                  disabled={!email || loading}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => router.push("/login")}
                >
                  <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#F8FBFF", "#E9F6FF"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Success Icon */}
            <Image
              source={require("../../assets/sendSuccess.png")}
              style={styles.successIcon}
            />

            {/* Title & Subtitle */}
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent password reset instructions to:
            </Text>
            <Text style={styles.email}>{email}</Text>

            {/* Steps Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Next steps:</Text>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Check your email inbox (and spam folder)</Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Click on the reset password link</Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Create a new secure password</Text>
              </View>

              <View style={styles.step}>
                <Text style={styles.stepNumber}>4</Text>
                <Text style={styles.stepText}>Sign in with your new password</Text>
              </View>

              <Text style={styles.footerText}>
                Didn't receive the email? Check your spam folder or:
              </Text>

              <Pressable
                style={[styles.secondaryButton, loading && styles.buttonDisabled]}
                onPress={handleResendLink}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>
                  {loading ? "Sending..." : "Resend Link"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.textButton}
                onPress={() => setResetSent(false)}
              >
                <Text style={styles.textButtonText}>
                  Try another email address
                </Text>
              </Pressable>
            </View>

            {/* Back Button */}
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FBFF",
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    width: "85%",
    alignSelf: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
    padding: 8,
  },
  backButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "500",
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 24,
    resizeMode: "contain",
  },
  successIcon: {
    width: 100,
    height: 100,
    marginBottom: 24,
    resizeMode: "contain",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  email: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0EA5E9",
    marginBottom: 32,
    textAlign: "center",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1E293B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 32,
  },
  cardTitle: {
    fontWeight: "600",
    color: "#1E293B",
    fontSize: 18,
    marginBottom: 20,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  stepNumber: {
    backgroundColor: "#0EA5E9",
    color: "#FFFFFF",
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "600",
    marginRight: 12,
    marginTop: 2,
  },
  stepText: {
    color: "#475569",
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  footerText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 24,
    marginBottom: 16,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#0EA5E9",
    width: "100%",
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    textAlign: "center",
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
  },
  textButton: {
    paddingVertical: 12,
  },
  textButtonText: {
    color: "#0EA5E9",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});