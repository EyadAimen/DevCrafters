import React from "react";
import { StyleSheet, View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function TermsOfService() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#f0f9ff", "#ecfeff"]} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Terms of Service</Text>

          <Text style={styles.paragraph}>
            Welcome to Pillora! By creating an account or using our services, you
            agree to the following terms. Please read them carefully before
            continuing.
          </Text>

          <Text style={styles.sectionTitle}>1. Use of the App</Text>
          <Text style={styles.paragraph}>
            You agree to use Pillora only for lawful purposes. You are
            responsible for maintaining the confidentiality of your login
            credentials and ensuring the accuracy of your personal information.
          </Text>

          <Text style={styles.sectionTitle}>2. Data and Privacy</Text>
          <Text style={styles.paragraph}>
            Pillora securely stores medication schedules and related data.
            However, it is your responsibility to ensure accuracy and follow
            prescribed medical advice.
          </Text>

          <Text style={styles.sectionTitle}>3. Disclaimer</Text>
          <Text style={styles.paragraph}>
            Pillora is not a substitute for medical advice. Always consult a
            healthcare professional for questions about your treatment or
            medication.
          </Text>

          <Text style={styles.sectionTitle}>4. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We may update these Terms occasionally. By continuing to use our
            app, you agree to any changes made.
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
