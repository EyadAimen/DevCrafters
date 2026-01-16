import React from "react";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View, Modal, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { Feather } from "@expo/vector-icons";
import BottomNavigation from "../../components/BottomNavigation";

type Medicine = {
	id: string;
	name: string;
	strength: string; // e.g. "10mg"
	quantity: number; // current stock
	lowStockThreshold?: number; // default 5
	frequencyText: string; // e.g. "Once daily"
	expiryDate?: string; // YYYY-MM-DD format
	scheduledTimes?: string[]; // Array of HH:MM times from reminder table
};

type TabKey = "ALL" | "DUE_TODAY" | "LOW_STOCK";

const ActiveMeds = () => {
	const router = useRouter();
	const [medicines, setMedicines] = useState<Medicine[]>([]);
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState<TabKey>("ALL");
	const [loading, setLoading] = useState(true);
	const [showFilter, setShowFilter] = useState(false);
	const [filterOptions, setFilterOptions] = useState({
		sortBy: "name", // "name", "expiry", "stock"
		sortOrder: "asc" // "asc", "desc"
	});
	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const timer = setInterval(() => setNow(new Date()), 60000);
		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		fetchMedicines();
	}, []);

	const fetchMedicines = async () => {
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) {
				setLoading(false);
				return;
			}

			// Fetch medicines from Supabase
			const { data: medicinesData, error: medicinesError } = await supabase
				.from('medicines')
				.select('*')
				.eq('user_id', user.id)
				.eq('is_disposable', false) // Only fetch active, non-disposable medicines
				.order('medicine_name', { ascending: true });

			if (medicinesError) {
				console.error('Error fetching medicines:', medicinesError);
				setMedicines([]);
				setLoading(false);
				return;
			}

			if (!medicinesData) {
				setMedicines([]);
				setLoading(false);
				return;
			}

			// Fetch reminders for all medicines
			const medicineIds = medicinesData
				.map((m: any) => m.medicine_id as string | null)
				.filter((id): id is string => typeof id === 'string' && id.length > 0);

			let remindersData = null;
			if (medicineIds.length > 0) {
				const remindersResponse = await supabase
					.from('reminders')
					.select('medicine_id, scheduled_time')
					.in('medicine_id', medicineIds);
				remindersData = remindersResponse.data;
			}

			// Create a map of medicine_id to scheduled_times array
			const reminderMap = new Map<string, string[]>();
			if (remindersData) {
				remindersData.forEach((reminder: any) => {
					if (reminder.scheduled_time) {
						const existing = reminderMap.get(reminder.medicine_id) || [];
						existing.push(reminder.scheduled_time);
						reminderMap.set(reminder.medicine_id, existing);
					}
				});
			}

			// Map database fields to Medicine type
			const mappedMedicines: Medicine[] = medicinesData.map((med: any) => {
				const times = reminderMap.get(med.medicine_id) || [];
				return {
					id: med.medicine_id, // ✅ use medicine_id
					name: med.medicine_name || '',
					strength: med.dosage || '',
					quantity: med.current_stock || 0,
					lowStockThreshold: 5,
					frequencyText: med.frequency || '',
					expiryDate: med.expiry_date || undefined,
					scheduledTimes: times
				};
			});

			// Check for expired medicines
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const activeMedicines: Medicine[] = [];
			const expiredMedicines: Medicine[] = [];

			mappedMedicines.forEach(med => {
				if (med.expiryDate) {
					const expiry = new Date(med.expiryDate);
					expiry.setHours(0, 0, 0, 0);
					// If expiry is BEFORE today, it is expired. (Due today means expiry == today, which is safe).
					if (expiry < today) {
						expiredMedicines.push(med);
					} else {
						activeMedicines.push(med);
					}
				} else {
					activeMedicines.push(med);
				}
			});

			// Process expired medicines in background
			if (expiredMedicines.length > 0) {
				const processExpiry = async () => {
					for (const med of expiredMedicines) {
						try {
							// Update to disposal
							await supabase
								.from('medicines')
								.update({ is_disposable: true, disposal_reason: 'EXPIRED' })
								.eq('medicine_id', med.id);

							// Log action
							await supabase
								.from('disposal_log')
								.insert({
									medicine_id: med.id,
									user_id: user.id,
									action_type: 'ADDED_EXPIRED',
									can_revert: false,
									action_timestamp: new Date().toISOString()
								});
						} catch (err) {
							console.error(`Failed to expire medicine ${med.id}`, err);
						}
					}
				};
				processExpiry();
			}

			setMedicines(activeMedicines);
		} catch (error) {
			console.error('Error:', error);
			setMedicines([]);
		} finally {
			setLoading(false);
		}
	};

	const todayStr = useMemo(() => new Date().toDateString(), []);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		// Search by medicine name
		const byQuery = (m: Medicine) =>
			q.length === 0 || m.name.toLowerCase().includes(q);

		const isDueToday = (m: Medicine) => {
			if (!m.expiryDate) return false;
			const expiryDate = new Date(m.expiryDate);
			const today = new Date();
			// Compare dates (ignore time)
			return expiryDate.getFullYear() === today.getFullYear() &&
				expiryDate.getMonth() === today.getMonth() &&
				expiryDate.getDate() === today.getDate();
		};

		const isLowStock = (m: Medicine) => m.quantity <= (m.lowStockThreshold ?? 5);

		let list = medicines;
		switch (activeTab) {
			case "DUE_TODAY":
				list = medicines.filter(isDueToday);
				break;
			case "LOW_STOCK":
				list = medicines.filter(isLowStock);
				break;
			default:
				list = medicines;
		}

		// Apply search filter
		list = list.filter(byQuery);

		// Apply sorting
		const sorted = [...list].sort((a, b) => {
			let comparison = 0;
			switch (filterOptions.sortBy) {
				case "name":
					comparison = a.name.localeCompare(b.name);
					break;
				case "expiry":
					const aDate = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
					const bDate = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
					comparison = aDate - bDate;
					break;
				case "stock":
					comparison = a.quantity - b.quantity;
					break;
				default:
					comparison = 0;
			}
			return filterOptions.sortOrder === "asc" ? comparison : -comparison;
		});

		return sorted;
	}, [medicines, search, activeTab, todayStr, filterOptions]);

	const handleMoveToDisposal = (medicineId: string) => {
		Alert.alert(
			"Move to Disposal",
			"Are you sure you want to move this medicine to the disposal list?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Move to Disposal",
					style: "destructive",
					onPress: async () => {
						try {
							const { data: { user } } = await supabase.auth.getUser();
							if (!user) {
								Alert.alert("Error", "User not authenticated");
								return;
							}

							// 1. Update medicines table
							const { error: updateError } = await supabase
								.from('medicines')
								.update({
									is_disposable: true,
									disposal_reason: 'Marked as disposal'
								})
								.eq('medicine_id', medicineId);

							if (updateError) throw updateError;

							// 2. Log the action
							const { error: logError } = await supabase
								.from('disposal_log')
								.insert({
									medicine_id: medicineId,
									user_id: user.id,
									action_type: 'ADDED_MANUAL',
									can_revert: true,
									action_timestamp: new Date().toISOString()
								});

							if (logError) {
								console.error("Error logging disposal:", logError);
							}

							// 3. Update local state
							setMedicines(prev => prev.filter(m => m.id !== medicineId));
							Alert.alert("Success", "Medicine moved to disposal list");

						} catch (error) {
							console.error("Error moving to disposal:", error);
							Alert.alert("Error", "Failed to move medicine to disposal list");
						}
					}
				}
			]
		);
	};

	const renderCard = ({ item }: { item: Medicine }) => {
		const low = item.quantity <= (item.lowStockThreshold ?? 5);

		const nextDose = (() => {
			if (!item.scheduledTimes || item.scheduledTimes.length === 0) return null;

			const currentH = now.getHours();
			const currentM = now.getMinutes();

			let nextReminderTime: string | null = null;
			let smallestDiff = Infinity;

			for (const timeStr of item.scheduledTimes) {
				const [h, m] = timeStr.split(':').map(Number);
				let minutesUntil = (h * 60 + m) - (currentH * 60 + currentM);
				if (minutesUntil < 0) minutesUntil += 24 * 60; // Next day

				if (minutesUntil < smallestDiff) {
					smallestDiff = minutesUntil;
					nextReminderTime = timeStr;
				}
			}

			if (!nextReminderTime) return null;

			const [nextH, nextM] = nextReminderTime.split(':').map(Number);
			const targetDate = new Date(now);
			targetDate.setHours(nextH, nextM, 0, 0);
			if (targetDate <= now) {
				targetDate.setDate(targetDate.getDate() + 1);
			}

			const timeString = targetDate.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});

			const isToday = targetDate.getDate() === now.getDate();
			return `${timeString}, ${isToday ? 'Today' : 'Tomorrow'}`;
		})();

		return (

			<Pressable onPress={() => router.push(`/(tabs)/medicine/${item.id}`)}
				style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
				<View style={styles.card}>
					<View style={styles.cardRow}>
						<View style={styles.iconSquare}>
							<Image source={require("../../assets/medicineIcon.png")} style={styles.iconImg} resizeMode="contain" />
						</View>
						<View style={styles.cardContent}>
							<View style={styles.cardHeader}>
								<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
									<Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
									{low && (
										<View style={styles.lowBadge}>
											<Text style={styles.lowBadgeText}>Low Stock</Text>
										</View>
									)}
								</View>

								<Pressable
									onPress={() => handleMoveToDisposal(item.id)}
									style={{ padding: 4 }}
								>
									<Feather name="more-vertical" size={20} color="#94a3b8" />
								</Pressable>
							</View>
							<Text style={styles.cardSub}>{item.strength}</Text>
							<View style={styles.metaRow}>
								<View style={styles.frequencyRow}>
									<Image source={require("../../assets/timeIcon.png")} style={styles.timeIcon} resizeMode="contain" />
									<Text style={styles.metaText}>{item.frequencyText}</Text>
								</View>
							</View>
							{nextDose && (
								<View style={styles.reminderRow}>
									<Image source={require("../../assets/reminderIcon.png")} style={styles.reminderIcon} resizeMode="contain" />
									<Text style={styles.reminderText}>Next: {nextDose}</Text>
								</View>
							)}
							<Text style={[styles.stockText, low ? styles.stockLow : undefined]}>{item.quantity} pills left</Text>
						</View>
					</View>
				</View>
			</Pressable>
		);
	};


	const ListHeaderComponent = () => (
		<>
			<Text style={styles.header}>My Medications</Text>
			<Text style={styles.caption}>{medicines.length} active medications</Text>

			<View style={styles.searchRow}>
				<View style={styles.searchBox}>
					<Image source={require("../../assets/searchIcon.png")} style={styles.searchIcon} />
					<TextInput
						placeholder="Search medications..."
						placeholderTextColor="#64748b"
						style={styles.searchInput}
						value={search}
						onChangeText={setSearch}
					/>
				</View>
				<Pressable style={styles.filterBtn} onPress={() => setShowFilter(true)}>
					<Image source={require("../../assets/filterIcon.png")} style={styles.filterIcon} />
				</Pressable>
			</View>

			<View style={styles.tabs}>
				<TabButton key="ALL" label="All" active={activeTab === "ALL"} onPress={() => setActiveTab("ALL")} />
				<TabButton key="DUE_TODAY" label="Due Today" active={activeTab === "DUE_TODAY"} onPress={() => setActiveTab("DUE_TODAY")} />
				<TabButton key="LOW_STOCK" label="Low Stock" active={activeTab === "LOW_STOCK"} onPress={() => setActiveTab("LOW_STOCK")} />
			</View>
		</>
	);

	const ListFooterComponent = () => (
		<Pressable style={styles.addButton} onPress={() => router.push("/add-medicine")}>
			<Text style={styles.addButtonText}>+</Text>
			<Text style={styles.addButtonLabel}>Add Medication</Text>
		</Pressable>
	);

	return (
		<SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
			<LinearGradient style={styles.gradient} locations={[0, 0.5, 1]} colors={["#f8fafc", "rgba(239, 246, 255, 0.3)", "rgba(236, 254, 255, 0.2)"]}>
				{loading ? (
					<View style={styles.container}>
						<ListHeaderComponent />
						<Text style={styles.empty}>Loading medications...</Text>
					</View>
				) : (
					<FlatList
						data={filtered}
						keyExtractor={(m: Medicine) => m.id}
						renderItem={renderCard}
						ListHeaderComponent={ListHeaderComponent}
						ListFooterComponent={ListFooterComponent}
						contentContainerStyle={[styles.container, styles.list]}
						ListEmptyComponent={<Text style={styles.empty}>No medications found</Text>}
						showsVerticalScrollIndicator={false}
					/>
				)}
			</LinearGradient>
			<BottomNavigation />

			{/* Filter Modal */}
			<Modal
				visible={showFilter}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowFilter(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Filter & Sort</Text>
							<Pressable onPress={() => setShowFilter(false)}>
								<Text style={styles.modalClose}>✕</Text>
							</Pressable>
						</View>

						<View style={styles.filterSection}>
							<Text style={styles.filterLabel}>Sort By</Text>
							<View style={styles.filterOptions}>
								<Pressable
									style={[styles.filterOption, filterOptions.sortBy === "name" && styles.filterOptionActive]}
									onPress={() => setFilterOptions({ ...filterOptions, sortBy: "name" })}
								>
									<Text style={[styles.filterOptionText, filterOptions.sortBy === "name" && styles.filterOptionTextActive]}>Name</Text>
								</Pressable>
								<Pressable
									style={[styles.filterOption, filterOptions.sortBy === "expiry" && styles.filterOptionActive]}
									onPress={() => setFilterOptions({ ...filterOptions, sortBy: "expiry" })}
								>
									<Text style={[styles.filterOptionText, filterOptions.sortBy === "expiry" && styles.filterOptionTextActive]}>Expiry Date</Text>
								</Pressable>
								<Pressable
									style={[styles.filterOption, filterOptions.sortBy === "stock" && styles.filterOptionActive]}
									onPress={() => setFilterOptions({ ...filterOptions, sortBy: "stock" })}
								>
									<Text style={[styles.filterOptionText, filterOptions.sortBy === "stock" && styles.filterOptionTextActive]}>Stock</Text>
								</Pressable>
							</View>
						</View>

						<View style={styles.filterSection}>
							<Text style={styles.filterLabel}>Order</Text>
							<View style={styles.filterOptions}>
								<Pressable
									style={[styles.filterOption, filterOptions.sortOrder === "asc" && styles.filterOptionActive]}
									onPress={() => setFilterOptions({ ...filterOptions, sortOrder: "asc" })}
								>
									<Text style={[styles.filterOptionText, filterOptions.sortOrder === "asc" && styles.filterOptionTextActive]}>Ascending</Text>
								</Pressable>
								<Pressable
									style={[styles.filterOption, filterOptions.sortOrder === "desc" && styles.filterOptionActive]}
									onPress={() => setFilterOptions({ ...filterOptions, sortOrder: "desc" })}
								>
									<Text style={[styles.filterOptionText, filterOptions.sortOrder === "desc" && styles.filterOptionTextActive]}>Descending</Text>
								</Pressable>
							</View>
						</View>

						<Pressable style={styles.applyButton} onPress={() => setShowFilter(false)}>
							<Text style={styles.applyButtonText}>Apply</Text>
						</Pressable>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
};

const TabButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
	<Pressable onPress={onPress} style={[styles.tabBtn, active ? styles.tabBtnActive : undefined]}>
		<Text style={[styles.tabText, active ? styles.tabTextActive : undefined]}>{label}</Text>
	</Pressable>
);

