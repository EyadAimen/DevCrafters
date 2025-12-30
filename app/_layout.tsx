// app/_layout.js
import { StripeProvider } from "@stripe/stripe-react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import FloatingChatbot from "./(tabs)/FloatingChatbot";
import { Biometrics } from "../lib/biometrics";
import { supabase } from "../lib/supabase";
import TourOverlay from "../components/TourOverlay";

export default function RootLayout() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const isTutorial =
            pathname === "/tutorial" || pathname.startsWith("/step") || pathname === "/welcome" || pathname === "/";

        if (!isTutorial) {
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