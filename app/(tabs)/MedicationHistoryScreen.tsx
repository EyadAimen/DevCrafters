import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

type MedicationRecord = {
  id: string;
  medicine_name: string;
  intake_time: string;
  intake_date: Date;
  dateHeader?: string;
  isMissed?: boolean;
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
  const [filteredHistory, setFilteredHistory] = useState<MedicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedicationHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [history, searchQuery, startDate, endDate]);

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

      // --- Fetch actual intake ---
      const { data: intakeData, error: intakeError } = await supabase
        .from("intake")
        .select("*")
        .eq("user_id", user.id)
        .order("intake_time", { ascending: false });

      if (intakeError) {
        console.error("Error fetching intake:", intakeError);
        setHistory([]);
        return;
      }

      // --- Fetch missed intake ---
      const { data: missedData, error: missedError } = await supabase
        .from("missed_intake")
        .select("*")
        .eq("user_id", user.id)
        .order("scheduled_time", { ascending: false });

      if (missedError) {
        console.error("Error fetching missed intake:", missedError);
      }

      const records: MedicationRecord[] = [];

      // Map actual intake
      intakeData?.forEach((record: any) => {
        const intakeDate = new Date(record.intake_time);
        records.push({
          id: `intake-${record.id}`,
          medicine_name: record.medicine_name || "Unknown",
          intake_time: intakeDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          intake_date: intakeDate,
          isMissed: false,
        });
      });

      // Map missed intake
      missedData?.forEach((record: any) => {
        const scheduledDate = new Date(record.scheduled_time);

        // Prevent showing missed if user already took the medicine that day
        const takenToday = intakeData?.some((intake: any) => {
          const intakeDay = new Date(intake.intake_time).toDateString();
          return intakeDay === scheduledDate.toDateString() && intake.reminder_id === record.reminder_id;
        });

        if (!takenToday) {
          records.push({
            id: `missed-${record.id}`,
            medicine_name: record.medicine_name || "Unknown (Missed)",
            intake_time: scheduledDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            intake_date: scheduledDate,
            isMissed: true,
          });
        }
      });

      setHistory(records);
    } catch (err) {
      console.error("Fetch error:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (history.length === 0) {
      setFilteredHistory([]);
      return;
    }

    let dateFiltered = [...history];

    if (startDate) {
      const normalizedStart = new Date(startDate);
      normalizedStart.setHours(0, 0, 0, 0);
      dateFiltered = dateFiltered.filter((record) => {
        const recordDate = new Date(record.intake_date);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate >= normalizedStart;
      });
    }

    if (endDate) {
      const normalizedEnd = new Date(endDate);
      normalizedEnd.setHours(23, 59, 59, 999);
      dateFiltered = dateFiltered.filter((record) => {
        const recordDate = new Date(record.intake_date);
        return recordDate <= normalizedEnd;
      });
    }

    let searchFiltered = dateFiltered;
    if (searchQuery.trim()) {
      searchFiltered = dateFiltered.filter((record) =>
        record.medicine_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const grouped: { [date: string]: MedicationRecord[] } = {};

    searchFiltered.forEach((record) => {
      const dateKey = record.intake_date.toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(record);
    });

    const result: MedicationRecord[] = [];

    Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .forEach((dateKey) => {
        const dateObj = new Date(dateKey);
        const dateHeader = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        result.push({
          id: `date-${dateKey}`,
          medicine_name: "",
          intake_time: "",
          intake_date: dateObj,
          dateHeader,
        });

        const dayRecords = grouped[dateKey].sort(
          (a, b) => a.intake_date.getTime() - b.intake_date.getTime()
        );

        result.push(...dayRecords);
      });

    setFilteredHistory(result);
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      selectedDate.setHours(0, 0, 0, 0);
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      selectedDate.setHours(23, 59, 59, 999);
      setEndDate(selectedDate);
    }
  };

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSearchQuery("");
  };

  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return "Select Date";
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getWeekday = (date: Date | null): string => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
    });
  };

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
            onPress={() => router.push("/(tabs)/MedicalReports")}
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

        {/* Date range filter */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Filter by Date Range</Text>
          <View style={styles.dateRow}>
            <Pressable
              style={styles.dateFilterButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateFilterText}>
                {formatDateForDisplay(startDate)}
              </Text>
              <Text style={styles.datePickerHint}>
                {startDate ? getWeekday(startDate) : "Start Date"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.dateFilterButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateFilterText}>
                {formatDateForDisplay(endDate)}
              </Text>
              <Text style={styles.datePickerHint}>
                {endDate ? getWeekday(endDate) : "End Date"}
              </Text>
            </Pressable>
          </View>

          {(startDate || endDate || searchQuery) && (
            <Pressable style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear All Filters</Text>
            </Pressable>
          )}
        </View>

        {/* Search Bar */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by medicine name"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredHistory.filter((r) => !r.dateHeader).length} records found
          </Text>
          <Pressable onPress={fetchMedicationHistory}>
            <Text style={styles.refreshText}>🔄 Refresh</Text>
          </Pressable>
        </View>

        {/* History List */}
        <View style={[styles.card, { marginTop: 8 }]}>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : filteredHistory.length === 0 ? (
            <Text style={styles.emptyText}>
              {searchQuery || startDate || endDate
                ? "No records match your filters"
                : "No intake records found"}
            </Text>
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
                <View
                  key={record.id}
                  style={[
                    styles.medicationCard,
                    record.isMissed && { borderColor: "#ef4444" },
                  ]}
                >
                  <Text style={styles.medicationName}>
                    {record.medicine_name}
                    {record.isMissed ? " (Missed)" : ""}
                  </Text>
                  <Text style={styles.medicationTime}>
                    {record.isMissed ? "Missed at" : "Taken at"} {record.intake_time}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showStartPicker && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>Select Start Date</Text>
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onStartDateChange}
              maximumDate={endDate || new Date()}
              themeVariant="light"
              style={styles.datePicker}
              textColor="#000000"
            />
            <Pressable
              style={styles.datePickerCloseButton}
              onPress={() => setShowStartPicker(false)}
            >
              <Text style={styles.datePickerCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showEndPicker && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>Select End Date</Text>
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onEndDateChange}
              maximumDate={new Date()}
              minimumDate={startDate || undefined}
              themeVariant="light"
              style={styles.datePicker}
              textColor="#000000"
            />
            <Pressable
              style={styles.datePickerCloseButton}
              onPress={() => setShowEndPicker(false)}
            >
              <Text style={styles.datePickerCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 40, marginBottom: 8 },
  backButton: { marginRight: 12 },
  backIcon: { width: 24, height: 24 },
  title: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", marginHorizontal: 16, marginTop: 8 },
  tabContainer: { flexDirection: "row", backgroundColor: "#E2E8F0", padding: 6, borderRadius: 20, marginHorizontal: 20, marginTop: 16 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 16, alignItems: "center" },
  activeTab: { backgroundColor: "#fff" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#475569" },
  activeTabText: { color: "#0f172a", fontWeight: "bold" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#0f172a", marginBottom: 8 },
  dateRow: { flexDirection: "row", justifyContent: "space-between" },
  dateFilterButton: { flex: 1, backgroundColor: "#f1f5f9", padding: 16, borderRadius: 12, marginBottom: 12, marginHorizontal: 4, alignItems: "center", minHeight: 70, justifyContent: "center" },
  dateFilterText: { color: "#0f172a", fontSize: 16, fontWeight: "500" },
  datePickerHint: { fontSize: 12, color: "#0ea5e9", marginTop: 4, fontWeight: "500" },
  clearButton: { backgroundColor: "#ef4444", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignSelf: "flex-start", marginTop: 6 },
  clearButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  searchInput: { backgroundColor: "#f0f0f0", padding: 12, borderRadius: 12, fontSize: 16, color: "#1a1a1a" },
  resultsContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  resultsText: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  refreshText: { fontSize: 12, color: "#0ea5e9", fontWeight: "500" },
  dateSection: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  dateText: { fontSize: 14, fontWeight: "bold", color: "#0ea5e9" },
  medicationCard: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  medicationName: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  medicationTime: { fontSize: 14, color: "#64748b", marginTop: 4 },
  loadingText: { textAlign: "center", marginTop: 40, color: "#64748b", fontSize: 16 },
  emptyText: { textAlign: "center", marginTop: 40, color: "#64748b", fontSize: 16 },
  datePickerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center" },
  datePickerContainer: { backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", width: "90%", maxWidth: 400 },
  datePickerTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a", marginBottom: 20 },
  datePicker: { width: "100%", height: Platform.OS === "ios" ? 200 : undefined },
  datePickerCloseButton: { backgroundColor: "#0ea5e9", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 20, width: "100%", alignItems: "center" },
  datePickerCloseText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
