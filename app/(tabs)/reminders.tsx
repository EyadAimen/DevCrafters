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
    AppState,
    Alert,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/BottomNavigation";
import { supabase } from "../../lib/supabase";
import * as Notifications from 'expo-notifications';

// ============= CONSTANTS =============
const FREQUENCIES = ['Once Daily', 'Twice Daily', 'Thrice Daily'];

// ============= NOTIFICATION CONFIG =============
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ============= UTILITY FUNCTIONS =============
const formatTimeForDB = (date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatTime = (date) => date.toLocaleTimeString('en-US', {
  hour: 'numeric', minute: '2-digit', hour12: true
});

const getNextDoseText = (scheduledTime) => {
  if (!scheduledTime) return 'No time set';

  const now = new Date();
  const [hours, minutes] = scheduledTime.split(':').map(Number);

  // Create today's reminder time
  const reminderTimeToday = new Date();
  reminderTimeToday.setHours(hours, minutes, 0, 0);

  // Create tomorrow's reminder time
  const reminderTimeTomorrow = new Date();
  reminderTimeTomorrow.setDate(reminderTimeTomorrow.getDate() + 1);
  reminderTimeTomorrow.setHours(hours, minutes, 0, 0);

  const timeString = reminderTimeToday.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Check if today's time has already passed
  if (reminderTimeToday > now) {
    return `Today at ${timeString}`;
  } else {
    // Today's time has passed, show tomorrow
    return `Tomorrow at ${timeString}`;
  }
};

const getFrequencyTimeSlots = (frequency) => {
  switch (frequency) {
    case 'Twice Daily': return 2;
    case 'Thrice Daily': return 3;
    default: return 1;
  }
};


// ============= TOGGLE SWITCH COMPONENT =============
const ToggleSwitch = ({ isOn, onToggle }) => (
  <Pressable
    style={[styles.toggleContainer, isOn && styles.toggleContainerOn]}
    onPress={onToggle}
  >
    <View style={[styles.toggleCircle, isOn && styles.toggleCircleOn]} />
  </Pressable>
);

// ============= DROPDOWN COMPONENT =============
const Dropdown = ({
  label,
  value,
  placeholder,
  isOpen,
  onToggle,
  items,
  onSelect,
  loading = false,
  renderItem = (item) => item
}) => (
  <View style={styles.modalSection}>
    <Text style={styles.sectionLabel}>{label}</Text>
    <Pressable style={styles.dropdown} onPress={onToggle}>
      <Text style={value ? styles.dropdownTextSelected : styles.dropdownText}>
        {value || (loading ? `Loading ${placeholder.toLowerCase()}...` : placeholder)}
      </Text>
      <Text style={styles.dropdownArrow}>⌄</Text>
    </Pressable>

    {isOpen && (
      <View style={styles.dropdownList}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0ea5e9" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : items.length > 0 ? (
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {items.map((item, index) => (
              <Pressable
                key={index}
                style={styles.dropdownItem}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.dropdownItemText}>{renderItem(item)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        )}
      </View>
    )}
  </View>
);

// ============= TIME PICKER COMPONENT =============
const TimePicker = ({ times, showPickers, onTogglePicker, onTimeChange }) => (
  <View style={styles.modalSection}>
    <Text style={styles.sectionLabel}>Time{times.length > 1 ? 's' : ''}</Text>
    {times.map((time, index) => (
      <View key={index} style={styles.timeInputContainer}>
        {times.length > 1 && (
          <Text style={styles.timeLabel}>Time {index + 1}</Text>
        )}
        <Pressable style={styles.timeInput} onPress={() => onTogglePicker(index)}>
          <Text style={styles.timeText}>{formatTime(time)}</Text>
        </Pressable>
        {showPickers[index] && (
          <DateTimePicker
            value={time}
            mode="time"
            display="spinner"
            onChange={onTimeChange(index)}
            textColor="#000"
          />
        )}
      </View>
    ))}
  </View>
);

// ============= REMINDER MODAL COMPONENT =============
const ReminderModal = ({
  visible,
  onClose,
  mode = 'create',
  initialData,
  medicines,
  loadingMedicines,
  onSubmit
}) => {
  const [formState, setFormState] = useState({
    selectedMedicine: '',
    selectedMedicineId: '',
    selectedFrequency: '',
    selectedTimes: [new Date()],
    showTimePickers: [false],
    showMedicineDropdown: false,
    showFrequencyDropdown: false,
  });

  useEffect(() => {
    if (initialData && mode === 'edit') {
      const [hours, minutes] = initialData.scheduled_time.split(':');
      const time = new Date();
      time.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      setFormState({
        selectedMedicine: initialData.medicines?.medicine_name || '',
        selectedMedicineId: initialData.medicine_id || '',
        selectedFrequency: initialData.frequency || '',
        selectedTimes: [time],
        showTimePickers: [false],
        showMedicineDropdown: false,
        showFrequencyDropdown: false,
      });
    }
  }, [initialData, mode]);

  const updateFormState = (updates) => {
    setFormState(prev => ({ ...prev, ...updates }));
  };

  const handleFrequencySelect = (frequency) => {
    const timeSlots = getFrequencyTimeSlots(frequency);
    const newTimes = Array.from({ length: timeSlots }, (_, i) => {
      const time = new Date();
      time.setHours(time.getHours() + i);
      return time;
    });

    updateFormState({
      selectedFrequency: frequency,
      selectedTimes: newTimes,
      showTimePickers: new Array(timeSlots).fill(false),
      showFrequencyDropdown: false,
    });
  };

  const handleMedicineSelect = (medicine) => {
    updateFormState({
      selectedMedicine: medicine.medicine_name,
      selectedMedicineId: medicine.medicine_id,
      showMedicineDropdown: false,
    });
  };

  const toggleTimePicker = (index) => {
    const newShowTimePickers = [...formState.showTimePickers];
    newShowTimePickers[index] = !newShowTimePickers[index];
    updateFormState({
      showTimePickers: newShowTimePickers,
      showMedicineDropdown: false,
      showFrequencyDropdown: false,
    });
  };

  const onTimeChange = (index) => (event, selectedDate) => {
    const newShowTimePickers = [...formState.showTimePickers];
    newShowTimePickers[index] = false;

    if (selectedDate) {
      const newTimes = [...formState.selectedTimes];
      newTimes[index] = selectedDate;
      updateFormState({ selectedTimes: newTimes, showTimePickers: newShowTimePickers });
    } else {
      updateFormState({ showTimePickers: newShowTimePickers });
    }
  };

  const resetForm = () => {
    setFormState({
      selectedMedicine: '',
      selectedMedicineId: '',
      selectedFrequency: '',
      selectedTimes: [new Date()],
      showTimePickers: [false],
      showMedicineDropdown: false,
      showFrequencyDropdown: false,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    // Validate form first
    if (!isFormValid) return;

    // Call the parent's onSubmit function
    await onSubmit({
      selectedMedicineId: formState.selectedMedicineId,
      selectedFrequency: formState.selectedFrequency,
      selectedTimes: formState.selectedTimes
    });
  };

  const isFormValid = formState.selectedMedicine && formState.selectedFrequency;

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

          <Dropdown
            label="Medication"
            value={formState.selectedMedicine}
            placeholder="Select medication"
            isOpen={formState.showMedicineDropdown}
            onToggle={() => updateFormState({
              showMedicineDropdown: !formState.showMedicineDropdown,
              showFrequencyDropdown: false,
            })}
            items={medicines}
            onSelect={handleMedicineSelect}
            loading={loadingMedicines}
            renderItem={(medicine) => medicine.medicine_name}
          />

          <Dropdown
            label="Frequency"
            value={formState.selectedFrequency}
            placeholder="Select frequency"
            isOpen={formState.showFrequencyDropdown}
            onToggle={() => updateFormState({
              showFrequencyDropdown: !formState.showFrequencyDropdown,
              showMedicineDropdown: false,
            })}
            items={FREQUENCIES}
            onSelect={handleFrequencySelect}
          />

          <TimePicker
            times={formState.selectedTimes}
            showPickers={formState.showTimePickers}
            onTogglePicker={toggleTimePicker}
            onTimeChange={onTimeChange}
          />

          <Pressable
            style={[styles.createButton, !isFormValid && styles.createButtonDisabled]}
            onPress={() => handleSubmit()}
            disabled={!isFormValid}
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

// ============= STAT CARD COMPONENT =============
const StatCard = ({ icon, label, value }) => (
  <Pressable style={styles.smallCard}>
    <Image source={icon} style={styles.smallIcon} />
    <View>
      <Text style={styles.smallText}>{label}</Text>
      <Text style={{ fontSize: 12, marginTop: 15 }}>{value}</Text>
    </View>
  </Pressable>
);

// ============= SETTING ITEM COMPONENT =============
const SettingItem = ({ title, subtitle, isOn, onToggle }) => (
  <View style={styles.settingItem}>
    <View style={styles.settingText}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingSubtitle}>{subtitle}</Text>
    </View>
    <ToggleSwitch isOn={isOn} onToggle={onToggle} />
  </View>
);

// ============= REMINDER CARD COMPONENT =============
const ReminderCard = ({
  reminder,
  onEdit,
  onDelete
}) => {
  const medicineName = reminder.medicines?.medicine_name || 'Unknown Medicine';

  return (
    <View style={styles.reminderCard}>
      <View style={styles.reminderHeader}>
        <Text style={styles.medName}>{medicineName}</Text>
        {/* ToggleSwitch removed from here */}
      </View>
      <Text style={styles.nextDose}>
        Next: {getNextDoseText(reminder.scheduled_time)}
      </Text>
      <View style={styles.reminderActions}>
        <Pressable style={styles.actionButton} onPress={onEdit}>
          <Image source={require("../../assets/edit.png")} style={styles.smallIcon} />
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onDelete}>
          <Image source={require("../../assets/deleteIcon.png")} style={styles.smallIcon} />
          <Text style={styles.actionText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
};

// ============= MAIN COMPONENT =============
export default function Reminders() {
  const router = useRouter();

  // State
  const [reminders, setReminders] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [modalState, setModalState] = useState({
    visible: false,
    mode: 'create',
    data: null
  });
  const [settings, setSettings] = useState({
    pushNotifications: true,
    soundAlerts: true,
  });

  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  const [hasScheduledInitialNotifications, setHasScheduledInitialNotifications] = useState(false);

  // ============= NOTIFICATION INITIALIZATION =============
  const initializeNotifications = async () => {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Notifications are required for medication reminders.');
      return false;
    }

    // Configure notification channel for Android
    await Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Medication Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: true,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    return true;
  };

  // ============= NOTIFICATION FUNCTIONS =============
  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  };

  const cancelNotification = async (reminderId) => {
    try {
      const notificationId = `reminder_${reminderId}`;

      // Cancel using the specific ID
      await Notifications.cancelScheduledNotificationAsync(notificationId);

      // Also get all scheduled and remove any that match
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter(notif =>
        notif.identifier === notificationId ||
        notif.identifier.startsWith(`reminder_${reminderId}_`)
      );

      for (const notif of toCancel) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }

      console.log('Cancelled notification for reminder:', reminderId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  };

  const scheduleNotification = async (reminder) => {
    if (!settings.pushNotifications || !notificationsInitialized) return;

    const [hours, minutes] = reminder.scheduled_time.split(":");

    const medicineName =
      reminder.medicines?.medicine_name ||
      reminder.medicine_name ||
      "your medication";

    try {
      const identifier = `reminder_${reminder.reminder_id}`;

      // Schedule daily repeating reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time to take ${medicineName}`,
          body: "Tap to confirm you took your dose",
          sound: settings.soundAlerts ? "default" : null,
          data: {
            reminderId: reminder.reminder_id,
            medicineName: medicineName,
            scheduledTime: reminder.scheduled_time,
          },
          android: {
            channelId: "medication-reminders",
          },
        },
        trigger: {
          type: "daily",
          hour: parseInt(hours),
          minute: parseInt(minutes),
        },
        identifier,
      });

      console.log(
        "Daily notification scheduled:",
        `${hours}:${minutes}`,
        "ID:",
        identifier
      );

      return true;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      return false;
    }
  };

  const scheduleAllNotifications = async (remindersList) => {
    if (!settings.pushNotifications || !notificationsInitialized) {
      console.log('Notifications disabled or not initialized');
      return;
    }

    try {
      // Get currently scheduled notifications
      const currentlyScheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Currently scheduled:', currentlyScheduled.length);

      // Create a map of what should be scheduled
      const shouldBeScheduled = {};
      remindersList.forEach(reminder => {
        const identifier = `reminder_${reminder.reminder_id}`;
        shouldBeScheduled[identifier] = reminder;
      });

      // Cancel notifications that are no longer needed
      for (const scheduledNotif of currentlyScheduled) {
        if (!shouldBeScheduled[scheduledNotif.identifier] && scheduledNotif.identifier.startsWith('reminder_')) {
          await Notifications.cancelScheduledNotificationAsync(scheduledNotif.identifier);
          console.log('Cancelled old notification:', scheduledNotif.identifier);
        }
      }

      // Schedule only NEW reminders that aren't already scheduled
      let scheduledCount = 0;
      for (const reminder of remindersList) {
        const identifier = `reminder_${reminder.reminder_id}`;

        // Check if this notification is already scheduled correctly
        const alreadyScheduled = currentlyScheduled.find(n => n.identifier === identifier);

        if (!alreadyScheduled) {
          const success = await scheduleNotification(reminder);
          if (success) scheduledCount++;
        } else {
          console.log('Notification already scheduled:', identifier);
        }
      }

      console.log(`Scheduled ${scheduledCount} new notifications. Total reminders: ${remindersList.length}`);
    } catch (error) {
      console.error('Error in scheduleAllNotifications:', error);
    }
  };

  // ============= DATA FETCHING =============
  const fetchMedicines = async () => {
    setLoadingMedicines(true);
    try {
      const { data, error } = await supabase
        .from('medicines')
        .select('medicine_id, medicine_name')
        .order('medicine_name');
      if (!error) setMedicines(data || []);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoadingMedicines(false);
    }
  };


  const fetchReminders = async (shouldScheduleNotifications = true) => {
    setLoadingReminders(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadingReminders(false);
        return;
      }

      const { data, error } = await supabase
        .from('reminders')
        .select(`
          reminder_id,
          scheduled_time,
          created_at,
          frequency,
          medicine_id,
          medicines (medicine_name)
        `)
        .eq('user_id', user.id)
        .order('scheduled_time');

      if (error) {
        console.error('Error fetching reminders:', error);
        setReminders([]);
        return;
      }

      // FIX: Properly filter reminders - handle null reminder objects AND null medicines
      const validReminders = (data || []).filter(reminder => {
        if (!reminder) return false;

        // Check if medicines join worked (could be null or {})
        const hasMedicineInfo = reminder.medicines &&
                              (reminder.medicines.medicine_name !== undefined ||
                               reminder.medicines.medicine_name !== null);

        return hasMedicineInfo;
      });

      setReminders(validReminders);

      // Only schedule notifications if explicitly requested, we have permissions, and haven't scheduled yet
      if (shouldScheduleNotifications && notificationsInitialized && !hasScheduledInitialNotifications) {
        await scheduleAllNotifications(validReminders);
        setHasScheduledInitialNotifications(true);
      }

    } catch (error) {
      console.error('Error in fetchReminders:', error);
      setReminders([]);
    } finally {
      setLoadingReminders(false);
    }
  };


  // Get the next upcoming reminder
  const getNextReminder = () => {
    if (!reminders || reminders.length === 0) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let nextReminder = null;
    let smallestDiff = Infinity;

    for (const reminder of reminders) {
      if (!reminder.scheduled_time) continue;

      const [reminderHour, reminderMinute] = reminder.scheduled_time.split(':').map(Number);

      // Calculate minutes until this reminder today
      let minutesUntil = (reminderHour * 60 + reminderMinute) - (currentHour * 60 + currentMinute);

      // If reminder has already passed today, check for tomorrow
      if (minutesUntil < 0) {
        minutesUntil += 24 * 60; // Add 24 hours
      }

      // Find the closest upcoming reminder
      if (minutesUntil < smallestDiff) {
        smallestDiff = minutesUntil;
        nextReminder = reminder;
      }
    }

    return nextReminder;
  };

  const nextReminder = getNextReminder();



  // ============= CRUD OPERATIONS =============
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

      const { data, error } = await supabase.from('reminders').insert(remindersToCreate).select(`
        reminder_id,
        scheduled_time,
        frequency,
        medicine_id,
        medicines (medicine_name)
      `);

      if (error) {
        Alert.alert('Error', 'Failed to create reminder');
        return;
      }

      // Close modal FIRST before async operations
      closeModal();

      // Then schedule notifications and refresh
      if (notificationsInitialized && data) {
        for (const reminder of data) {
          await scheduleNotification(reminder);
        }
      }

      // Refresh reminders without scheduling (since we manually scheduled above)
      await fetchReminders(false);

      Alert.alert('Success', 'Reminder created successfully');

    } catch (error) {
      console.error('Error creating reminder:', error);
      Alert.alert('Error', 'Failed to create reminder');
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

      if (error) {
        Alert.alert('Error', 'Failed to update reminder');
        return;
      }

      // Close modal FIRST before async operations
      closeModal();

      // Then update notification and refresh
      if (notificationsInitialized) {
        const updatedReminder = {
          reminder_id: modalState.data.reminder_id,
          scheduled_time: formatTimeForDB(selectedTimes[0]),
          medicines: medicines.find(m => m.medicine_id === selectedMedicineId)
        };
        await scheduleNotification(updatedReminder);
      }

      // Refresh reminders without scheduling
      await fetchReminders(false);

      Alert.alert('Success', 'Reminder updated successfully');

    } catch (error) {
      console.error('Error updating reminder:', error);
      Alert.alert('Error', 'Failed to update reminder');
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancel the notification FIRST before deleting from database
              await cancelNotification(reminderId);

              const { error } = await supabase
                .from('reminders')
                .delete()
                .eq('reminder_id', reminderId);

              if (error) {
                Alert.alert('Error', 'Failed to delete reminder');
                return;
              }

              // Update local state immediately instead of re-fetching
              setReminders(prev => prev.filter(r =>
                r && r.reminder_id !== reminderId
              ));

              Alert.alert('Success', 'Reminder deleted successfully');

            } catch (error) {
              console.error('Error deleting reminder:', error);
              Alert.alert('Error', 'Failed to delete reminder');
            }
          }
        }
      ]
    );
  };



  // ============= MODAL HANDLERS =============
  const openCreateModal = () => {
    fetchMedicines();
    setModalState({ visible: true, mode: 'create', data: null });
  };

  const openEditModal = (reminder) => {
    fetchMedicines();
    setModalState({ visible: true, mode: 'edit', data: reminder });
  };

  const closeModal = () => setModalState({ visible: false, mode: 'create', data: null });

  // ============= EFFECTS =============
  useEffect(() => {
    const init = async () => {
      const initialized = await initializeNotifications();
      setNotificationsInitialized(initialized);
      if (initialized) {
        await fetchReminders(false); // Allow scheduling after initialization
      }
    };

    init();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification.request.identifier);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response.notification.request.identifier);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

