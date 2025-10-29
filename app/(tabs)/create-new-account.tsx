import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function CreateNewAccount() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const handleSignUp = async () => {
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      // Create user in Supabase
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        Alert.alert("Signup Failed", error.message);
        return;
      }

      if (data.user) {
        // Update user profile with name and phone
        await supabase
          .from('users')
          .update({
            username: formData.fullName,
            phone: formData.phone
          })
          .eq('user_id', data.user.id);

        Alert.alert("Success!", "Account created successfully!");
        router.push("/login");
      }

    } catch (error) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["rgba(14, 165, 233, 0.05)", "#f8fafc"]}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join us to manage your medications
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputRow}>
                <Image
                  source={require("../../assets/nameIcon.png")}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#94a3b8"
                  onChangeText={(text) => setFormData(prev => ({...prev, fullName: text}))}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputRow}>
                <Image
                  source={require("../../assets/emailIcon.png")}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="john.doe@example.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(text) => setFormData(prev => ({...prev, email: text}))}
                />
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputRow}>
                <Image
                  source={require("../../assets/phoneIcon.png")}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  onChangeText={(text) => setFormData(prev => ({...prev, phone: text}))}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Image
                  source={require("../../assets/passwordIcon.png")}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  onChangeText={(text) => setFormData(prev => ({...prev, password: text}))}
                />
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputRow}>
                <Image
                  source={require("../../assets/passwordIcon.png")}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  onChangeText={(text) => setFormData(prev => ({...prev, confirmPassword: text}))}
                />
              </View>
            </View>

            {/* Terms */}
            <View style={styles.termsRow}>
              <Text style={styles.termsText}>By continuing, I agree to the </Text>
              <Pressable onPress={() => router.push("/terms-of-service")}>
                <Text style={styles.link}>Terms of Service</Text>
              </Pressable>
              <Text style={styles.termsText}> and </Text>
              <Pressable onPress={() => router.push("/privacy-policy")}>
                <Text style={styles.link}>Privacy Policy</Text>
              </Pressable>
            </View>

            {/* Create Account Button */}
            <Pressable
              style={styles.primaryButton}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? "Creating..." : "Create Account"}
              </Text>
            </Pressable>

            {/* Already have account */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable onPress={() => router.push("/login")}>
                <Text style={styles.footerLink}> Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E7F1FF" },
  buttonDisabled: {opacity: 0.6,},
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingVertical: 32 },
  header: { marginBottom: 24, alignItems: "center" },
  title: { fontSize: 24, fontWeight: "600", color: "#0f172a" },
  subtitle: { color: "#64748b", fontSize: 14, marginTop: 4 },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, color: "#0f172a", marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
    height: 44,
  },
  icon: { width: 20, height: 20, marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: "#334155" },
  termsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 12,
    justifyContent: "center",
  },
  termsText: { color: "#64748b", fontSize: 12 },
  link: {
    color: "#0ea5e9",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  primaryButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "500" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  footerText: { color: "#64748b", fontSize: 14 },
  footerLink: { color: "#0ea5e9", fontSize: 14 },
});