const styles = StyleSheet.create({
	page: {
		flex: 1
	},
	gradient: {
		flex: 1
	},
	container: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 100
	},
	list: {
		paddingTop: 12,
		gap: 12
	},
	header: {
		fontSize: 18,
		fontWeight: "600",
		color: "#0f172a"
	},
	caption: {
		marginTop: 4,
		fontSize: 14,
		color: "#64748b"
	},
	searchRow: {
		marginTop: 16,
		flexDirection: "row",
		gap: 8,
		alignItems: "center"
	},
	searchBox: {
		flex: 1,
		height: 40,
		borderRadius: 14,
		backgroundColor: "#f1f5f9",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12
	},
	searchIcon: {
		width: 18,
		height: 18,
		tintColor: "#64748b",
		marginRight: 8
	},
	searchInput: {
		flex: 1,
		color: "#0f172a",
		fontSize: 16
	},
	filterBtn: {
		width: 40,
		height: 40,
		borderRadius: 14,
		backgroundColor: "#e2e8f0",
		alignItems: "center",
		justifyContent: "center"
	},
	filterIcon: {
		width: 20,
		height: 20,
		tintColor: "#0f172a"
	},
	tabs: {
		marginTop: 16,
		flexDirection: "row",
		gap: 8,
		backgroundColor: "#f1f5f9",
		borderRadius: 20,
		padding: 4
	},
	tabBtn: {
		flex: 1,
		borderRadius: 16,
		paddingVertical: 6,
		alignItems: "center"
	},
	tabBtnActive: {
		backgroundColor: "#fff"
	},
	tabText: {
		fontSize: 14,
		color: "#0f172a"
	},
	tabTextActive: {
		fontWeight: "600"
	},
	card: {
		backgroundColor: "#fff",
		borderRadius: 20,
		padding: 16,
		marginBottom: 16,
		marginHorizontal: 0,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	cardRow: {
		flexDirection: "row",
		gap: 12,
		alignItems: "center"
	},
	iconSquare: {
		width: 56,
		height: 56,
		borderRadius: 16,
		backgroundColor: "#0ea5e9",
		alignItems: "center",
		justifyContent: "center"
	},
	iconImg: {
		width: 32,
		height: 32,
		tintColor: "#fff"
	},
	cardContent: {
		flex: 1,
	},
	cardHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		gap: 8
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#0f172a",
		flex: 1
	},
	cardSub: {
		fontSize: 12,
		color: "#64748b",
		marginTop: 1
	},
	metaRow: {
		flexDirection: "row",
		gap: 16,
		flexWrap: "wrap",
		alignItems: "center",
		marginTop: 4
	},
	frequencyRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6
	},
	timeIcon: {
		width: 14,
		height: 14,
		tintColor: "#64748b"
	},
	metaText: {
		fontSize: 12,
		color: "#64748b"
	},
	reminderRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 4,
		minHeight: 18
	},
	reminderIcon: {
		width: 14,
		height: 14,
		tintColor: "#0ea5e9"
	},
	reminderText: {
		fontSize: 12,
		color: "#0ea5e9"
	},
	stockText: {
		marginTop: 4,
		fontSize: 12,
		color: "#64748b"
	},
	stockLow: {
		color: "#e11d48"
	},
	lowBadge: {
		backgroundColor: "#ef4444",
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 4
	},
	lowBadgeText: {
		color: "#fff",
		fontSize: 10,
		fontWeight: "600"
	},
	empty: {
		textAlign: "center",
		color: "#64748b",
		marginTop: 24
	},
	addButton: {
		marginTop: 24,
		marginBottom: 16,
		backgroundColor: "#0ea5e9",
		borderRadius: 14,
		paddingVertical: 12,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8
	},
	addButtonText: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "600"
	},
	addButtonLabel: {
		color: "#fff",
		fontSize: 14,
		fontWeight: "600"
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end"
	},
	modalContent: {
		backgroundColor: "#fff",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 20,
		paddingBottom: 40
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 24
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#0f172a"
	},
	modalClose: {
		fontSize: 24,
		color: "#64748b"
	},
	filterSection: {
		marginBottom: 24
	},
	filterLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: "#0f172a",
		marginBottom: 12
	},
	filterOptions: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8
	},
	filterOption: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: "#f1f5f9",
		borderWidth: 1,
		borderColor: "#e2e8f0"
	},
	filterOptionActive: {
		backgroundColor: "#0ea5e9",
		borderColor: "#0ea5e9"
	},
	filterOptionText: {
		fontSize: 14,
		color: "#64748b"
	},
	filterOptionTextActive: {
		color: "#fff",
		fontWeight: "600"
	},
	applyButton: {
		backgroundColor: "#0ea5e9",
		borderRadius: 14,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 8
	},
	applyButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600"
	}
});

export default ActiveMeds;