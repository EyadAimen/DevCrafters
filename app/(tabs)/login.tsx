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



  const checkAdminLogin = async (email, password) => {
    try {
      // TEMPORARY: Use plain text while we fix the database
      // TODO: Hash passwords in database and update this
      const { data: admin, error } = await supabase
        .from('pharmacy_admins')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .single();

      if (error || !admin) return null;

      // TEMPORARY: Plain text comparison (FIX THIS SOON!)
      if (admin.password_hash === password) {
        return admin;
      }

      return null;
    } catch (error) {
      console.error('Admin login error:', error);
      return null;
    }
  };


  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      showToast("Please enter both email and password", "error");
      return;
    }

    setLoading(true);

    try {
      // 1. Check if it's an admin
      const { data: admin, error: adminError } = await supabase
        .from('pharmacy_admins')
        .select('id, email, pharmacy_id, full_name, password_hash')
        .eq('email', formData.email)
        .single();

      if (admin && !adminError) {
        // Check password
        let passwordValid = false;

        // If it looks like a hash (64 chars = SHA256)
        if (admin.password_hash.length === 64) {
          const hashedPassword = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            formData.password
          );
          passwordValid = admin.password_hash === hashedPassword;
        } else {
          // Plain text comparison
          passwordValid = admin.password_hash === formData.password;
        }

        if (passwordValid) {
          // ✅ ADMIN LOGIN SUCCESS
          showToast("Welcome to Admin Dashboard", "success");

          setTimeout(() => {
            router.push({
              pathname: "/admin-dashboard",
              params: {
                adminId: admin.id,
                pharmacyId: admin.pharmacy_id,
                email: admin.email,
                fullName: admin.full_name || 'Admin',
                approvalStatus: 'approved' // Hardcode as approved since we're not checking
              }
            });
          }, 1500);

          setLoading(false);
          return;
        }
      }

      // 2. If not admin or password wrong, try regular user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        showToast("Invalid email or password", "error");
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
          {/* Admin Hint */}
          <Text style={{
            color: '#64748b',
            fontSize: 12,
            textAlign: 'center',
            marginTop: 12,
            fontStyle: 'italic'
          }}>
            Pharmacy owners: Use your admin credentials
          </Text>
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