// ============= RENDER FUNCTIONS =============
const renderReminders = () => {
  if (loadingReminders) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading reminders...</Text>
      </View>
    );
  }

  // FIX: Better filtering for display - ensure we have valid reminder data
  const validReminders = reminders.filter(reminder => {
    if (!reminder) return false;
    if (!reminder.reminder_id) return false;
    if (!reminder.scheduled_time) return false;

    // Check if we have medicine info (either from join or can be fetched)
    const hasMedicineInfo = reminder.medicines &&
                           (reminder.medicines.medicine_name !== undefined);

    return hasMedicineInfo;
  });

  if (validReminders.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No reminders yet</Text>
        <Text style={styles.emptyStateSubtext}>Add your first reminder to get started</Text>
      </View>
    );
  }

  return validReminders.map((reminder) => (
    <ReminderCard
      key={reminder.reminder_id}
      reminder={reminder}
      onEdit={() => openEditModal(reminder)}
      onDelete={() => handleDeleteReminder(reminder.reminder_id)}
    />
  ));
};

// ============= RENDER =============
return (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <LinearGradient
        style={styles.gradientBg}
        locations={[0, 0.5, 1]}
        colors={["#f8fafc", "rgba(239, 246, 255, 0.3)", "rgba(236, 254, 255, 0.2)"]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <LinearGradient locations={[0, 0]} colors={["rgba(14, 165, 233, 0.05)", "rgba(0, 0, 0, 0)"]}>
            <View>
              <Text style={styles.title}>Medication Reminders</Text>
              <Text style={{ color: "#64748B" }}>Never miss a dose with timely notifications</Text>
              <Text> </Text>
            </View>
          </LinearGradient>

          {/* Stats Cards */}
          <View style={styles.rowBetween}>
            <StatCard
              icon={require("../../assets/bell.png")}
              label="Active Meds"
              value={reminders.length}
            />
            <StatCard
              icon={require("../../assets/clock.png")}
              label="Next Dose"
              value={nextReminder ? getNextDoseText(nextReminder.scheduled_time) : 'No upcoming reminders'}
            />
          </View>

          {/* Reminders List */}
          <View style={styles.meds}>
            <View style={styles.remindersHeader}>
              <Text style={styles.titlemeds}>Your Reminders</Text>
              <Pressable style={styles.addButton} onPress={openCreateModal}>
                <Text style={styles.addButtonText}>+ Add New</Text>
              </Pressable>
            </View>

            {renderReminders()}
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
        onSubmit={modalState.mode === 'edit' ? handleUpdateReminder : handleCreateReminder}
      />
    </View>
  </SafeAreaView>
);
}

// ============= STYLES =============
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
  title: {
    fontSize: 20,
    color: "#0F172A",
    textAlign: "left",
    marginBottom: 2
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
  smallText: {
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

  titlemeds: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  meds: {
    marginBottom: 20,
  },
  remindersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  nextDose: {
    fontSize: 14,
    color: '#0EA5E9',
    marginBottom: 12,
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
  closeButtonText: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '300',
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
  dropdownTextSelected: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownArrow: {
    color: '#64748b',
    fontSize: 16,
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
  timeInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  timeText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
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
  createButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
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
