import React from "react";
import { Text, StyleSheet, View, Pressable, ScrollView, Image, ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

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
            <Text style={styles.avatarText}>J</Text>
          </LinearGradient>

          <View style={styles.userInfoContainer}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>John Doe</Text>
              <Text style={styles.userSince}>Pillora member since Jan 2024</Text>
            </View>
            <Pressable style={styles.editButton} onPress={() => router.push("/edit-profile")}>
              <Text style={styles.editText}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Personal Details */}
        <View style={styles.card}>
          <InfoRow label="Full Name" value="John Doe" icon={require("../../assets/profileIcon.png")} />
          <InfoRow label="Email Address" value="john.doe@example.com" icon={require("../../assets/emailIcon.png")} />
          <InfoRow label="Phone Number" value="+60 12-345 6789" icon={require("../../assets/phoneIcon.png")} />
          <InfoRow label="Date of Birth" value="15 January 1990" icon={require("../../assets/calanderIcon.png")} />
          <InfoRow label="Address" value="123 Jalan Bukit Bintang, 55100 Kuala Lumpur" icon={require("../../assets/profileAddress.png")} />
        </View>

        {/* Emergency Contact Section */}
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        <View style={styles.card}>
          <InfoRow label="Contact Name" value="Jane Doe" icon={require("../../assets/profileIcon.png")} />
          <InfoRow label="Phone Number" value="+60 12-987 6543" icon={require("../../assets/phoneIcon.png")} />
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
