import React from "react";
import { Text, StyleSheet, View, Pressable, ScrollView, Image, ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

type InfoRowProps = {
  label: string;
  value: string;
  icon: ImageSourcePropType; // PNG image
};

const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => (
  <View style={styles.row}>
    <Image source={icon} style={styles.icon} resizeMode="contain" />
    <View style={styles.rowText}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

const PersonalInformation: React.FC = () => {
  const router = useRouter();
  const [userData, setUserData] = useState({
    username: '',
    phone: '',
    date_of_birth: '',
    address: '',
    email: ''
  });
  const [emergencyContact, setEmergencyContact] = useState({
    ec_name: '',
    ec_phone: ''
  });
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
          setUserData({
            ...profile,
            email: user.email || 'No email'
          });
        }

        if (emergency) {
          setEmergencyContact(emergency);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.push("/profile")}>
            <Image source={require("../../assets/backArrow.png")} style={styles.backIcon} resizeMode="contain" />
          </Pressable>
          <Text style={styles.title}>Personal Information</Text>
        </View>
        <Text style={styles.subtitle}>Manage your profile details</Text>

        {/* User Card */}
        <View style={styles.userCard}>
          <LinearGradient
            colors={['#0ea5e9', '#0284c7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {userData.username ? userData.username.substring(0, 1).toUpperCase() : 'U'}
            </Text>
          </LinearGradient>

          <View style={styles.userInfoContainer}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userData.username || 'User'}</Text>
              {/* Remove "Pillora member since" line */}
            </View>
            <Pressable style={styles.editButton} onPress={() => router.push("/edit-profile")}>
              <Text style={styles.editText}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Personal Details */}
        <View style={styles.card}>
          <InfoRow label="Full Name" value={userData.username || 'Not set'} icon={require("../../assets/profileIcon.png")} />
          <InfoRow label="Email Address" value={userData.email || 'Not set'} icon={require("../../assets/emailIcon.png")} />
          <InfoRow label="Phone Number" value={userData.phone || 'Not set'} icon={require("../../assets/phoneIcon.png")} />
          <InfoRow label="Date of Birth" value={userData.date_of_birth || 'Not set'} icon={require("../../assets/calanderIcon.png")} />
          <InfoRow label="Address" value={userData.address || 'Not set'} icon={require("../../assets/profileAddress.png")} />
        </View>

        {/* Emergency Contact Section */}
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        <View style={styles.card}>
          <InfoRow label="Contact Name" value={emergencyContact.ec_name || 'Not set'} icon={require("../../assets/profileIcon.png")} />
          <InfoRow label="Phone Number" value={emergencyContact.ec_phone || 'Not set'} icon={require("../../assets/phoneIcon.png")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 20 },
  backButton: { marginRight: 12 },
  backIcon: { width: 24, height: 24 },
  title: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", marginHorizontal: 20, marginTop: 4 },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#0f172a", marginHorizontal: 16, marginTop: 16, marginBottom: 8 },

  // User card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
    marginTop: 10,
    elevation: 2,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  userInfoContainer: { flex: 1, flexDirection: "row", alignItems: "center", marginLeft: 16 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  userSince: { fontSize: 12, color: "#64748b", marginTop: 2 },
  editButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  editText: { fontSize: 12, fontWeight: "bold", color: "#0f172a" },

  // Cards
  card: { marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 20, padding: 16, marginTop: 12 },

  // Info row
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  icon: { width: 24, height: 24 },
  rowText: { marginLeft: 12, flex: 1 },
  label: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  value: { fontSize: 12, color: "#64748b", marginTop: 2 },
});

export default PersonalInformation;
