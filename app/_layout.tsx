import { StripeProvider } from "@stripe/stripe-react-native";
import { Slot } from "expo-router";

export default function RootLayout() {
  return (
    <StripeProvider publishableKey="pk_test_51SZjX3BeY3ZAHzFTA7Ow7C1P4RN1pYcw4pJdlx0WhcKUHYkkHeiBhnlX4YBRDHBvwufenHtaULHB9sxVeZqNYMgZ00nQo5Sfve">
      <Slot />
    </StripeProvider>
  );
}
