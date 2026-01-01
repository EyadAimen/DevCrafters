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

export default function RootLayout() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
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
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        // Only run the biometric check on the login screen.
        if (pathname === '/login') {
            checkBiometricLogin();
        }

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
    }, [pathname]);

    const checkBiometricLogin = async () => {
        const hasSession = await Biometrics.hasSavedSession();
        const isEnabled = await Biometrics.isEnabled();

        if (hasSession && isEnabled) {
            const authenticated = await Biometrics.authenticate();
            if (authenticated) {
                const refreshToken = await Biometrics.getSession();
                if (refreshToken) {
                    // Use refreshSession instead of setSession to explicitly rotate the token
                    const { data, error } = await supabase.auth.refreshSession({
                        refresh_token: refreshToken,
                    });

                    if (!error && data.session) {
                        router.replace("/home");
                    } else {
                        console.log("Biometric session refresh failed:", error);
                        router.replace("/login");
                    }
                }
            } else {
                // User cancelled or failed biometrics -> Go to login
                router.replace("/login");
            }
        }
    };

    return (
        <StripeProvider publishableKey="pk_test_51SZjX3BeY3ZAHzFTA7Ow7C1P4RN1pYcw4pJdlx0WhcKUHYkkHeiBhnlX4YBRDHBvwufenHtaULHB9sxVeZqNYMgZ00nQo5Sfve">
            <Slot />
            <FloatingChatbot />
            <TourOverlay />
        </StripeProvider>
    );
}