import React, { useState, useEffect } from 'react';
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
    ActivityIndicator,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/BottomNavigation";
import { supabase } from "../../lib/supabase";

// Toggle Component
const ToggleSwitch = ({ isOn, onToggle }) => (
  <Pressable
    style={[styles.toggleContainer, isOn && styles.toggleContainerOn]}
    onPress={onToggle}
  >
    <View style={[styles.toggleCircle, isOn && styles.toggleCircleOn]} />
  </Pressable>
);

// Reusable Modal Component
const ReminderModal = ({
  visible,
  onClose,
  mode = 'create',
  initialData,
  medicines,
  loadingMedicines,
  frequencies,
  onSubmit
}) => {
  const [selectedMedicine, setSelectedMedicine] = useState(initialData?.medicines?.medicine_name || '');
  const [selectedMedicineId, setSelectedMedicineId] = useState(initialData?.medicine_id || '');
  const [selectedFrequency, setSelectedFrequency] = useState(initialData?.frequency || '');
  const [selectedTimes, setSelectedTimes] = useState([initialData?.time || new Date()]);
  const [showTimePickers, setShowTimePickers] = useState([false]);
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);

  // Initialize form when modal opens or initialData changes
  useEffect(() => {
    if (initialData && mode === 'edit') {
      const [hours, minutes] = initialData.scheduled_time.split(':');
      const time = new Date();
      time.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      setSelectedTimes([time]);
    }
  }, [initialData, mode]);

  const handleFrequencySelect = (frequency) => {
    setSelectedFrequency(frequency);
    const timeSlots = frequency === 'Twice Daily' ? 2 : frequency === 'Thrice Daily' ? 3 : 1;

    const newTimes = Array.from({ length: timeSlots }, (_, i) => {
      const time = new Date();
      time.setHours(time.getHours() + i);
      return time;
    });

    setSelectedTimes(newTimes);
    setShowTimePickers(new Array(timeSlots).fill(false));
    setShowFrequencyDropdown(false);
  };

  const onTimeChange = (index) => (event, selectedDate) => {
    const newShowTimePickers = [...showTimePickers];
    newShowTimePickers[index] = false;
    setShowTimePickers(newShowTimePickers);

    if (selectedDate) {
      const newTimes = [...selectedTimes];
      newTimes[index] = selectedDate;
      setSelectedTimes(newTimes);
    }
  };

  const toggleTimePicker = (index) => {
    const newShowTimePickers = [...showTimePickers];
    newShowTimePickers[index] = !newShowTimePickers[index];
    setShowTimePickers(newShowTimePickers);
    setShowMedicineDropdown(false);
    setShowFrequencyDropdown(false);
  };

  const formatTime = (date) => date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });

  const resetForm = () => {
    setSelectedMedicine('');
    setSelectedMedicineId('');
    setSelectedFrequency('');
    setSelectedTimes([new Date()]);
    setShowTimePickers([false]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {mode === 'edit' ? 'Edit Reminder' : 'Create Reminder'}
            </Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          {/* Medication Selection */}
          <View style={styles.modalSection}>
            <Text style={styles.sectionLabel}>Medication</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => {
                setShowMedicineDropdown(!showMedicineDropdown);
                setShowFrequencyDropdown(false);
              }}
            >
              <Text style={selectedMedicine ? styles.dropdownTextSelected : styles.dropdownText}>
                {selectedMedicine || (loadingMedicines ? 'Loading medicines...' : 'Select medication')}
              </Text>
              <Text style={styles.dropdownArrow}>⌄</Text>
            </Pressable>

            {showMedicineDropdown && (
              <View style={styles.dropdownList}>
                {loadingMedicines ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0ea5e9" />
                    <Text style={styles.loadingText}>Loading medicines...</Text>
                  </View>
                ) : medicines.length > 0 ? (
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {medicines.map((medicine) => (
                      <Pressable
                        key={medicine.medicine_id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedMedicine(medicine.medicine_name);
                          setSelectedMedicineId(medicine.medicine_id);
                          setShowMedicineDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{medicine.medicine_name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No medicines found</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Frequency Selection */}
          <View style={styles.modalSection}>
            <Text style={styles.sectionLabel}>Frequency</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => {
                setShowFrequencyDropdown(!showFrequencyDropdown);
                setShowMedicineDropdown(false);
              }}
            >
              <Text style={selectedFrequency ? styles.dropdownTextSelected : styles.dropdownText}>
                {selectedFrequency || 'Select frequency'}
              </Text>
              <Text style={styles.dropdownArrow}>⌄</Text>
            </Pressable>

            {showFrequencyDropdown && (
              <View style={styles.dropdownList}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                  {frequencies.map((frequency, index) => (
                    <Pressable
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => handleFrequencySelect(frequency)}
                    >
                      <Text style={styles.dropdownItemText}>{frequency}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Time Selection */}
          <View style={styles.modalSection}>
            <Text style={styles.sectionLabel}>Time{selectedTimes.length > 1 ? 's' : ''}</Text>
            {selectedTimes.map((time, index) => (
              <View key={index} style={styles.timeInputContainer}>
                {selectedTimes.length > 1 && (
                  <Text style={styles.timeLabel}>Time {index + 1}</Text>
                )}
                <Pressable style={styles.timeInput} onPress={() => toggleTimePicker(index)}>
                  <Text style={styles.timeText}>{formatTime(time)}</Text>
                </Pressable>
                {showTimePickers[index] && (
                  <DateTimePicker
                    value={time}
                    mode="time"
                    display="spinner"
                    onChange={onTimeChange(index)}
                  />
                )}
              </View>
            ))}
          </View>

          <Pressable
            style={[styles.createButton, (!selectedMedicine || !selectedFrequency) && styles.createButtonDisabled]}
            onPress={() => onSubmit({ selectedMedicineId, selectedFrequency, selectedTimes })}
            disabled={!selectedMedicine || !selectedFrequency}
          >
            <Text style={styles.createButtonText}>
              {mode === 'edit' ? 'Update Reminder' : 'Create Reminder'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Main Component
export default function Reminders() {
  const router = useRouter();
  const [reminders, setReminders] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [loadingMedicines, setLoadingMedicines] = useState(false);

  // Modal states
  const [modalState, setModalState] = useState({
    visible: false,
    mode: 'create',
    data: null
  });

  // Toggle states
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [snoozeOption, setSnoozeOption] = useState(true);
  const [reminderToggles, setReminderToggles] = useState({});

  const frequencies = ['Once Daily', 'Twice Daily', 'Thrice Daily'];

  // Data fetching
  useEffect(() => { fetchReminders(); }, []);

  const fetchMedicines = async () => {
    setLoadingMedicines(true);
    try {
      const { data, error } = await supabase
        .from('medicines')
        .select('medicine_id, medicine_name')
        .order('medicine_name');
      if (!error) setMedicines(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingMedicines(false);
    }
  };

  const fetchReminders = async () => {
    setLoadingReminders(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('reminders')
        .select('reminder_id, scheduled_time, created_at, frequency, medicine_id, medicines (medicine_name)')
        .eq('user_id', user.id)
        .order('scheduled_time');

      if (!error) setReminders(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingReminders(false);
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    fetchMedicines();
    setModalState({ visible: true, mode: 'create', data: null });
  };

  const openEditModal = (reminder) => {
    fetchMedicines();
    setModalState({ visible: true, mode: 'edit', data: reminder });
  };

  const closeModal = () => setModalState({ visible: false, mode: 'create', data: null });

  // Reminder operations
  const formatTimeForDB = (date) => date.toTimeString().split(' ')[0];

  const handleCreateReminder = async ({ selectedMedicineId, selectedFrequency, selectedTimes }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const remindersToCreate = selectedTimes.map(time => ({
        medicine_id: selectedMedicineId,
        user_id: user.id,
        scheduled_time: formatTimeForDB(time),
        frequency: selectedFrequency
      }));

      const { error } = await supabase.from('reminders').insert(remindersToCreate);
      if (!error) {
        await fetchReminders();
        closeModal();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleUpdateReminder = async ({ selectedMedicineId, selectedFrequency, selectedTimes }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('reminders')
        .update({
          medicine_id: selectedMedicineId,
          scheduled_time: formatTimeForDB(selectedTimes[0]),
          frequency: selectedFrequency
        })
        .eq('reminder_id', modalState.data.reminder_id);

      if (!error) {
        await fetchReminders();
        closeModal();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      const { error } = await supabase.from('reminders').delete().eq('reminder_id', reminderId);
      if (!error) await fetchReminders();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Helper functions
  const formatTime = (date) => date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });

  const getNextDoseText = (scheduledTime) => {
    const now = new Date();
    const [hours, minutes] = scheduledTime.split(':');
    const reminderTime = new Date();
    reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (reminderTime > now) {
      return `Today at ${formatTime(reminderTime)}`;
    } else {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return `Tomorrow at ${formatTime(tomorrow)}`;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <LinearGradient style={styles.gradientBg} locations={[0, 0.5, 1]} colors={["#f8fafc", "rgba(239, 246, 255, 0.3)", "rgba(236, 254, 255, 0.2)"]}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <LinearGradient locations={[0, 0]} colors={["rgba(14, 165, 233, 0.05)", "rgba(0, 0, 0, 0)"]}>
              <View>
                <Text style={styles.title}>Medication Reminders</Text>
                <Text style={{color:"#64748B"}}>Never miss a dose with timely notifications</Text>
                <Text> </Text>
              </View>
            </LinearGradient>

            {/* Stats Cards */}
            <View style={styles.rowBetween}>
              <Pressable style={styles.smallCard}>
                <Image source={require("../../assets/bell.png")} style={styles.smallIcon} />
                <View>
                  <Text style={styles.smallText}>Active Meds</Text>
                  <Text style={{fontSize: 12, marginTop:15}}>{reminders.length}</Text>
                </View>
              </Pressable>

              <Pressable style={styles.smallCard}>
                <Image source={require("../../assets/clock.png")} style={styles.smallIcon} />
                <View>
                  <Text style={styles.smallText}>Next Dose</Text>
                  <Text style={{fontSize: 12, marginTop:15}}>
                    {reminders.length > 0 ? getNextDoseText(reminders[0].scheduled_time) : 'No reminders'}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Settings */}
            <View style={styles.section}>
              <View style={styles.settingsCard}>
                {[
                  { title: 'Push Notifications', subtitle: 'Receive alerts on your device', state: pushNotifications, setter: setPushNotifications },
                  { title: 'Sound Alerts', subtitle: 'Play sound with notifications', state: soundAlerts, setter: setSoundAlerts },
                  { title: 'Snooze Option', subtitle: 'Allow 15-minute snooze', state: snoozeOption, setter: setSnoozeOption }
                ].map((item, index) => (
                  <View key={index} style={styles.settingItem}>
                    <View style={styles.settingText}>
                      <Text style={styles.settingTitle}>{item.title}</Text>
                      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                    </View>
                    <ToggleSwitch isOn={item.state} onToggle={() => item.setter(!item.state)} />
                  </View>
                ))}
              </View>
            </View>

            {/* Reminders List */}
            <View style={styles.meds}>
              <View style={styles.remindersHeader}>
                <Text style={styles.titlemeds}>Your Reminders</Text>
                <Pressable style={styles.addButton} onPress={openCreateModal}>
                  <Text style={styles.addButtonText}>+ Add New</Text>
                </Pressable>
              </View>

              {loadingReminders ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#0ea5e9" />
                  <Text style={styles.loadingText}>Loading reminders...</Text>
                </View>
              ) : reminders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No reminders yet</Text>
                  <Text style={styles.emptyStateSubtext}>Add your first reminder to get started</Text>
                </View>
              ) : (
                reminders.map((reminder) => (
                  <View key={reminder.reminder_id} style={styles.reminderCard}>
                    <View style={styles.reminderHeader}>
                      <Text style={styles.medName}>{reminder.medicines.medicine_name}</Text>
                      <ToggleSwitch
                        isOn={reminderToggles[reminder.reminder_id] !== false}
                        onToggle={() => setReminderToggles(prev => ({
                          ...prev,
                          [reminder.reminder_id]: !prev[reminder.reminder_id]
                        }))}
                      />
                    </View>
                    <Text style={styles.nextDose}>Next: {getNextDoseText(reminder.scheduled_time)}</Text>
                    <View style={styles.reminderActions}>
                      <Pressable style={styles.actionButton} onPress={() => openEditModal(reminder)}>
                        <Image source={require("../../assets/edit.png")} style={styles.smallIcon} />
                        <Text style={styles.actionText}>Edit</Text>
                      </Pressable>
                      <Pressable style={styles.actionButton} onPress={() => handleDeleteReminder(reminder.reminder_id)}>
                        <Image source={require("../../assets/deleteIcon.png")} style={styles.smallIcon} />
                        <Text style={styles.actionText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

          </ScrollView>
        </LinearGradient>

        <View style={styles.bottomNavWrapper}>
          <BottomNavigation />
        </View>

        <ReminderModal
          visible={modalState.visible}
          onClose={closeModal}
          mode={modalState.mode}
          initialData={modalState.data}
          medicines={medicines}
          loadingMedicines={loadingMedicines}
          frequencies={frequencies}
          onSubmit={modalState.mode === 'edit' ? handleUpdateReminder : handleCreateReminder}
        />
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
    paddingBottom: 100,
  },
  card: {
    overflow: "hidden",
    marginBottom: 12,
  },

  title: { fontSize: 20, color: "#0F172A", textAlign: "left",marginBottom:2},

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

  smallIcon: {
    gap: 2,
    width: 14,
    height: 14,
    marginLeft: 8,
    marginTop: 1,
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
  // Toggle Switch Styles
  toggleContainer: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    padding: 2,
    justifyContent: 'center',
  },
  toggleContainerOn: {
    backgroundColor: '#0ea5e9',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
    transform: [{ translateX: 0 }],
  },
  toggleCircleOn: {
    transform: [{ translateX: 22 }],
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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

  dropdownTextSelected: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownArrow: {
    color: '#64748b',
    fontSize: 16,
  },
  timeText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#000',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  createButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '300',
  },
   emptyState: {
     alignItems: 'center',
     padding: 40,
     backgroundColor: '#fff',
     borderRadius: 12,
     marginBottom: 12,
   },
   emptyStateText: {
     fontSize: 16,
     fontWeight: '600',
     color: '#64748b',
     marginBottom: 8,
   },
   emptyStateSubtext: {
     fontSize: 14,
     color: '#94a3b8',
     textAlign: 'center',
   },

  timeInputContainer: {
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  timesSummary: {
    fontSize: 14,
    color: '#0ea5e9',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
