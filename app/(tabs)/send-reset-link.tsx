import React from "react";
import { StyleSheet, View, Text, Image, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function SendResetLink() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#F8FBFF", "#E9F6FF"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Icon */}
          <Image
            source={require("../../assets/sendSuccess.png")}
            style={styles.icon}
          />

          {/* Title & Subtitle */}
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We’ve sent password reset instructions to:
          </Text>
          <Text style={styles.email}>john.doe@gmail.com</Text>

          {/* Steps Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Next steps:</Text>
            <Text style={styles.listItem}>Check your email inbox</Text>
            <Text style={styles.listItem}>Click on the reset password link</Text>
            <Text style={styles.listItem}>Create a new password</Text>
            <Text style={styles.listItem}>Sign in with your new password</Text>

            <Text style={styles.footerText}>Didn’t receive the email?</Text>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
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
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: "85%",
    alignItems: "center",
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: 20,
    resizeMode: "contain",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
  },
  email: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1E293B",
    marginTop: 6,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 24,
  },
  cardTitle: {
    fontWeight: "600",
    color: "#334155",
    fontSize: 14,
    marginBottom: 10,
  },
  listItem: {
    color: "#475569",
    fontSize: 13,
    marginBottom: 5,
    marginLeft: 2,
  },
  footerText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 14,
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 50,
    paddingVertical: 10,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: "#0F172A",
    fontSize: 13.5,
    textAlign: "center",
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: "#009EFF",
    width: "100%",
    borderRadius: 50,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
  },
});
