import React from "react";
import { View, Text, StyleSheet, Image, Pressable, ScrollView, useWindowDimensions, ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/BottomNavigation";
import { useRouter } from "expo-router";

type SettingRowProps = {
  title: string;
  subtitle: string;
  icon: ImageSourcePropType;
  onPress?: () => void;
};

const SettingRow: React.FC<SettingRowProps> = ({ title, subtitle, icon, onPress }) => (
  <Pressable style={styles.settingRow} onPress={onPress}>
    {/* Light blue circle with icon inside */}
    <View style={styles.iconCircle}>
      <Image source={icon} style={styles.settingIcon} resizeMode="contain" />
    </View>

    <View style={styles.settingText}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingSubtitle}>{subtitle}</Text>
    </View>
  </Pressable>
);

const Profile: React.FC = () => {
  const { width } = useWindowDimensions();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.profileTitle}>Profile</Text>
          <Text style={styles.profileSubtitle}>Manage your account settings</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <LinearGradient
            colors={['#0ea5e9', '#0284c7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>JD</Text>
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>John Doe</Text>
            <Text style={styles.userEmail}>john.doe@example.com</Text>
            <Text style={styles.userSince}>Pillora member since Jan 2024</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsContainer}>
          <SettingRow
            title="Medication Reminders"
            subtitle="Get notified for doses"
            icon={require("../../assets/profileNoti.png")}
          />
          <SettingRow
            title="Personal Information"
            subtitle="Update your details"
            icon={require("../../assets/profilePersonalIn.png")}
            onPress={() => router.push("/personal-information")} // Navigate to PersonalInformation
          />
          <SettingRow
            title="Medical History"
            subtitle="View reports and records"
            icon={require("../../assets/profileMedicalHis.png")}
          />
          <SettingRow
            title="Payment Methods"
            subtitle="Saved cards and wallets"
            icon={require("../../assets/profilePayment.png")}
          />
          <SettingRow
            title="Pharmacies"
            subtitle="Manage preferred locations"
            icon={require("../../assets/profilePharmacy.png")}
          />
          <SettingRow
            title="Privacy & Security"
            subtitle="Control your data"
            icon={require("../../assets/profilePrivacy.png")}
          />
          <SettingRow
            title="Help & Support"
            subtitle="Get assistance"
            icon={require("../../assets/profileHelp.png")}
          />
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutButton} onPress={() => router.push("/login")}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        {/* Version */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      {/* Bottom navigation */}
      <BottomNavigation />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  // Header
  header: { padding: 20 },
  profileTitle: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
  profileSubtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },

  // User card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 16,
    marginTop: 10,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  userInfo: { marginLeft: 16 },
  userName: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  userEmail: { fontSize: 12, color: "#64748b", marginTop: 2 },
  userSince: { fontSize: 12, color: "#64748b", marginTop: 2 },

  // Settings
  settingsContainer: { marginTop: 20 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 15,
    marginVertical: 6,
    elevation: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(14, 165, 233, 0.3)", // light blue circle
    justifyContent: "center",
    alignItems: "center",
  },
  settingIcon: { width: 24, height: 24 },
  settingText: { flex: 1, marginLeft: 12 },
  settingTitle: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  settingSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },

  // Logout
  logoutButton: {
    marginTop: 30,
    alignSelf: "center",
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 20,
  },
  logoutText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  // Version
  versionText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 12,
    marginVertical: 20,
  },
});

export default Profile;