import { StripeProvider } from "@stripe/stripe-react-native";
import { Slot, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import FloatingChatbot from "./(tabs)/FloatingChatbot"; // Correct path

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
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

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <StripeProvider publishableKey="pk_test_51SZjX3BeY3ZAHzFTA7Ow7C1P4RN1pYcw4pJdlx0WhcKUHYkkHeiBhnlX4YBRDHBvwufenHtaULHB9sxVeZqNYMgZ00nQo5Sfve">
      <Slot />
      <FloatingChatbot />
    </StripeProvider>
  );
}