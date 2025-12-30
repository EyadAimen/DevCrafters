import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function ConfirmIntakePage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { reminderId, medicineName, scheduledTime } = params;

  const [loading, setLoading] = useState(false);

  // ✅ On page load, check if missed intake
  useEffect(() => {
    const checkMissedIntake = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        const scheduledDate = new Date(scheduledTime);
        const now = new Date();
        const oneMinuteAfter = new Date(scheduledDate.getTime() + 60 * 1000);

        // 1️⃣ Skip if intake already exists
        const { data: intakeExisting } = await supabase
          .from("intake")
          .select("*")
          .eq("reminder_id", reminderId)
          .single();

        if (intakeExisting) return;

        // 2️⃣ Skip if missed already exists
        const { data: missedExisting } = await supabase
          .from("missed_intake")
          .select("*")
          .eq("reminder_id", reminderId)
          .single();

        if (missedExisting) return;

        // 3️⃣ If scheduled +1min passed → insert into missed_intake
        if (now >= oneMinuteAfter) {
          const malaysiaTimeISO = new Date(Date.now() + 8 * 60 * 60 * 1000)
            .toISOString()
            .replace("Z", "+08:00");

          const scheduledMalaysiaISO = scheduledDate
            .toISOString()
            .replace("Z", "+08:00");

          const { error: insertError } = await supabase.from("missed_intake").insert({
            user_id: user.id,
            reminder_id: reminderId,
            medicine_name: medicineName,
            scheduled_time: scheduledMalaysiaISO,
            missed_time: malaysiaTimeISO,
          });

          if (insertError) {
            console.error("Error inserting missed intake:", insertError);
          } else {
            console.log("Missed intake logged!");
          }
        }
      } catch (err) {
        console.error("Error checking missed intake:", err);
      }
    };

    checkMissedIntake();
  }, []);

  const handleConfirm = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("Error", "User not logged in.");
        return;
      }

      const malaysiaTimeISO = new Date(Date.now() + 8 * 60 * 60 * 1000)
        .toISOString()
        .replace("Z", "+08:00");

      // 1️⃣ Insert into intake table
      const { error } = await supabase.from("intake").insert({
        user_id: user.id,
        reminder_id: reminderId,
        intake_time: malaysiaTimeISO,
        medicine_name: medicineName,
      });

      if (error) {
        console.error("Supabase insert error:", error);
        Alert.alert("Error", "Failed to save intake record.");
        return;
      }

      // 2️⃣ Remove missed intake if exists
      await supabase.from("missed_intake").delete().eq("reminder_id", reminderId);

      Alert.alert("Success", "Your intake has been recorded!");
      router.replace("/home");
    } catch (err) {
      console.error("Intake error:", err);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Medication Intake</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Medicine:</Text>
        <Text style={styles.value}>{medicineName}</Text>

        <Text style={styles.label}>Scheduled Time:</Text>
        <Text style={styles.value}>{scheduledTime}</Text>

        <Text style={styles.label}>Actual Time:</Text>
        <Text style={styles.value}>{new Date().toLocaleString()}</Text>
      </View>

      <Pressable
        style={styles.button}
        onPress={handleConfirm}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Confirm I Took It</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 24,
    justifyContent: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 30
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24
  },
  label: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 10
  },
  value: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A"
  },
  button: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "white"
  }
});

