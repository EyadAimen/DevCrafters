import React, { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  Animated,
  TextInput,
  Image,
  Pressable,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [toast, setToast] = useState({ visible: false, message: "", type: "" });

  const showToast = (message: string, type: string = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "" }), 3000);
  };


  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      showToast("Please enter both email and password", "error");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        showToast("Email or password is incorrect", "error");
      } else {
        showToast("Welcome back!", "success");
        setTimeout(() => router.push("/home"), 1500);
      }
    } catch (error) {
      showToast("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#f0f9ff", "#eff6ff", "#ecfeff"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Logo + Title */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/pilloraLogo.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>Pillora</Text>
          <Text style={styles.subtitle}>Your medication companion, on time</Text>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <Image
                source={require("../../assets/emailIcon.png")}
                style={styles.icon}
              />
              <TextInput
                placeholder="john.doe@example.com"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({...prev, email: text}))}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={[styles.inputContainer, { marginTop: 18 }]}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Image
                source={require("../../assets/passwordIcon.png")}
                style={styles.icon}
              />
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({...prev, password: text}))}
              />
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push("/forgot-password") }>
            <Text style={styles.forgotPasswordText} >Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <Pressable
            style={styles.signInButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.signInText}>
              {loading ? "Signing In..." : "Sign In"}
            </Text>
          </Pressable>
        </View>

        {/* Demo Credentials */}
        <View style={styles.demoBox}>
          <Text style={styles.demoText}>Demo Credentials:</Text>
          <Text style={styles.demoCreds}>Email: demo@example.com</Text>
          <Text style={styles.demoCreds}>Password: demo123</Text>
        </View>

        {/* Create New Account */}
        <View style={styles.bottomText}>
          <Text style={styles.normalText}>Don’t have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/create-new-account")}>
            <Text style={styles.createAccountText}>Create New Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </LinearGradient>
      {toast.visible && (
        <View style={{
          position: "absolute",top: 60,left: 20,right: 20,padding: 16,borderRadius: 12, alignItems: "center", backgroundColor: toast.type === "success" ? "#0ea5e9" : "#ef4444", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
        }}>
          <Text style={{color: "#fff", fontWeight: "500", fontSize: 14,
          }}>{toast.message}</Text>
       </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  gradient: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: { alignItems: "center", marginBottom: 40 },
  logo: { width: 80, height: 80, borderRadius: 16, marginBottom: 8 },
  title: { fontSize: 30, color: "#0f172a", fontWeight: "600" },
  subtitle: { color: "#64748b", fontSize: 14, marginTop: 4 },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  inputContainer: { marginBottom: 4 },
  label: { color: "#0f172a", fontSize: 12, marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: "#e2e8f0",
    paddingHorizontal: 10,
    height: 42,
  },
  icon: { width: 20, height: 20, marginRight: 8 },
  input: { flex: 1, color: "#0f172a", fontSize: 14 },
  forgotPassword: { alignSelf: "flex-end", marginTop: 10 },
  forgotPasswordText: { color: "#0ea5e9", fontSize: 12 },
  signInButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    marginTop: 20,
    paddingVertical: 12,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  signInText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  demoBox: {
    marginTop: 24,
    width: "100%",
    backgroundColor: "#f8fafc",
    borderColor: "#dbeafe",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  demoText: { color: "#1e293b", fontWeight: "500", marginBottom: 4 },
  demoCreds: { color: "#1d4ed8", fontSize: 14 },
  bottomText: { flexDirection: "row", marginTop: 24, alignItems: "center" },
  normalText: { color: "#64748b", fontSize: 13 },
  createAccountText: { color: "#0f172a", fontSize: 13, fontWeight: "500" },
  footerText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 11,
    marginTop: 16,
    width: "85%",
  },
});
