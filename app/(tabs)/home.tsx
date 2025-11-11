import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as React from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/BottomNavigation";

export default function Home() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ---------- Gradient Background ---------- */}
        <LinearGradient
          style={styles.gradientBg}
          locations={[0, 0.5, 1]}
          colors={[
            "#f8fafc",
            "rgba(239, 246, 255, 0.3)",
            "rgba(236, 254, 255, 0.2)",
          ]}
        >
          {/* ---------- Scrollable Content ---------- */}
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* ---------- Upcoming Doses Card ---------- */}
            <LinearGradient
              style={styles.card}
              locations={[0, 1]}
              colors={["rgba(14, 165, 233, 0.05)", "rgba(0, 0, 0, 0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Pressable style={styles.cardPressable}>
                <Image
                  source={require("../../assets/notiIconBlue.png")}
                  style={styles.cardIcon}
                />
                <View>
                  <Text style={styles.cardTitle}>Upcoming Doses</Text>
                  <View style={styles.row}>
                    <Text style={styles.cardSubtitle}>
                      2 medications due today
                    </Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>2</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </LinearGradient>

            {/* ---------- Active Meds & Adherence ---------- */}
            <View style={styles.rowBetween}>
              <Pressable style={[styles.smallCard]} onPress={() => {}}>
                <View style={styles.smallCardContent}>
                  <Image
                    source={require("../../assets/pillIconBlue.png")}
                    style={styles.smallIcon}
                  />
                  <Text style={styles.smallLabel}>Active Meds</Text>
                  <Text style={styles.smallValue}>5</Text>
                </View>
              </Pressable>

              <Pressable style={[styles.smallCard]} onPress={() => {}}>
                <View style={styles.smallCardContent}>
                  <Image
                    source={require("../../assets/arrowIconBlue.png")}
                    style={styles.smallIcon}
                  />
                  <Text style={styles.smallLabel}>Adherence</Text>
                  <Text style={styles.smallValue}>94%</Text>
                </View>
              </Pressable>
            </View>

            {/* ---------- Quick Actions ---------- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickGrid}>
                <Pressable style={styles.quickCard}>
                  <Image
                    source={require("../../assets/scanIconBlue.png")}
                    style={styles.quickIcon}
                  />
                  <Text style={styles.quickTitle}>Scan Medicine</Text>
                  <Text style={styles.quickSubtitle}>
                    Identify pills instantly
                  </Text>
                </Pressable>

                <Pressable style={styles.quickCard} onPress={() => router.push("/reminders")}>
                  <Image
                    source={require("../../assets/notiIconPurple.png")}
                    style={styles.quickIcon}
                  />
                  <Text style={styles.quickTitle}>Reminders</Text>
                  <Text style={styles.quickSubtitle}>
                    Manage notifications
                  </Text>
                </Pressable>

                <Pressable style={styles.quickCard}>
                  <Image
                    source={require("../../assets/locationIconGreen.png")}
                    style={styles.quickIcon}
                  />
                  <Text style={styles.quickTitle}>Find Pharmacies</Text>
                  <Text style={styles.quickSubtitle}>Locate nearby stores</Text>
                </Pressable>

                <Pressable style={styles.quickCard}>
                  <Image
                    source={require("../../assets/chartIconOrange.png")}
                    style={styles.quickIcon}
                  />
                  <Text style={styles.quickTitle}>Analytics</Text>
                  <Text style={styles.quickSubtitle}>View your insights</Text>
                </Pressable>
              </View>
            </View>

            {/* ---------- Low Stock Alert ---------- */}
            <LinearGradient
              style={styles.alertCard}
              locations={[0, 1]}
              colors={["#fff7ed", "#fefce8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.alertContent}>
                <Image
                  source={require("../../assets/clockIconOrange.png")}
                  style={styles.cardIcon}
                />
                <View style={styles.alertTextContainer}>
                  <Text style={styles.alertTitle}>Low Stock Alert</Text>
                  <Text style={styles.alertSubtitle}>
                    Aspirin (81mg) has only 3 pills remaining
                  </Text>
                  <LinearGradient
                    style={styles.refillButton}
                    colors={["#f59e0b", "#d97706"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Pressable onPress={() => {}}>
                      <Text style={styles.refillText}>Request Refill</Text>
                    </Pressable>
                  </LinearGradient>
                </View>
              </View>
            </LinearGradient>
          </ScrollView>
        </LinearGradient>

        {/* ---------- Fixed Bottom Navigation ---------- */}
        <View style={styles.bottomNavWrapper}>
          <BottomNavigation />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
    position: "relative",
  },
  gradientBg: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100, // leave room for bottom nav
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  cardPressable: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  cardIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#475569",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  smallCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  smallCardContent: {
    alignItems: "center",
  },
  smallIcon: {
    width: 36,
    height: 36,
    marginBottom: 8,
  },
  smallLabel: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  smallValue: {
    fontSize: 18,
    color: "#0284c7",
    fontWeight: "700",
    marginTop: 4,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  quickCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickIcon: {
    width: 36,
    height: 36,
    marginBottom: 8,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  quickSubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  alertCard: {
    borderRadius: 16,
    marginTop: 20,
    overflow: "hidden",
  },
  alertContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  alertTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
  },
  alertSubtitle: {
    fontSize: 14,
    color: "#78350f",
    marginVertical: 4,
  },
  refillButton: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  refillText: {
    color: "white",
    fontWeight: "600",
  },
  bottomNavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
  },
});
