import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Text,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

export default function CreateNewPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    verifyRecoverySession();
  }, []);

  const verifyRecoverySession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      Alert.alert(
        "Error",
        "Unable to verify your reset request. Please request a new reset link.",
        [{ text: "OK", onPress: () => router.push("/send-reset-link") }]
      );
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in both password fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        if (error.message.includes('token') || error.message.includes('session')) {
          Alert.alert(
            "Session Expired",
            "Your reset link has expired. Please request a new password reset link.",
            [{ text: "OK", onPress: () => router.push("/send-reset-link") }]
          );
        } else {
          Alert.alert("Error", error.message);
        }
      } else {
        Alert.alert(
          "Success!",
          "Your password has been updated successfully.",
          [{ text: "OK", onPress: () => router.replace("/login") }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.createNewPassword, styles.viewFlexBox]}>
      <View style={[styles.view, styles.viewSpaceBlock]}>
        <View style={styles.container}>

          {/* Header - No back icon */}
          <View style={[styles.createNewPasswordContainer]}>
            <View style={styles.container2}>
              <View style={[styles.heading1, styles.listItemPosition]}>
                <Text style={[styles.createNewPassword2, styles.passwordTypo2]}>
                  Create New Password
                </Text>
              </View>
              <View style={[styles.paragraph, styles.listItemPosition]}>
                <Text style={[styles.chooseAStrong, styles.passwordClr]}>
                  Choose a strong password to secure your account
                </Text>
              </View>
            </View>
          </View>

          {/* Form Card */}
          <View style={[styles.card, styles.cardBorder]}>
            <View style={styles.resetpasswordscreen}>

              {/* New Password Input */}
              <View style={[styles.container3, styles.containerLayout]}>
                <View style={[styles.primitivelabel, styles.inputFlexBox]}>
                  <Text style={[styles.newPassword, styles.passwordTypo1]}>
                    New Password
                  </Text>
                </View>
                <View style={styles.container4}>
                  <View style={[styles.input, styles.cardBorder]}>
                    {/* Password Lock Icon on Left */}
                    <Image
                      source={require("../assets/passwordIcon.png")}
                      style={styles.passwordLockIcon}
                    />
                    <TextInput
                      placeholder="Enter new password"
                      style={[styles.enterNewPassword, styles.passwordTypo]}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      placeholderTextColor="#64748b"
                    />
                    {/* Eye Icon on Right */}
                    <Pressable
                      style={styles.eyeIconButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Image
                        source={
                          showPassword
                            ? require("../assets/eye-open.png")
                            : require("../assets/eye-closed.png")
                        }
                        style={styles.eyeIcon}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={[styles.container5, styles.containerLayout]}>
                <View style={[styles.primitivelabel, styles.inputFlexBox]}>
                  <Text style={[styles.newPassword, styles.passwordTypo1]}>
                    Confirm Password
                  </Text>
                </View>
                <View style={styles.container4}>
                  <View style={[styles.input, styles.cardBorder]}>
                    {/* Password Lock Icon on Left */}
                    <Image
                      source={require("../assets/passwordIcon.png")}
                      style={styles.passwordLockIcon}
                    />
                    <TextInput
                      placeholder="Confirm new password"
                      style={[styles.enterNewPassword, styles.passwordTypo]}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                      placeholderTextColor="#64748b"
                    />
                    {/* Eye Icon on Right */}
                    <Pressable
                      style={styles.eyeIconButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Image
                        source={
                          showConfirmPassword
                            ? require("../assets/eye-open.png")
                            : require("../assets/eye-closed.png")
                        }
                        style={styles.eyeIcon}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Reset Button */}
              <Pressable
                style={[styles.button, styles.listItemPosition]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                <Text style={[styles.resetPassword, styles.passwordTypo]}>
                  {loading ? "Updating..." : "Reset Password"}
                </Text>
              </Pressable>

            </View>
          </View>

          {/* Footer */}
          <View style={styles.createNewPasswordParagraph}>
            <Text style={[styles.rememberYourPassword, styles.passwordClr]}>
              Remember your password?
            </Text>
            <Pressable
              style={styles.createNewPasswordButton}
              onPress={() => router.push("/login")}
            >
              <Text style={[styles.signIn, styles.passwordTypo1]}>
                Sign in
              </Text>
            </Pressable>
          </View>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  createNewPassword: {
    backgroundColor: "#f8fafc"
  },
  viewFlexBox: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },

  inputFlexBox: {
    alignItems: "center",
    flexDirection: "row"
  },
  listItemPosition: {
    left: 0,
    position: "absolute"
  },
  passwordTypo2: {
    fontFamily: "Inter-Regular",
    color: "#0f172a"
  },
  passwordClr: {
    color: "#64748b",
    fontFamily: "Inter-Regular"
  },
  cardBorder: {
    borderWidth: 0.9,
    borderStyle: "solid"
  },
  containerLayout: {
    gap: 6,
    height: 58,
    width: 346,
    left: 0,
    position: "absolute"
  },
  passwordTypo1: {
    fontFamily: "Inter-Medium",
    fontWeight: "500"
  },
  passwordTypo: {
    letterSpacing: -0.15,
    fontSize: 14,
    textAlign: "left"
  },
  view: {
    width: "100%",
    height: 918,
    backgroundColor: "#f8fafc",
    flex: 1
  },
  container: {
    width: "100%",
    height: 555,
    paddingTop: 23,
    gap: 30,
  },
  createNewPasswordContainer: {
    height: 44,
    justifyContent: "center",
    left:25
  },
  container2: {
    width: 283,
    height: 44
  },
  heading1: {
    height: 28,
    top: 0,
    width: 283,

  },
  createNewPassword2: {
    fontSize: 20,
    letterSpacing: -0.45,
    lineHeight: 28,
    textAlign: "left",
    color: "#0f172a",
    left: 0,
    position: "absolute",
    top: 0
  },
  paragraph: {
    top: 28,
    height: 16,
    width: 283
  },
  chooseAStrong: {
    lineHeight: 18,
    fontSize: 12,
    top: 1,
    textAlign: "left",
    position: "absolute",

  },
  card: {
      height: 250,
      backgroundColor: "#fff",
      borderColor: "#e2e8f0",
      borderRadius: 20,
      borderWidth: 0.9,
      borderStyle: "solid",
      paddingTop: 25,
      paddingLeft: 15,
      paddingRight: 15,
      alignSelf: "center",
      width: "100%",
      maxWidth: 360,
    },
  resetpasswordscreen: {
    height: 358,
    width: 346
  },
  container3: {
    top: 0
  },
  primitivelabel: {
    height: 16,
    alignSelf: "stretch"
  },
  newPassword: {
    lineHeight: 16,
    fontSize: 12,
    textAlign: "left",
    color: "#0f172a"
  },
  container4: {
    height: 36,
    alignSelf: "stretch"
  },
  input: {
    borderColor: "rgba(0, 0, 0, 0)",
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 4,
    height: 36,
    width: 330,
    left: 0,
    position: "absolute",
    top: 0,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "#f8fafc"
  },
  enterNewPassword: {
    color: "#64748b",
    fontFamily: "Inter-Regular",
    flex: 1,
    marginLeft: 12,
    marginRight: 12
  },
  passwordLockIcon: {
    width: 16,
    height: 16,
    tintColor: "#64748b"
  },
  eyeIconButton: {
    padding: 4
  },
  eyeIcon: {
    width: 16,
    height: 16,
    tintColor: "#64748b"
  },
  container5: {
    top: 74
  },
  button: {
    top: 148,
    boxShadow: "0px 4px 14px rgba(14, 165, 233, 0.25)",
    elevation: 14,
    backgroundColor: "#0ea5e9",
    width: 330,
    borderRadius: 14,
    height: 44
  },
  resetPassword: {
    top: 12,
    left: 121,
    lineHeight: 20,
    color: "#fff",
    fontFamily: "Inter-Medium",
    fontWeight: "500",
    position: "absolute"
  },
  createNewPasswordParagraph: {
    height: 24,
    alignSelf: "stretch"
  },
  rememberYourPassword: {
    top: 6,
    left: 87,
    textAlign: "center",
    width: 157,
    lineHeight: 16,
    fontSize: 12,
    position: "absolute"
  },
  createNewPasswordButton: {
    top: 2,
    left: 251,
    width: 50,
    height: 24,
    position: "absolute"
  },
  signIn: {
    top: -1,
    fontSize: 16,
    letterSpacing: -0.31,
    lineHeight: 24,
    color: "#0ea5e9",
    textAlign: "left",
    left: 0,
    position: "absolute"
  }
});