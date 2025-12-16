import React from "react";
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter, usePathname } from "expo-router";

const BottomNavigation = () => {
  const router = useRouter();
  const pathname = usePathname(); // 👈 Get current route path
  const { width } = useWindowDimensions();

  // Function to check if a route is active
  const isActive = (route) => {
    return pathname === route;
  };

  return (
    <View style={[styles.bottomnavigation, { width }]}>
      <View style={styles.container}>
        {/* Home */}
        <Pressable 
          style={[styles.button, isActive("/home") && styles.activeButton]} 
          onPress={() => router.push("/home")}
        >
          <Image 
            source={require("../assets/homeIcon.png")} 
            style={[styles.icon, isActive("/home") && styles.activeIcon]} 
            resizeMode="contain" 
          />
          <Text style={[styles.label, isActive("/home") ? styles.activeLabel : styles.inactiveLabel]}>
            Home
          </Text>
        </Pressable>

        {/* Meds */}
        <Pressable 
          style={[styles.button, isActive("/meds") && styles.activeButton]} 
          onPress={() => router.push("/meds")}
        >
          <Image 
            source={require("../assets/pillIcon.png")} 
            style={[styles.icon, isActive("/meds") && styles.activeIcon]} 
            resizeMode="contain" 
          />
          <Text style={[styles.label, isActive("/meds") ? styles.activeLabel : styles.inactiveLabel]}>
            Meds
          </Text>
        </Pressable>

        {/* Scan */}
        <Pressable 
          style={[styles.button, isActive("/scan") && styles.activeButton]} 
          onPress={() => router.push("/scan")}
        >
          <Image 
            source={require("../assets/scanIcon.png")} 
            style={[styles.icon, isActive("/scan") && styles.activeIcon]} 
            resizeMode="contain" 
          />
          <Text style={[styles.label, isActive("/scan") ? styles.activeLabel : styles.inactiveLabel]}>
            Scan
          </Text>
        </Pressable>

        {/* Analytics */}
        <Pressable 
          style={[styles.button, isActive("/analytics") && styles.activeButton]} 
          onPress={() => router.push("/analytics")}
        >
          <Image 
            source={require("../assets/chartIcon.png")} 
            style={[styles.icon, isActive("/analytics") && styles.activeIcon]} 
            resizeMode="contain" 
          />
          <Text style={[styles.label, isActive("/analytics") ? styles.activeLabel : styles.inactiveLabel]}>
            Analytics
          </Text>
        </Pressable>

        {/* Profile */}
        <Pressable 
          style={[styles.button, isActive("/profile") && styles.activeButton]} 
          onPress={() => router.push("/profile")}
        >
          <Image 
            source={require("../assets/profileIcon.png")} 
            style={[styles.icon, isActive("/profile") && styles.activeIcon]} 
            resizeMode="contain" 
          />
          <Text style={[styles.label, isActive("/profile") ? styles.activeLabel : styles.inactiveLabel]}>
            Profile
          </Text>
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
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 0.8,
    borderColor: "#e2e8f0",
    elevation: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 70,
    paddingHorizontal: 10,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: "#f0f9ff",
  },
  icon: {
    width: 23,
    height: 23,
    marginBottom: 3,
    tintColor: "#64748b", // Default icon color
  },
  activeIcon: {
    tintColor: "#0ea5e9", // Active icon color
  },
  label: {
    fontSize: 10,
    fontFamily: "Arial",
  },
  activeLabel: {
    color: "#0ea5e9",
    fontWeight: "600",
  },
  inactiveLabel: {
    color: "#64748b",
  },
});

export default BottomNavigation;