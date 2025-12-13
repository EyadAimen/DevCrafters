import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

const PharmacySelector = ({ onSelectPharmacy, selectedPharmacyId, selectedPharmacyName }) => {
  // Remove formData references and use props instead
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchPharmacies();
  }, []);

  const fetchPharmacies = async () => {
    try {
      const { data, error } = await supabase
        .from('pharmacy')
        .select('pharmacy_id, pharmacy_name')
        .order('pharmacy_name');

      if (error) throw error;
      setPharmacies(data || []);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Text style={{color: '#64748b', fontSize: 12}}>Loading pharmacies...</Text>;
  }

  return (
    <View>
      {/* Dropdown Trigger */}
      <Pressable
        style={{
          padding: 12,
          backgroundColor: "#f8fafc",
          borderWidth: 1,
          borderColor: "#e2e8f0",
          borderRadius: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={{
          color: selectedPharmacyId ? "#334155" : "#94a3b8", // Use selectedPharmacyId
          fontSize: 14
        }}>
          {selectedPharmacyName || "Select a pharmacy"} {/* Use selectedPharmacyName */}
        </Text>
        <Image
          source={require("../../assets/dropdown.png")}
          style={{
            width: 16,
            height: 16,
            tintColor: '#64748b',
            transform: [{ rotate: showDropdown ? '180deg' : '0deg' }]
          }}
        />
      </Pressable>

      {/* Dropdown Menu */}
      {showDropdown && (
        <View style={{
          position: 'absolute',
          top: 50,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: '#e2e8f0',
          borderRadius: 8,
          maxHeight: 200,
          zIndex: 1000,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}>
          <ScrollView nestedScrollEnabled>
            {pharmacies.map(pharmacy => (
              <Pressable
                key={pharmacy.pharmacy_id}
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9'
                }}
                onPress={() => {
                  onSelectPharmacy(pharmacy.pharmacy_id, pharmacy.pharmacy_name);
                  setShowDropdown(false);
                }}
              >
                <Text style={{
                  color: selectedPharmacyId === pharmacy.pharmacy_id ? "#0ea5e9" : "#334155", // Use selectedPharmacyId
                  fontWeight: selectedPharmacyId === pharmacy.pharmacy_id ? "600" : "400"
                }}>
                  {pharmacy.pharmacy_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default function CreateNewAccount() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "user",
    pharmacyId: "",
    pharmacyName: ""
  });

  const [toast, setToast] = useState({ visible: false, message: "", type: "" });

  const showToast = (message: string, type: string = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "" }), 3000);
  };

  const handleSignUp = async () => {
    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords don't match", "error");
      return;
    }

    setLoading(true);

    try {
      if (formData.role === "user") {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          showToast(error.message, "error");
          return;
        }

        if (data.user) {
          await supabase
            .from('profiles')
            .upsert({
              user_id: data.user.id,
              username: formData.fullName,
              phone: formData.phone
            });

          showToast("Account created successfully!", "success");
          setTimeout(() => router.push("/login"), 1500);
        }
      } else {
        // Pharmacy admin registration
        if (!formData.pharmacyId) {
          showToast("Please select your pharmacy", "error");
          setLoading(false);
          return;
        }

        // 1. Create auth user for admin
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) {
          showToast(authError.message, "error");
          setLoading(false);
          return;
        }

        // 2. Insert into pharmacy_admins
        const { data: admin, error } = await supabase
          .from('pharmacy_admins')
          .insert({
            auth_user_id: authData.user?.id,
            pharmacy_id: formData.pharmacyId,
            email: formData.email,
            password_hash: formData.password,
            full_name: formData.fullName,
            phone: formData.phone,
            approval_status: 'pending',
            is_active: false,
            requested_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          showToast(error.message, "error");
          setLoading(false);
          return;
        }

        // 3. Send Telegram notification
        await supabase.functions.invoke('send-telegram-approval', {
          body: {
            adminId: admin.id,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            pharmacyName: formData.pharmacyName
          }
        });

        // 4. Navigate to dashboard
        showToast("Admin account created!", "success");
        setTimeout(() => {
          router.push({
            pathname: "/login",
            params: {
              adminId: admin.id.toString(),
              pharmacyId: admin.pharmacy_id.toString(),
              email: admin.email,
              fullName: admin.full_name,
              approvalStatus: 'pending'
            }
          });
        }, 1500);
      }
    }
    catch (error) {
      showToast("Something went wrong", "error");
    }
    finally {
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

          {/* Role Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>I am a</Text>
            <View style={{flexDirection: 'row', marginBottom: 8}}>
              <Pressable
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: formData.role === "user" ? "#0ea5e9" : "#e2e8f0",
                  backgroundColor: formData.role === "user" ? "#f0f9ff" : "#f8fafc",
                  marginRight: 8,
                  alignItems: 'center'
                }}
                onPress={() => setFormData(prev => ({ ...prev, role: "user" }))}
              >
                <Text style={{
                  color: formData.role === "user" ? "#0ea5e9" : "#64748b",
                  fontWeight: formData.role === "user" ? "600" : "400"
                }}>
                  Patient / User
                </Text>
              </Pressable>
              <Pressable
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: formData.role === "admin" ? "#0ea5e9" : "#e2e8f0",
                  backgroundColor: formData.role === "admin" ? "#f0f9ff" : "#f8fafc",
                  alignItems: 'center'
                }}
                onPress={() => setFormData(prev => ({ ...prev, role: "admin" }))}
              >
                <Text style={{
                  color: formData.role === "admin" ? "#0ea5e9" : "#64748b",
                  fontWeight: formData.role === "admin" ? "600" : "400"
                }}>
                  Pharmacy Owner
                </Text>
              </Pressable>
            </View>
            {formData.role === "admin" && (
              <Text style={{color: '#f59e0b', fontSize: 12, marginTop: 4}}>
                Note: Requires approval before accessing admin dashboard
              </Text>
            )}
          </View>

          {/* Pharmacy Selection (only for admins) */}
          {formData.role === "admin" && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Your Pharmacy *</Text>
              <Text style={{color: '#64748b', fontSize: 12, marginBottom: 8}}>
                Choose your pharmacy from the list
              </Text>

              <PharmacySelector
                onSelectPharmacy={(pharmacyId, pharmacyName) =>
                  setFormData(prev => ({...prev, pharmacyId, pharmacyName}))
                }
                selectedPharmacyId={formData.pharmacyId}
                selectedPharmacyName={formData.pharmacyName}
              />

              {formData.pharmacyId ? (
                <Text style={{color: '#0ea5e9', fontSize: 12, marginTop: 4}}>
                  Selected: {formData.pharmacyName}
                </Text>
              ) : (
                <Text style={{color: '#ef4444', fontSize: 12, marginTop: 4}}>
                  Please select a pharmacy
                </Text>
              )}
            </View>
          )}

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
              style={[styles.primaryButton, loading && {opacity: 0.6}]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? "Creating..." : formData.role === "admin" ? "Continue as Pharmacy Owner" : "Create Account"}
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