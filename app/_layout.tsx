// app/_layout.js
import { StripeProvider } from "@stripe/stripe-react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Alert } from "react-native";
import FloatingChatbot from "./(tabs)/FloatingChatbot";
import { Biometrics } from "../lib/biometrics";
import { supabase } from "../lib/supabase";
import TourOverlay from "../components/TourOverlay";
import * as Linking from "expo-linking";
import { TourProvider } from "../context/TourContext";

export default function RootLayout() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        console.log("🔒 [Layout] RootLayout Mounted. initializing...");
        // Handle Deep Links (Password Reset)
        const handleDeepLink = async (event) => {
            const url = event.url;
            if (!url) return;

            // Check if it matches our reset path
            if (url.includes("create-new-password")) {
                try {
                    // Extract hash parameters (Supabase sends them in the hash)
                    const hashIndex = url.indexOf("#");
                    if (hashIndex !== -1) {
                        const hash = url.substring(hashIndex + 1);
                        const params = new URLSearchParams(hash);
                        const accessToken = params.get("access_token");
                        const refreshToken = params.get("refresh_token");
                        const errorDescription = params.get("error_description");

                        if (errorDescription) {
                            Alert.alert("Link Expired/Invalid", errorDescription.replace(/\+/g, " "));
                            return;
                        }

                        if (accessToken && refreshToken) {
                            await supabase.auth.signOut(); // Clear old session first
                            const { error } = await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken,
                            });

                            if (error) {
                                Alert.alert("Session Error", error.message);
                            } else {
                                // Navigate effectively (Route groups like (tabs) are omitted in URL)
                                router.replace("/(tabs)/create-new-password");
                            }
                        }
                    }
                } catch (e) {
                    // Fail silently
                }
            }
        };

        // Listen for new links
        const linkingSubscription = Linking.addEventListener("url", handleDeepLink);

        // Check initial link (if app was closed)
        // Check initial link (if app was closed)
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink({ url });
            }
        }).catch(err => console.error("Linking Error:", err));

        // Always check biometrics on mount (gatekeeper)
        checkBiometricLogin();

        // Only run the biometric check on the login screen.
        // if (pathname === '/login') {
        //    checkBiometricLogin();
        // }

        const subscription = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const data = response.notification.request.content.data;
                router.push({
                    pathname: "/intake/confirm",
                    params: {
                        reminderId: data.reminderId,
                        medicineName: data.medicineName,
                        scheduledTime: data.scheduledTime,
                    },
                });
            }
        );

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session) {
                    const isEnabled = await Biometrics.isEnabled();
                    if (isEnabled) {
                        await Biometrics.saveSession(session.refresh_token);
                    }
                }
            }
        });

        return () => {
            linkingSubscription.remove();
            subscription.remove();
            authListener.subscription.unsubscribe();
        };

    }, []);

    const checkBiometricLogin = async () => {
        console.log("🔒 [Layout] Starting checkBiometricLogin...");
        const hasSession = await Biometrics.hasSavedSession();
        const isEnabled = await Biometrics.isEnabled();
        console.log(`🔒 [Layout] hasSession: ${hasSession}, isEnabled: ${isEnabled}`);

        if (hasSession && isEnabled) {
            console.log("🔒 [Layout] Prompting for biometrics...");
            const authenticated = await Biometrics.authenticate();
            console.log(`🔒 [Layout] Authenticated: ${authenticated}`);

            if (authenticated) {
                // Check if Supabase already has the session loaded (from AsyncStorage)
                const { data: { session } } = await supabase.auth.getSession();
                console.log(`🔒 [Layout] Current Supabase Session:`, session ? "EXISTS" : "NULL");

                if (session) {
                    // Start manually to avoid race conditions or ensure freshness? 
                    // No, if it exists, it should be valid for now.
                    console.log("🔒 [Layout] Session restored by persistence. Redirecting to Home.");
                    router.replace("/home");
                    return;
                }

                // Fallback: Try to restore using our saved refresh token
                console.log("🔒 [Layout] No Supabase session. Attempting manual restore from SecureStore...");
                const refreshToken = await Biometrics.getSession();
                console.log(`🔒 [Layout] Helper refreshToken found: ${!!refreshToken}`);

                if (refreshToken) {
                    const { data, error } = await supabase.auth.refreshSession({
                        refresh_token: refreshToken,
                    });

                    if (!error && data.session) {
                        console.log("🔒 [Layout] Manual refresh SUCCESS. Redirecting to Home.");
                        router.replace("/home");
                    } else {
                        console.error("🔒 [Layout] Manual refresh FAILED:", error);
                        router.replace("/login");
                    }
                } else {
                    console.log("🔒 [Layout] No refresh token in SecureStore despite hasSession=true.");
                    router.replace("/login");
                }
            } else {
                console.log("🔒 [Layout] Biometric failed/cancelled.");
                // User cancelled or failed
                await supabase.auth.signOut();
                router.replace("/login");
            }
        } else {
            console.log("🔒 [Layout] Biometrics NOT enabled or NO saved biometric session.");

            // Check if we have a lingering Supabase session (due to persistSession: true)
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                console.log("🔒 [Layout] Found lingering session but biometrics disabled/missing. Forcing logout for security.");
                await supabase.auth.signOut();
                router.replace("/login");
            } else {
                console.log("🔒 [Layout] Clean state. No session found.");
            }
        }
    };

    return (
        <StripeProvider publishableKey="pk_test_51SZjX3BeY3ZAHzFTA7Ow7C1P4RN1pYcw4pJdlx0WhcKUHYkkHeiBhnlX4YBRDHBvwufenHtaULHB9sxVeZqNYMgZ00nQo5Sfve">
            <TourProvider>
                <Slot />
                <FloatingChatbot />
                <TourOverlay />
            </TourProvider>
        </StripeProvider>
    );
}