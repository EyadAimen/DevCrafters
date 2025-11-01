import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";

const PersonalInformationEditProfile: React.FC = () => {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, phone, date_of_birth, address')
          .eq('user_id', user.id)
          .single();

        // Fetch from emergency_contact table
        const { data: emergency } = await supabase
          .from('emergency_contact')
          .select('ec_name, ec_phone')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setFullName(profile.username || '');
          setPhone(profile.phone || '');
          setDob(profile.date_of_birth || '');
          setAddress(profile.address || '');
          setEmail(user.email || '');
        }

        if (emergency) {
          setEmergencyName(emergency.ec_name || '');
          setEmergencyPhone(emergency.ec_phone || '');
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            username: fullName,
            phone: phone,
            date_of_birth: dob,
            address: address,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        // Update or insert emergency_contact
        const { error: emergencyError } = await supabase
          .from('emergency_contact')
          .upsert({
            user_id: user.id,
            ec_name: emergencyName,
            ec_phone: emergencyPhone,
            updated_at: new Date().toISOString()
          });

        if (profileError || emergencyError) {
          console.error('Error saving:', profileError || emergencyError);
          alert('Error saving changes');
        } else {
          alert('Profile updated successfully!');
          router.push("/personal-information");
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving changes');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/personal-information")} style={styles.backButton}>
          <Image source={require("../../assets/backArrow.png")} style={styles.backIcon} resizeMode="contain" />
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Personal Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputRow}>
              <Image source={require("../../assets/profileIcon.png")} style={styles.rowIcon} />
              <TextInput
                style={styles.inputRowText}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <Image source={require("../../assets/emailIcon.png")} style={styles.rowIcon} />
              <TextInput
                style={styles.inputRowText}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Image source={require("../../assets/phoneIcon.png")} style={styles.rowIcon} />
              <TextInput
                style={styles.inputRowText}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Date of Birth */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <View style={styles.inputRow}>
              <Image source={require("../../assets/calanderIcon.png")} style={styles.rowIcon} />
              <TextInput
                style={styles.inputRowText}
                value={dob}
                onChangeText={setDob}
                placeholder="DD/MM/YYYY"
              />
            </View>
          </View>

          {/* Address (multiline) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <View style={[styles.inputRow, { alignItems: 'flex-start', paddingVertical: 8, height: 80 }]}>
              <Image
                source={require("../../assets/locationIcon.png")}
                style={[styles.rowIcon, { marginTop: 4 }]}
              />
              <TextInput
                style={[styles.inputRowText, { height: 80, textAlignVertical: 'top' }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter address"
                multiline
              />
            </View>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Name</Text>
            <View style={styles.inputRow}>
              <Image source={require("../../assets/profileIcon.png")} style={styles.rowIcon} />
              <TextInput
                style={styles.inputRowText}
                value={emergencyName}
                onChangeText={setEmergencyName}
                placeholder="Enter name"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Image source={require("../../assets/phoneIcon.png")} style={styles.rowIcon} />
              <TextInput
                style={styles.inputRowText}
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                placeholder="Enter phone"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable style={styles.cancelButton} onPress={() => router.push("/personal-information")}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <LinearGradient
          colors={['#0ea5e9', '#0284c7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.saveButton}
        >
          <Pressable onPress={handleSave} style={styles.savePressable}>
            <Text style={styles.saveText}>Save Changes</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", padding: 20 },
  backButton: { marginRight: 12 },
  backIcon: { width: 24, height: 24 },
  title: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },

  card: { marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#0f172a", marginBottom: 12 },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    alignItems: "center"
  },
  cancelText: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },

  saveButton: { flex: 1, marginLeft: 8, borderRadius: 12 },
  savePressable: { paddingVertical: 12, alignItems: "center" },
  saveText: { fontSize: 14, fontWeight: "bold", color: "#fff" },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "bold", color: "#0f172a", marginBottom: 4 },

  inputRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  rowIcon: { width: 20, height: 20, marginRight: 8 },
  inputRowText: { flex: 1, fontSize: 14, paddingVertical: 8 },
});

export default PersonalInformationEditProfile;
