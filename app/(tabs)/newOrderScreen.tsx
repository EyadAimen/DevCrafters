import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

type PharmacyMedicine = {
  id: string;
  referenceId: string;
  name: string;
  genericName: string;
  dosage: string;
  category: string;
  price: number;
  stock: number;
};

const cartIcon = require("../../assets/cart.png");
const medicineIcon = require("../../assets/medicineIcon.png");
const backArrow = require("../../assets/backArrow.png");
const searchIcon = require("../../assets/searchIcon.png");
const forwardIcon = require("../../assets/forwardIcon.png");

const NewOrderScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const pharmacyId = Array.isArray(params.pharmacyId)
    ? params.pharmacyId[0]
    : params.pharmacyId;
  const pharmacyName = Array.isArray(params.pharmacyName)
    ? params.pharmacyName[0]
    : params.pharmacyName;
  const pharmacyAddress = Array.isArray(params.pharmacyAddress)
    ? params.pharmacyAddress[0]
    : params.pharmacyAddress;

  const [medicines, setMedicines] = useState<PharmacyMedicine[]>([]);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState<{ id: string; value: string } | null>(null);

  const fetchInventory = useCallback(async () => {
    if (!pharmacyId) {
      setLoading(false);
      setRefreshing(false);
      Alert.alert("Select pharmacy", "Please choose a pharmacy from the locator first.");
      return;
    }

    try {
      setLoading(true);
      setRefreshing(false);

      const {
        data: { user }
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: inventoryData, error: inventoryError } = await supabase
        .from("pharmacy_medicine")
        .select("id, pharmacy_id, reference_id, price, stock")
        .eq("pharmacy_id", pharmacyId)
        .order("id", { ascending: true });

      if (inventoryError) {
        throw inventoryError;
      }

      const referenceIds = (inventoryData ?? [])
        .map(item => item.reference_id)
        .filter(Boolean);

      let referenceMap = new Map<string, any>();

      if (referenceIds.length > 0) {
        const { data: referenceData, error: referenceError } = await supabase
          .from("medicine_reference")
          .select("drug_id, medicine_name, generic_name, dosage, category")
          .in("drug_id", referenceIds);

        if (referenceError) {
          throw referenceError;
        }

        referenceMap = new Map(
          (referenceData ?? []).map(ref => [String(ref.drug_id), ref])
        );
      }

      const mappedMedicines: PharmacyMedicine[] = (inventoryData ?? []).map(item => {
        const reference = referenceMap.get(String(item.reference_id));

        return {
          id: String(item.id),
          referenceId: String(item.reference_id),
          name: reference?.medicine_name ?? "Unnamed medicine",
          genericName: reference?.generic_name ?? "",
          dosage: reference?.dosage ?? "",
          category: reference?.category ?? "Other",
          price: Number(item.price) || 0,
          stock: Number(item.stock) || 0
        };
      });

      setMedicines(mappedMedicines);

      if (user && mappedMedicines.length > 0) {
        const medicineIds = mappedMedicines.map(item => item.id);
        const { data: cartData, error: cartError } = await supabase
          .from("cart_item")
          .select("pharmacy_medicine_id, quantity")
          .eq("user_id", user.id)
          .in("pharmacy_medicine_id", medicineIds);

        if (cartError) {
          throw cartError;
        }

        const nextCart: Record<string, number> = {};
        (cartData ?? []).forEach(row => {
          if (row.pharmacy_medicine_id) {
            nextCart[String(row.pharmacy_medicine_id)] = Number(row.quantity) || 0;
          }
        });
        setCartQuantities(nextCart);
      } else {
        setCartQuantities({});
      }
    } catch (error) {
      console.error("Error loading pharmacy medicines:", error);
      Alert.alert(
        "Unable to load medicines",
        "Please pull to refresh or try again later."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pharmacyId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const cartCount = useMemo(() => {
    return Object.values(cartQuantities).reduce((sum, qty) => sum + qty, 0);
  }, [cartQuantities]);

  const cartTotal = useMemo(() => {
    return Object.entries(cartQuantities).reduce((sum, [id, qty]) => {
      const medicine = medicines.find(item => item.id === id);
      if (!medicine) return sum;
      return sum + medicine.price * qty;
    }, 0);
  }, [cartQuantities, medicines]);

  const categories = useMemo(() => {
    const unique = new Set(
      medicines
        .map(item => item.category?.trim())
        .filter(category => category && category.length > 0)
    );
    return ["All", ...Array.from(unique)];
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    const text = search.trim().toLowerCase();
    return medicines.filter(item => {
      const matchesSearch =
        !text ||
        item.name.toLowerCase().includes(text) ||
        item.genericName.toLowerCase().includes(text);
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [medicines, search, selectedCategory]);

  const requireAuthentication = useCallback(() => {
    if (userId) {
      return true;
    }
    Alert.alert(
      "Login required",
      "Please sign in to manage your cart.",
      [{ text: "OK" }]
    );
    return false;
  }, [userId]);

  const modifyCart = useCallback(
    async (medicineId: string, nextQuantity: number, showAlert: boolean = false) => {
      if (!requireAuthentication()) {
        return;
      }

      const medicine = medicines.find(item => item.id === medicineId);
      if (!medicine) {
        return;
      }

      if (nextQuantity > medicine.stock) {
        Alert.alert(
          "Insufficient stock",
          `Only ${medicine.stock} unit${
            medicine.stock === 1 ? "" : "s"
          } available for ${medicine.name}.`
        );
        return;
      }

      const wasInCart = (cartQuantities[medicineId] ?? 0) > 0;
      const isAdding = !wasInCart && nextQuantity > 0;
      const isRemoving = wasInCart && nextQuantity <= 0;

      try {
        setSyncingId(medicineId);

        if (nextQuantity <= 0) {
          await supabase
            .from("cart_item")
            .delete()
            .eq("user_id", userId)
            .eq("pharmacy_medicine_id", medicineId);

          setCartQuantities(prev => {
            const next = { ...prev };
            delete next[medicineId];
            return next;
          });

          if (showAlert && isRemoving) {
            Alert.alert("Removed Medicine Successfully");
          }
        } else {
          await supabase
            .from("cart_item")
            .upsert(
              {
                user_id: userId,
                pharmacy_medicine_id: medicineId,
                quantity: nextQuantity
              },
              { onConflict: "user_id,pharmacy_medicine_id" }
            );

          setCartQuantities(prev => ({
            ...prev,
            [medicineId]: nextQuantity
          }));

          if (showAlert && isAdding) {
            Alert.alert("Added Medicine Successfully");
          }
        }
      } catch (error) {
        console.error("Error updating cart:", error);
        Alert.alert("Unable to update cart", "Please try again in a moment.");
      } finally {
        setSyncingId(null);
      }
    },
    [medicines, requireAuthentication, userId, cartQuantities]
  );

  const handleQuantityInput = useCallback(
    async (medicineId: string, inputValue: string) => {
      const numValue = parseInt(inputValue, 10);
      if (isNaN(numValue) || numValue < 0) {
        return;
      }
      const medicine = medicines.find(item => item.id === medicineId);
      if (!medicine) return;
      const finalQuantity = Math.min(numValue, medicine.stock);
      await modifyCart(medicineId, finalQuantity, true);
      setEditingQuantity(null);
    },
    [medicines, modifyCart]
  );

  const removeFromCart = useCallback(
    async (medicineId: string) => {
      await modifyCart(medicineId, 0, true);
    },
    [modifyCart]
  );

  const handleProceedToPayment = () => {
    if (cartCount === 0) {
      Alert.alert("Cart empty", "Add at least one medication to continue.");
      return;
    }

    // Navigate to analytics page and remove current page from stack
    router.replace("/handlePayment");
  };

  const renderMedicineCard = (item: PharmacyMedicine) => {
    const quantity = cartQuantities[item.id] ?? 0;
    const inCart = quantity > 0;
    const loadingThisCard = syncingId === item.id;

    return (
      <View
        key={item.id}
        style={[styles.card, inCart ? styles.cardSelected : undefined]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconWrapper}>
            <View style={styles.iconCircle}>
              <Image source={medicineIcon} style={styles.medicineIcon} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.medicineName}>{item.name}</Text>
                <Text style={styles.medicineSubtitle}>
                  {item.genericName} • {item.dosage}
                </Text>
              </View>
              <View style={styles.priceWrapper}>
                <Text style={styles.price}>RM {item.price.toFixed(2)}</Text>
                <Text style={styles.stockText}>
                  Stock: {item.stock.toString()}
                </Text>
              </View>
            </View>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{item.category || "Other"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {inCart ? (
            <View style={styles.quantityControls}>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => modifyCart(item.id, quantity - 1, false)}
                  disabled={loadingThisCard}
                  activeOpacity={0.8}
                >
                  <Text style={styles.qtyButtonText}>−</Text>
                </TouchableOpacity>
                {editingQuantity?.id === item.id ? (
                  <TextInput
                    style={styles.qtyInput}
                    value={editingQuantity.value}
                    onChangeText={(text) => {
                      const num = text.replace(/[^0-9]/g, '');
                      setEditingQuantity({ id: item.id, value: num });
                    }}
                    onBlur={() => {
                      if (editingQuantity) {
                        handleQuantityInput(item.id, editingQuantity.value);
                      }
                    }}
                    onSubmitEditing={() => {
                      if (editingQuantity) {
                        handleQuantityInput(item.id, editingQuantity.value);
                      }
                    }}
                    keyboardType="numeric"
                    selectTextOnFocus
                    autoFocus
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => setEditingQuantity({ id: item.id, value: quantity.toString() })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.qtyText}>{loadingThisCard ? "…" : quantity}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => modifyCart(item.id, quantity + 1, false)}
                  disabled={loadingThisCard || quantity >= item.stock}
                  activeOpacity={0.8}
                >
                  <Text style={styles.qtyButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => removeFromCart(item.id)}
                disabled={loadingThisCard}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.addButton,
                item.stock === 0 ? styles.addButtonDisabled : undefined
              ]}
              onPress={() => modifyCart(item.id, 1, true)}
              disabled={item.stock === 0 || loadingThisCard}
              activeOpacity={0.85}
            >
              {loadingThisCard ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.addButtonText}>+ Add to cart</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: cartCount > 0 ? 200 : 120 }
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/pharmacyLocator")}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Image source={backArrow} style={styles.backIcon} resizeMode="contain" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>New Order</Text>
            <Text style={styles.headerSubtitle}>
              {pharmacyName ?? "Choose a pharmacy"}
            </Text>
          </View>

          <View style={styles.cartIconWrapper}>
            <Image source={cartIcon} style={styles.cartIcon} resizeMode="contain" />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.pharmacyCard}>
          <View style={styles.pharmacyIconWrapper}>
            <View style={styles.iconCircle}>
              <Image source={medicineIcon} style={styles.medicineIcon} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pharmacyName}>{pharmacyName ?? "No pharmacy selected"}</Text>
            <Text style={styles.pharmacyAddress}>
              {pharmacyAddress ?? "Select a pharmacy from Find Pharmacies"}
            </Text>
          </View>
        </View>

        <View style={[styles.searchWrapper, isSearchFocused && styles.searchWrapperFocused]}>
          <Image source={searchIcon} style={styles.searchIcon} resizeMode="contain" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>

        {categories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {categories.map(category => {
              const selected = category === selectedCategory;
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryPill, selected && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(category)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      selected && styles.categoryPillTextActive
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available medicines</Text>
          <Text style={styles.sectionSubtitle}>
            {loading ? "..." : `${filteredMedicines.length} item${filteredMedicines.length === 1 ? "" : "s"}`}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading pharmacy catalog...</Text>
          </View>
        ) : filteredMedicines.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No medicines found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or category filters.
            </Text>
          </View>
        ) : (
          filteredMedicines.map(renderMedicineCard)
        )}
      </ScrollView>

      {cartCount > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Total Items</Text>
              <Text style={styles.summarySubtitle}>
                {cartCount} item{cartCount === 1 ? "" : "s"} in cart
              </Text>
            </View>
            <View style={styles.totalWrapper}>
              <Text style={styles.summaryTotal}>RM {cartTotal.toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleProceedToPayment}
            activeOpacity={0.9}
          >
            <Text style={styles.checkoutButtonText}>Proceed to payment</Text>
            <Image source={forwardIcon} style={styles.forwardIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
};

export default NewOrderScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffffffaa",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  backIcon: {
    width: 16,
    height: 16,
    tintColor: "#0F172A"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A"
  },
  headerSubtitle: {
    color: "#64748B",
    marginTop: 2
  },
  cartIconWrapper: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    position: "relative"
  },
  cartIcon: {
    width: 48,
    height: 48
  },
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  pharmacyCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16
  },
  pharmacyIconWrapper: {
    marginRight: 14
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center"
  },
  medicineIcon: {
    width: 24,
    height: 24,
    tintColor: "#fff"
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A"
  },
  pharmacyAddress: {
    marginTop: 4,
    color: "#64748B"
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
    borderWidth: 0
  },
  searchWrapperFocused: {
    borderWidth: 2,
    borderColor: "#2563EB"
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: "#2563EB",
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A"
  },
  categories: {
    paddingVertical: 4,
    marginBottom: 12
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    marginRight: 8
  },
  categoryPillActive: {
    backgroundColor: "#2563EB"
  },
  categoryPillText: {
    color: "#0F172A",
    fontWeight: "500"
  },
  categoryPillTextActive: {
    color: "#fff"
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A"
  },
  sectionSubtitle: {
    color: "#94A3B8"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2
  },
  cardSelected: {
    borderColor: "#2563EB33",
    backgroundColor: "#EFF6FF"
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12
  },
  iconWrapper: {
    marginRight: 14
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A"
  },
  medicineSubtitle: {
    marginTop: 4,
    color: "#64748B"
  },
  priceWrapper: {
    alignItems: "flex-end"
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB"
  },
  stockText: {
    marginTop: 4,
    color: "#94A3B8",
    fontSize: 12
  },
  categoryChip: {
    alignSelf: "flex-start",
    marginTop: 8,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999
  },
  categoryChipText: {
    color: "#0369A1",
    fontWeight: "600",
    fontSize: 12
  },
  cardFooter: {
    marginTop: 12,
    alignItems: "flex-end"
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-end"
  },
  addButtonDisabled: {
    backgroundColor: "#94A3B8"
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A"
  },
  qtyText: {
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    minWidth: 30,
    textAlign: "center"
  },
  qtyInput: {
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    minWidth: 30,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#2563EB"
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5"
  },
  cancelButtonText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600"
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: "center"
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B"
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8
  },
  emptySubtitle: {
    color: "#64748B",
    textAlign: "center"
  },
  summaryCard: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8
  },
  summaryHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A"
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  summaryLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500"
  },
  summarySubtitle: {
    color: "#94A3B8",
    marginTop: 4,
    fontSize: 12
  },
  totalWrapper: {
    alignItems: "flex-end"
  },
  summaryTotal: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB"
  },
  checkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    borderRadius: 18,
    paddingVertical: 12
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8
  },
  forwardIcon: {
    width: 18,
    height: 18,
    tintColor: "#FFFFFF"
  }
});