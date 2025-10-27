import React from "react";
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";

const BottomNavigation = () => {
  const router = useRouter();
  const { width } = useWindowDimensions(); // 👈 Automatically get screen width

  return (
    <View style={[styles.bottomnavigation, { width }]}>
      <View style={styles.container}>
        {/* Home */}
        <Pressable style={styles.button} onPress={() => router.push("/home")}>
          <Image source={require("../assets/homeIcon.png")} style={styles.icon} resizeMode="contain" />
          <Text style={[styles.label, { color: "#0ea5e9" }]}>Home</Text>
        </Pressable>

        {/* Meds */}
        <Pressable style={styles.button} onPress={() => router.push("/meds")}>
          <Image source={require("../assets/pillIcon.png")} style={styles.icon} resizeMode="contain" />
          <Text style={styles.label}>Meds</Text>
        </Pressable>

        {/* Scan */}
        <Pressable style={styles.button} onPress={() => router.push("/scan")}>
          <Image source={require("../assets/scanIcon.png")} style={styles.icon} resizeMode="contain" />
          <Text style={styles.label}>Scan</Text>
        </Pressable>

        {/* Analytics */}
        <Pressable style={styles.button} onPress={() => router.push("/analytics")}>
          <Image source={require("../assets/chartIcon.png")} style={styles.icon} resizeMode="contain" />
          <Text style={styles.label}>Analytics</Text>
        </Pressable>

        {/* Profile */}
        <Pressable style={styles.button} onPress={() => router.push("/profile")}>
          <Image source={require("../assets/profileIcon.png")} style={styles.icon} resizeMode="contain" />
          <Text style={styles.label}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomnavigation: {
    position: "absolute",
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderTopWidth: 0.8,
    borderColor: "#e2e8f0",
    elevation: 15,
    zIndex: 100,
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 70, // flexible enough for all devices
    paddingHorizontal: 10,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1, // each button takes equal width
    paddingVertical: 6,
  },
  icon: {
    width: 23,
    height: 23,
    marginBottom: 3,
  },
  label: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "Arial",
  },
});

export default BottomNavigation;
