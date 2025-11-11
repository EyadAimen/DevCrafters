import React, { useState } from 'react';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/BottomNavigation";

export default function Reminders() {
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch medicines when modal opens
  useEffect(() => {
    if (showAddReminder) {
      fetchMedicines();
    }
  }, [showAddReminder]);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medicine')
        .select('medicine_name')
        .order('medicine_name');

      if (error) {
        console.error('Error fetching medicines:', error);
      } else {
        setMedicines(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ---------- Gradient Background ---------- */}
        <LinearGradient
          style={styles.gradientBg}
          locations={[0, 0.5, 1]}
          colors={[
            "#f8fafc",
            "rgba(239, 246, 255, 0.3)",
            "rgba(236, 254, 255, 0.2)",
          ]}
        >
          {/* ---------- Scrollable Content ---------- */}
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* ---------- Medication Reminders---------- */}
            <LinearGradient
              locations={[0, 0]}
              colors={["rgba(14, 165, 233, 0.05)", "rgba(0, 0, 0, 0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View>
                <Text style={styles.title}>Medication Reminders</Text>
                <Text style={{color:"#64748B"}}>Never miss a dose with timely notifications</Text>
                <Text> </Text>
              </View>
            </LinearGradient>

            {/* ---------- Active Meds & Next Dose ---------- */}
            <View style={styles.rowBetween}>
              <Pressable style={[styles.smallCard]} onPress={() => {}}>
                <Image
                  source={require("../../assets/bell.png")}
                  style={styles.smallIcon}
                />
                 <View>
                   <Text style={styles.smallText}> Active Meds</Text>
                   <Text style={{fontSize: 12,marginTop:15}}>5</Text>
                 </View>
              </Pressable>

              <Pressable style={[styles.smallCard]} onPress={() => {}}>
                <Image
                  source={require("../../assets/clock.png")}
                  style={styles.smallIcon}
                />
                <View>
                  <Text style={styles.smallText}> Next Dose</Text>
                  <Text style={{fontSize: 12,marginTop:15}}>8:00 PM Today</Text>
                </View>
              </Pressable>
            </View>

            {/* ---------- Notification Controls ---------- */}
            <View style={styles.section}>
              <View style={styles.settingsCard}>
                {/* Push Notifications */}
                <View style={styles.settingItem}>
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Push Notifications</Text>
                    <Text style={styles.settingSubtitle}>Receive alerts on your device</Text>
                  </View>
                  {/* Add your toggle component here */}
                  <View style={styles.toggle}>
                    {/* Toggle switch would go here */}
                  </View>
                </View>

                {/* Sound Alerts */}
                <View style={styles.settingItem}>
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Sound Alerts</Text>
                    <Text style={styles.settingSubtitle}>Play sound with notifications</Text>
                  </View>
                  <View style={styles.toggle}>
                    {/* Toggle switch would go here */}
                  </View>
                </View>

                {/* Snooze Option */}
                <View style={styles.settingItem}>
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Snooze Option</Text>
                    <Text style={styles.settingSubtitle}>Allow 15-minute snooze</Text>
                  </View>
                  <View style={styles.toggle}>
                    {/* Toggle switch would go here */}
                  </View>
                </View>
              </View>
            </View>

            {/* ---------- Meds  ---------- */}
            <View style={styles.meds}>
              <View style={styles.remindersHeader}>
                <Text style={styles.titlemeds}>Your Reminders</Text>
                <Pressable style={styles.addButton} onPress={() => setShowAddReminder(true)}>
                  <Text style={styles.addButtonText}>+ Add New</Text>
                </Pressable>
              </View>

              {/* Mock Reminders*/}
              <View style={styles.reminderCard}>
                <View style={styles.reminderHeader}>
                  <Text style={styles.medName}>Lisinopril 10mg</Text>
                  <View style={styles.toggle}>
                    {/* Toggle switch would go here */}
                  </View>
                </View>
                <View style={styles.frequencyContainer}>
                  <Text style={styles.frequencyText}>Daily</Text>
                </View>
                <Text style={styles.nextDose}>Next: Tomorrow at 8:00 AM</Text>
                <View style={styles.reminderActions}>
                  <Pressable style={styles.actionButton}>
                    <Image
                      source={require("../../assets/edit.png")}
                      style={styles.smallIcon}
                    />
                    <Text style={styles.actionText}> Edit</Text>
                  </Pressable>
                  <Pressable style={styles.actionButton}>
                    <Image
                      source={require("../../assets/deleteIcon.png")}
                      style={styles.smallIcon}
                    />
                    <Text style={styles.actionText}> Delete</Text>
                  </Pressable>
                </View>
              </View>

              {/* mock cards*/}
              <View style={styles.reminderCard}>
                <View style={styles.reminderHeader}>
                  <Text style={styles.medName}>Metformin 500mg</Text>
                  <View style={styles.toggle}>
                    {/* Toggle switch would go here */}
                  </View>
                </View>
                <View style={styles.frequencyContainer}>
                  <Text style={styles.frequencyText}>Twice Daily</Text>
                </View>
                <Text style={styles.nextDose}>Next: Today at 7:00 PM</Text>
                <View style={styles.reminderActions}>
                  <Pressable style={styles.actionButton}>
                    <Image
                      source={require("../../assets/edit.png")}
                      style={styles.smallIcon}
                    />
                    <Text style={styles.actionText}> Edit</Text>
                  </Pressable>
                  <Pressable style={styles.actionButton}>
                    <Image
                      source={require("../../assets/deleteIcon.png")}
                      style={styles.smallIcon}
                    />
                    <Text style={styles.actionText}> Delete</Text>
                  </Pressable>
                </View>
              </View>
            </View>

          </ScrollView>
        </LinearGradient>

        {/* ---------- Fixed Bottom Navigation ---------- */}
        <View style={styles.bottomNavWrapper}>
          <BottomNavigation />
        </View>

        {/* ---------- Add Reminder ---------- */}
        <Modal
          visible={showAddReminder}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddReminder(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Reminder</Text>
                <Pressable onPress={() => setShowAddReminder(false)}>
                  <Text style={styles.closeButton}>×</Text>
                </Pressable>
              </View>

              {/* Medication Selection */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>Medication</Text>
                <Pressable style={styles.dropdown}>
                  <Text style={styles.dropdownText}>Select medication</Text>
                  <Text>⌄</Text>
                </Pressable>
              </View>

              {/* Time Selection */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>Time</Text>
                <Pressable style={styles.timeInput}>
                  <Text>8:00 PM</Text>
                </Pressable>
              </View>

              {/* Frequency Selection */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionLabel}>Frequency</Text>
                <Pressable style={styles.dropdown}>
                  <Text style={styles.dropdownText}>Select frequency</Text>
                  <Text>⌄</Text>
                </Pressable>
              </View>

              {/* Create Button */}
              <Pressable style={styles.createButton}>
                <Text style={styles.createButtonText}>Create Reminder</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
    position: "relative",
  },
  gradientBg: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100, // leave room for bottom nav
  },
  card: {
    overflow: "hidden",
    marginBottom: 12,
  },

  title: { fontSize: 20, color: "#0F172A", textAlign: "left",marginBottom:2},

  cardPressable: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  cardIcon: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#475569",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  smallCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 4,
  },
  smallText:{
    fontSize: 14,
    color: "#64748b"
  },
  smallCardContent: {
    alignItems: "center",
  },
  smallIcon: {
    gap: 2,
    width: 14,
    height: 14,
    marginLeft: 8,
    marginTop: 1,
  },
  smallLabel: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  smallValue: {
    fontSize: 18,
    color: "#0284c7",
    fontWeight: "700",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  settingsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
  },

  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    marginBottom: 4,
    color: "#0F172A",
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  toggle: {
    width: 40,
    height: 20,
    backgroundColor: "#e2e8f0",
    borderRadius: 15,
  },

  titlemeds: { fontSize: 14, color: "#0F172A", textAlign: "left",marginBottom:8},

  meds: {
    marginBottom: 20,
  },
  remindersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titlemeds: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
  },
  medTime: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0ea5e9',
  },
  frequencyContainer: {
    borderRadius: 6,
    backgroundColor: "#E0F2FE",
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  frequencyText: {
    fontSize: 14,
    color: "#0c4a6e",
  },
  nextDose: {
    fontSize: 14,
    color: '#0EA5E9',
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#64748b',
    paddingHorizontal: 8,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  dropdownText: {
    color: '#64748b',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  createButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    paddingVertical: 6,
  },
  actionText: {
    flexDirection: "row",
    fontSize: 14,
    color: '#64748b',
  },

  bottomNavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
  },
});
