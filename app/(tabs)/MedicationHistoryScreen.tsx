import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

type MedicationRecord = {
  id: string;
  medicine_name: string;
  intake_time: string;
  intake_date: Date; // keep actual date
  dateHeader?: string;
};

export default function MedicationHistoryScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"history" | "reports">("history");
  const [searchQuery, setSearchQuery] = useState("");

  // --- Date range filter ---
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [history, setHistory] = useState<MedicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedicationHistory();
  }, []);

  const fetchMedicationHistory = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from("intake")
        .select("*")
        .eq("user_id", user.id)
        .order("intake_time", { ascending: false });

      if (error) {
        console.error("Error fetching intake:", error);
        setHistory([]);
        return;
      }

      if (!data || data.length === 0) {
        setHistory([]);
        return;
      }

      const records: MedicationRecord[] = [];
      let currentDate = "";

      data.forEach((record: any) => {
        const intakeDate = new Date(record.intake_time);
        const dateStr = intakeDate.toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        if (dateStr !== currentDate) {
          records.push({
            id: `date-${dateStr}`,
            medicine_name: "",
            intake_time: "",
            intake_date: intakeDate,
            dateHeader: dateStr,
          });
          currentDate = dateStr;
        }

        records.push({
          id: record.id,
          medicine_name: record.medicine_name || "Unknown",
          intake_time: intakeDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          intake_date: intakeDate,
        });
      });

      setHistory(records);
    } catch (err) {
      console.error("Fetch error:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  //        FILTER LOGIC
  // --------------------------
  const filteredHistory = (() => {
    if (!searchQuery && !startDate && !endDate) return history;

    const groupedByDate: { [date: string]: MedicationRecord[] } = {};

    history.forEach((record) => {
      const dateKey = record.intake_date.toDateString();

      if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];

      // Only push real medicine records (skip existing date headers)
      if (!record.dateHeader) groupedByDate[dateKey].push(record);
    });

    const result: MedicationRecord[] = [];

    Object.keys(groupedByDate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // sort descending
      .forEach((dateKey) => {
        const records = groupedByDate[dateKey];

        // Filter by search query
        const filteredRecords = records.filter((rec) =>
          rec.medicine_name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Filter by date range
        const dateObj = new Date(dateKey);
        const inRange =
          (!startDate || dateObj >= startDate) && (!endDate || dateObj <= endDate);

        if (filteredRecords.length > 0 && inRange) {
          // Add date header
          result.push({
            id: `date-${dateKey}`,
            medicine_name: "",
            intake_time: "",
            intake_date: dateObj,
            dateHeader: dateObj.toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          });

          // Add filtered medicine records
          result.push(...filteredRecords);
        }
      });

    return result;
  })();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.push("/profile")}
          >
            <Image
              source={require("../../assets/backArrow.png")}
              style={styles.backIcon}
            />
          </Pressable>
          <Text style={styles.title}>Medical History</Text>
        </View>
        <Text style={styles.subtitle}>Track your medication intake</Text>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === "history" && styles.activeTab]}
            onPress={() => setActiveTab("history")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "history" && styles.activeTabText,
              ]}
            >
              History
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === "reports" && styles.activeTab]}
            onPress={() => setActiveTab("reports")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "reports" && styles.activeTabText,
              ]}
            >
              Reports
            </Text>
          </Pressable>
        </View>

        {/* DATE RANGE FILTER */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Filter by Date Range</Text>

          <View style={styles.dateRow}>
            {/* Start Date */}
            <Pressable
              style={styles.dateFilterButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateFilterText}>
                {startDate ? startDate.toLocaleDateString("en-US") : "Start Date"}
              </Text>
            </Pressable>

            {/* End Date */}
            <Pressable
              style={styles.dateFilterButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateFilterText}>
                {endDate ? endDate.toLocaleDateString("en-US") : "End Date"}
              </Text>
            </Pressable>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display="calendar"
              onChange={(event, date) => {
                setShowStartPicker(false);
                if (date) setStartDate(date);
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="calendar"
              onChange={(event, date) => {
                setShowEndPicker(false);
                if (date) setEndDate(date);
              }}
            />
          )}

          {/* Clear Filter */}
          {(startDate || endDate) && (
            <Pressable
              style={styles.clearButton}
              onPress={() => {
                setStartDate(null);
                setEndDate(null);
              }}
            >
              <Text style={styles.clearButtonText}>Clear Filter</Text>
            </Pressable>
          )}
        </View>

        {/* Search Bar */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by medicine name, dosage, or notes"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* History List */}
        <View style={[styles.card, { marginTop: 16 }]}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : filteredHistory.length === 0 ? (
            <Text style={styles.emptyText}>No intake records found.</Text>
          ) : (
            filteredHistory.map((record) => {
              if (record.dateHeader) {
                return (
                  <View key={record.id} style={styles.dateSection}>
                    <Text style={styles.dateText}>{record.dateHeader}</Text>
                  </View>
                );
              }

              return (
                <View key={record.id} style={styles.medicationCard}>
                  <Text style={styles.medicationName}>
                    {record.medicine_name}
                  </Text>
                  <Text style={styles.medicationTime}>
                    Taken at {record.intake_time}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    marginBottom: 8,
  },
  backButton: { marginRight: 12 },
  backIcon: { width: 24, height: 24 },
  title: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginHorizontal: 16,
    marginTop: 8,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    padding: 6,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#fff",
  },
  tabText: { fontSize: 14, fontWeight: "500", color: "#475569" },
  activeTabText: { color: "#0f172a", fontWeight: "bold" },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
  },

  // Date Filter
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateFilterButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
    alignItems: "center",
  },
  dateFilterText: {
    color: "#0f172a",
    fontSize: 16,
  },
  clearButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  searchInput: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    color: "#1a1a1a",
  },

  dateSection: { marginBottom: 12 },
  dateText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 4,
  },

  medicationCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  medicationName: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  medicationTime: { fontSize: 14, color: "#64748b", marginTop: 4 },

  loadingText: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748b",
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748b",
    fontSize: 16,
  },
});

