import React from "react";
import {useEffect, useMemo, useState} from "react";
import {FlatList, Image, Pressable, StyleSheet, Text, TextInput, View} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import BottomNavigation from "../../components/BottomNavigation";

type Medicine = {
	id: string;
	name: string;
	strength: string; // e.g. "10mg"
	quantity: number; // current stock
	lowStockThreshold?: number; // default 5
	frequencyText: string; // e.g. "Once daily"
	nextDoseISO?: string; // ISO date-time for next dose
};

type TabKey = "ALL" | "DUE_TODAY" | "LOW_STOCK";

const ActiveMeds = () => {
	const router = useRouter();
	const [medicines, setMedicines] = useState<Medicine[]>([]);
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState<TabKey>("ALL");
	const [loading, setLoading] = useState(true);

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
			const { data, error } = await supabase
				.from('medicines')
				.select('*')
				.eq('user_id', user.id)
				.order('medicine_name', { ascending: true });

			if (error) {
				console.error('Error fetching medicines:', error);
				setMedicines([]);
			} else if (data) {
				// Map database fields to Medicine type
				const mappedMedicines: Medicine[] = data.map((med: any) => ({
					id: med.id,
					name: med.medicine_name || '',
					strength: med.dosage || '',
					quantity: med.current_stock || 0,
					lowStockThreshold: 5, // Default low stock threshold
					frequencyText: med.frequency || '',
					nextDoseISO: undefined // Can be calculated based on frequency if needed
				}));
				setMedicines(mappedMedicines);
			}
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
		const byQuery = (m: Medicine) =>
			q.length === 0 || m.name.toLowerCase().includes(q) || m.strength.toLowerCase().includes(q);

		const isDueToday = (m: Medicine) => {
			if (!m.nextDoseISO) return false;
			const d = new Date(m.nextDoseISO);
			return d.toDateString() === todayStr;
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

		return list.filter(byQuery);
	}, [medicines, search, activeTab, todayStr]);

	const renderCard = ({ item }: { item: Medicine }) => {
		const low = item.quantity <= (item.lowStockThreshold ?? 5);
		const nextText = item.nextDoseISO
			? (() => {
				const d = new Date(item.nextDoseISO);
				const isToday = d.toDateString() === todayStr;
				const hh = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
				return `Next: ${hh} ${isToday ? "today" : "tomorrow"}`;
			})()
			: "";

		return (
			<View style={styles.card}>
				<View style={styles.cardRow}>
					<View style={styles.iconSquare}>
						<Image source={require("../../assets/medicineIcon.png")} style={styles.iconImg} resizeMode="contain" />
					</View>
					<View style={styles.cardContent}>
						<View style={styles.cardHeader}>
							<Text style={styles.cardTitle}>{item.name}</Text>
							{low ? (
								<View style={styles.lowBadge}><Text style={styles.lowBadgeText}>Low Stock</Text></View>
							) : null}
						</View>
						<Text style={styles.cardSub}>{item.strength}</Text>
						<View style={styles.metaRow}>
							<View style={styles.frequencyRow}>
								<Image source={require("../../assets/timeIcon.png")} style={styles.timeIcon} resizeMode="contain" />
								<Text style={styles.metaText}>{item.frequencyText}</Text>
							</View>
							{nextText ? (
								<View style={styles.nextDoseRow}>
									<Text style={[styles.metaText, styles.nextText]}>{nextText}</Text>
								</View>
							) : null}
						</View>
						<Text style={[styles.stockText, low ? styles.stockLow : undefined]}>{item.quantity} pills left</Text>
					</View>
				</View>
			</View>
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
				<Pressable style={styles.filterBtn}>
					<Image source={require("../../assets/filterIcon.png")} style={styles.filterIcon} />
				</Pressable>
			</View>

			<View style={styles.tabs}>
				<TabButton label="All" active={activeTab === "ALL"} onPress={() => setActiveTab("ALL")} />
				<TabButton label="Due Today" active={activeTab === "DUE_TODAY"} onPress={() => setActiveTab("DUE_TODAY")} />
				<TabButton label="Low Stock" active={activeTab === "LOW_STOCK"} onPress={() => setActiveTab("LOW_STOCK")} />
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
		<SafeAreaView style={styles.page}>
			<LinearGradient style={styles.gradient} locations={[0,0.5,1]} colors={["#f8fafc","rgba(239, 246, 255, 0.3)","rgba(236, 254, 255, 0.2)"]}>
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
	nextDoseRow: {
		flexDirection: "row",
		alignItems: "center"
	},
	metaText: {
		fontSize: 12,
		color: "#64748b"
	},
	nextText: {
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
	}
});

export default ActiveMeds;