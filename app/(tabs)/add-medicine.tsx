import * as React from "react";
import {useState} from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
	Pressable,
	Alert,
	Platform,
	Image
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import BottomNavigation from "../../components/BottomNavigation";

const frequencyOptions = [
	"Once daily",
	"Twice daily",
	"Three times daily",
	"Four times daily",
	"Once daily at bedtime",
	"Every other day",
	"As needed"
];

const AddMedicine = () => {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		genericName: "",
		dosage: "",
		frequency: "",
		stock: "",
		specialInstructions: "",
		expiryDate: ""
	});

	const handleInputChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async () => {
		// Validation
		if (!formData.name.trim()) {
			Alert.alert("Error", "Medicine name is required");
			return;
		}
		if (!formData.dosage.trim()) {
			Alert.alert("Error", "Dosage is required");
			return;
		}
		if (!formData.frequency) {
			Alert.alert("Error", "Frequency is required");
			return;
		}
		if (!formData.stock.trim() || isNaN(Number(formData.stock))) {
			Alert.alert("Error", "Please enter a valid stock quantity");
			return;
		}

		setLoading(true);
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) {
				Alert.alert("Error", "Please log in to add medications");
				router.push("/login");
				return;
			}

			// Prepare data for Supabase using actual database schema
			// Ensure dosage has "mg" suffix - formData.dosage should only contain numbers
			let dosageValue = formData.dosage.trim().replace(/[^0-9]/g, '');
			if (dosageValue) {
				dosageValue = dosageValue + "mg";
			}
			
			const medicineData: any = {
				user_id: user.id,
				medicine_name: formData.name.trim(),
				dosage: dosageValue,
				frequency: formData.frequency,
				current_stock: parseInt(formData.stock, 10),
			};

			// Add optional fields
			if (formData.genericName.trim()) {
				medicineData.generic_name = formData.genericName.trim();
			}
			if (formData.specialInstructions.trim()) {
				medicineData.special_instructions = formData.specialInstructions.trim();
			}
			// Only add expiry_date if it's provided and properly formatted
			// Skip expiry_date if validation fails (it's optional)
			if (formData.expiryDate.trim()) {
				medicineData.expiry_date = formData.expiryDate.trim();
			}

			const { error } = await supabase
				.from('medicines')
				.insert([medicineData]);

			if (error) {
				console.error('Error adding medicine:', error);
				Alert.alert("Error", error.message || "Failed to add medication");
			} else {
				Alert.alert("Success", "Medication added successfully!", [
					{
						text: "OK",
						onPress: () => router.back()
					}
				]);
			}
		} catch (error: any) {
			console.error('Error:', error);
			// Handle network errors
			if (error.message?.includes('Network request failed') || 
				error.message?.includes('fetch') || 
				error.code === 'ECONNABORTED' ||
				error.name === 'TypeError') {
				Alert.alert("Network Error", "Unable to connect to the server. Please check your internet connection and try again.");
			} else {
				Alert.alert("Error", "Something went wrong. Please try again.");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<LinearGradient
				style={styles.gradient}
				locations={[0, 0.5, 1]}
				colors={["#f8fafc", "rgba(239, 246, 255, 0.3)", "rgba(236, 254, 255, 0.2)"]}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Card Container */}
					<View style={styles.cardContainer}>
						{/* Header */}
						<View style={styles.header}>
							<Pressable onPress={() => router.back()} style={styles.backButton}>
								<Text style={styles.backButtonText}>✕</Text>
							</Pressable>
							<View style={styles.placeholder} />
						</View>

						{/* Title Section */}
						<View style={styles.titleSection}>
							<Image 
								source={require("../../assets/medicineIcon.png")} 
								style={styles.iconImg} 
								resizeMode="contain" 
							/>
							<View style={styles.titleContainer}>
								<Text style={styles.title}>Add Medication</Text>
								<Text style={styles.subtitle}>
									Enter the details of your medication to add it to your list.
								</Text>
							</View>
						</View>

						{/* Form */}
						<View style={styles.form}>
						{/* Medicine Name */}
						<View style={styles.fieldContainer}>
							<View style={styles.labelRow}>
								<Text style={styles.label}>Medicine Name</Text>
								<Text style={styles.required}>*</Text>
							</View>
							<TextInput
								style={styles.input}
								placeholder="e.g., Lisinopril"
								placeholderTextColor="#64748b"
								value={formData.name}
								onChangeText={(value) => handleInputChange("name", value)}
							/>
						</View>

						{/* Generic Name */}
						<View style={styles.fieldContainer}>
							<Text style={styles.label}>Generic Name (Optional)</Text>
							<TextInput
								style={styles.input}
								placeholder="e.g., Lisinopril"
								placeholderTextColor="#64748b"
								value={formData.genericName}
								onChangeText={(value) => handleInputChange("genericName", value)}
							/>
						</View>

						{/* Dosage */}
						<View style={styles.fieldContainer}>
							<View style={styles.labelRow}>
								<Text style={styles.label}>Dosage</Text>
								<Text style={styles.required}>*</Text>
							</View>
							<View style={styles.dosageInputContainer}>
								<TextInput
									style={styles.dosageInput}
									placeholder="e.g., 10"
									placeholderTextColor="#64748b"
									value={formData.dosage.replace(/mg$/i, '').trim()}
									onChangeText={(value) => {
										// Only allow numeric input
										const numericValue = value.replace(/[^0-9]/g, '');
										handleInputChange("dosage", numericValue);
									}}
									keyboardType="numeric"
								/>
								<Text style={styles.dosageUnit}>mg</Text>
							</View>
						</View>

						{/* Frequency */}
						<View style={styles.fieldContainer}>
							<View style={styles.labelRow}>
								<Text style={styles.label}>Frequency</Text>
								<Text style={styles.required}>*</Text>
							</View>
							<Pressable
								style={styles.selectInput}
								onPress={() => setShowFrequencyPicker(!showFrequencyPicker)}
							>
								<Text style={[styles.selectText, !formData.frequency && styles.placeholderText]}>
									{formData.frequency || "Select frequency"}
								</Text>
								<Text style={styles.selectIcon}>▼</Text>
							</Pressable>
							{showFrequencyPicker && (
								<View style={styles.pickerContainer}>
									{frequencyOptions.map((option, index) => (
										<Pressable
											key={`${option}-${index}`}
											style={styles.pickerOption}
											onPress={() => {
												handleInputChange("frequency", option);
												setShowFrequencyPicker(false);
											}}
										>
											<Text style={styles.pickerOptionText}>{option}</Text>
										</Pressable>
									))}
								</View>
							)}
						</View>

						{/* Current Stock */}
						<View style={styles.fieldContainer}>
							<View style={styles.labelRow}>
								<Text style={styles.label}>Current Stock (pills/doses)</Text>
								<Text style={styles.required}>*</Text>
							</View>
							<TextInput
								style={styles.input}
								placeholder="e.g., 30"
								placeholderTextColor="#64748b"
								value={formData.stock}
								onChangeText={(value) => handleInputChange("stock", value)}
								keyboardType="numeric"
							/>
						</View>

						{/* Expiry Date */}
						<View style={styles.fieldContainer}>
							<Text style={styles.label}>Expiry Date</Text>
							<TextInput
								style={styles.input}
								placeholder="YYYY-MM-DD"
								placeholderTextColor="#64748b"
								value={formData.expiryDate}
								onChangeText={(value) => handleInputChange("expiryDate", value)}
							/>
							<Text style={styles.hint}>Format: YYYY-MM-DD (e.g., 2025-12-31)</Text>
						</View>

						{/* Special Instructions */}
						<View style={styles.fieldContainer}>
							<Text style={styles.label}>Special Instructions (Optional)</Text>
							<TextInput
								style={styles.input}
								placeholder="e.g., Take with food"
								placeholderTextColor="#64748b"
								value={formData.specialInstructions}
								onChangeText={(value) => handleInputChange("specialInstructions", value)}
								multiline
								numberOfLines={3}
							/>
						</View>

						{/* Buttons */}
						<View style={styles.buttonRow}>
							<Pressable
								style={[styles.button, styles.cancelButton]}
								onPress={() => router.back()}
								disabled={loading}
							>
								<Text style={styles.cancelButtonText}>Cancel</Text>
							</Pressable>
							<Pressable
								style={[styles.button, styles.submitButton]}
								onPress={handleSubmit}
								disabled={loading}
							>
								<Text style={styles.submitButtonText}>
									{loading ? "Adding..." : "Add Medication"}
								</Text>
							</Pressable>
						</View>
					</View>
					</View>
				</ScrollView>
			</LinearGradient>
			<BottomNavigation />
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	gradient: {
		flex: 1
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 100
	},
	cardContainer: {
		backgroundColor: "#fff",
		borderRadius: 20,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 16
	},
	backButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center"
	},
	backButtonText: {
		fontSize: 20,
		color: "#0f172a",
		fontWeight: "600"
	},
	placeholder: {
		width: 32
	},
	titleSection: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 24
	},
	iconImg: {
		width: 48,
		height: 48,
		tintColor: "#0ea5e9"
	},
	titleContainer: {
		flex: 1,
		gap: 4
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		color: "#0f172a"
	},
	subtitle: {
		fontSize: 14,
		color: "#64748b",
		lineHeight: 20
	},
	form: {
		gap: 16
	},
	fieldContainer: {
		gap: 6
	},
	labelRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4
	},
	label: {
		fontSize: 12,
		color: "#0f172a",
		fontWeight: "500"
	},
	required: {
		fontSize: 12,
		color: "#ef4444"
	},
	input: {
		backgroundColor: "#f8fafc",
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		color: "#0f172a",
		borderWidth: 1.3,
		borderColor: "rgba(0, 0, 0, 0)",
		minHeight: 36
	},
	dosageInputContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f8fafc",
		borderRadius: 14,
		borderWidth: 1.3,
		borderColor: "rgba(0, 0, 0, 0)",
		minHeight: 36,
		paddingRight: 12
	},
	dosageInput: {
		flex: 1,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		color: "#0f172a"
	},
	dosageUnit: {
		fontSize: 14,
		color: "#64748b",
		fontWeight: "500"
	},
	selectInput: {
		backgroundColor: "#f8fafc",
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		borderWidth: 1.3,
		borderColor: "rgba(0, 0, 0, 0)",
		minHeight: 36
	},
	selectText: {
		fontSize: 14,
		color: "#0f172a"
	},
	placeholderText: {
		color: "#64748b"
	},
	selectIcon: {
		fontSize: 12,
		color: "#64748b"
	},
	pickerContainer: {
		backgroundColor: "#fff",
		borderRadius: 14,
		marginTop: 4,
		borderWidth: 1,
		borderColor: "#e2e8f0",
		overflow: "hidden"
	},
	pickerOption: {
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#f1f5f9"
	},
	pickerOptionText: {
		fontSize: 14,
		color: "#0f172a"
	},
	hint: {
		fontSize: 11,
		color: "#64748b",
		marginTop: 4
	},
	buttonRow: {
		flexDirection: "row",
		gap: 8,
		marginTop: 12
	},
	button: {
		flex: 1,
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: "center",
		justifyContent: "center"
	},
	cancelButton: {
		backgroundColor: "#f8fafc",
		borderWidth: 1.3,
		borderColor: "#e2e8f0"
	},
	cancelButtonText: {
		fontSize: 14,
		color: "#0f172a",
		fontWeight: "500"
	},
	submitButton: {
		backgroundColor: "#0ea5e9"
	},
	submitButtonText: {
		fontSize: 14,
		color: "#fff",
		fontWeight: "600"
	}
});

export default AddMedicine;
