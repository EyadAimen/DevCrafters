import React from "react";
import { StyleSheet, View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#f0f9ff", "#ecfeff"]} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Privacy Policy</Text>

          <Text style={styles.paragraph}>
            Your privacy is important to us. This policy explains how Pillora
            collects, uses, and protects your information.
          </Text>

          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect basic user data such as your name, email address, and
            medication details to provide personalized reminders.
          </Text>

          <Text style={styles.sectionTitle}>2. How We Use Your Data</Text>
          <Text style={styles.paragraph}>
            Your data is used solely to deliver medication notifications,
            reminders, and app functionality. We do not sell or share your data
            with third parties.
          </Text>

          <Text style={styles.sectionTitle}>3. Data Security</Text>
          <Text style={styles.paragraph}>
            We use secure cloud storage and encryption to protect your personal
            information. However, no system is 100% secure, and we cannot
            guarantee complete data safety.
          </Text>

          <Text style={styles.sectionTitle}>4. Your Rights</Text>
          <Text style={styles.paragraph}>
            You can request to view, update, or delete your information anytime
            by contacting our support team.
          </Text>

          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Back</Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  gradient: { flex: 1 },
  scroll: { padding: 24 },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  button: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
});
