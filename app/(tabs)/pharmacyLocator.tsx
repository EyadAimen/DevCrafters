import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

type PharmacyRecord = {
  pharmacy_id: number | string; // Primary key from database (bigint)
  pharmacy_name: string;
  pharmacy_address: string;
  pharmacy_phone?: string;
  services?: string[] | string; // Can be array or comma-separated string
  google_rating?: number;
  google_rating_count?: number;
  google_is_open?: boolean;
  google_distance_km?: number;
  google_is_24_7?: boolean;
  latitude?: number;
  longtitude?: number; // Note: database uses 'longtitude' not 'longitude'
};

type Pharmacy = {
  id: string;
  name: string;
  address: string;
  phone: string;
  workingHours: string;
  services: string[];
  rating: number | null;
  ratingCount: number | null;
  isOpen: boolean | null;
  distanceKm: number | null;
  is247: boolean;
  latitude?: number;
  longitude?: number;
};

type FavoriteRecord = {
  id: string;
  pharmacy_id: string;
  pharmacy?: PharmacyRecord;
};

type QuickFilter = "nearest" | "open" | "top" | "247" | null;

const locationGreen = require("../../assets/locationGreen.png");
const nearestIcon = require("../../assets/nearest.png");
const clockIcon = require("../../assets/clockIcon.png");
const topRatedIcon = require("../../assets/topRated.png");
const ratedStar = require("../../assets/ratedStar.png");
const locationBlue = require("../../assets/locationBlue.png");
const directionIcon = require("../../assets/direction.png");
const callIcon = require("../../assets/call.png");
const quickTip = require("../../assets/quickTip.png");
const backArrow = require("../../assets/backArrow.png");
const searchIcon = require("../../assets/searchIcon.png");
const forwardIcon = require("../../assets/forwardIcon.png");
const favouriteIcon = require("../../assets/favouriteIcon.png");

export default function PharmacyLocator() {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [favorites, setFavorites] = useState<Pharmacy[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [pressedButton, setPressedButton] = useState<{ pharmacyId: string; button: "directions" | "call" } | null>(null);
  const [favoritePharmacyIds, setFavoritePharmacyIds] = useState<Set<string>>(new Set());
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);

  const mapRecord = (record: PharmacyRecord): Pharmacy => {
    let servicesArray: string[] = [];
    const servicesValue = record.services;
    if (Array.isArray(servicesValue)) {
      servicesArray = servicesValue;
    } else if (typeof servicesValue === "string") {
      // Check if it's a comma-separated string
      if (servicesValue.includes(",")) {
        servicesArray = servicesValue.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      } else {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(servicesValue);
          servicesArray = Array.isArray(parsed) ? parsed : [servicesValue];
        } catch {
          servicesArray = [servicesValue];
        }
      }
    }

    return {
      id: String(record.pharmacy_id || ""),
      name: record.pharmacy_name || "",
      address: record.pharmacy_address || "",
      phone: record.pharmacy_phone || "Not available",
      workingHours: "Hours not provided",
      services: servicesArray,
      rating: typeof record.google_rating === "number" ? record.google_rating : null,
      ratingCount: typeof record.google_rating_count === "number" ? record.google_rating_count : null,
      isOpen: typeof record.google_is_open === "boolean" ? record.google_is_open : null,
      distanceKm: typeof record.google_distance_km === "number" ? record.google_distance_km : null,
      is247: Boolean(record.google_is_24_7),
      latitude: record.latitude,
      longitude: record.longtitude // Map from 'longtitude' to 'longitude' in Pharmacy type
    };
  };

  const fetchPharmacies = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pharmacy")
        .select("*")
        .order("pharmacy_name", { ascending: true });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Fetched pharmacies count:", data?.length || 0);
      const mapped = (data || [])
        .map(mapRecord)
        .filter((pharmacy) => pharmacy.id && pharmacy.id.length > 0); // Filter out pharmacies without valid IDs
      console.log("Mapped pharmacies count:", mapped.length);
      setPharmacies(mapped);
    } catch (err) {
      console.error("Error fetching pharmacies:", err);
      Alert.alert("Unable to load pharmacies", "Please try again later.");
      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setFavorites([]);
        setFavoritePharmacyIds(new Set());
        return;
      }

      const { data, error } = await supabase
        .from("pharmacy_favourite")
        .select("id, pharmacy_id, pharmacy:pharmacy_id(*)")
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      type FavoriteRow = { id: string; pharmacy_id: string | number; pharmacy: PharmacyRecord | null };
      const favoriteRows: FavoriteRow[] = ((data ?? []) as unknown) as FavoriteRow[];

      const favoriteIds = new Set<string>(
        favoriteRows.map((fav) => String(fav.pharmacy_id))
      );
      setFavoritePharmacyIds(favoriteIds);

      const mapped = favoriteRows
        .map((fav) => (fav.pharmacy ? mapRecord(fav.pharmacy) : null))
        .filter((item): item is Pharmacy => Boolean(item));

      setFavorites(mapped);
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setFavorites([]);
      setFavoritePharmacyIds(new Set());
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPharmacies(), fetchFavorites()]);
    setRefreshing(false);
  }, [fetchFavorites, fetchPharmacies]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredList = useMemo(() => {
    const source = activeTab === "all" ? pharmacies : favorites;
    let list = source.filter((pharmacy) =>
      !query || pharmacy.name.toLowerCase().includes(query)
    );

    switch (selectedFilter) {
      case "nearest":
        list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
        break;
      case "open":
        list = list.filter((pharmacy) => pharmacy.isOpen);
        break;
      case "top":
        list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "247":
        list = list.filter((pharmacy) => pharmacy.is247);
        break;
      default:
        break;
    }

    return list;
  }, [activeTab, favorites, pharmacies, searchQuery, selectedFilter]);

  const handleDirections = (pharmacy: Pharmacy) => {
    const query =
      pharmacy.latitude && pharmacy.longitude
        ? `${pharmacy.latitude},${pharmacy.longitude}`
        : pharmacy.address;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Unable to open maps");
    });
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert("Unable to start call");
    });
  };

  const toggleFavorite = useCallback(async (pharmacyId: string) => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Login required", "Please sign in to add favorites.");
        return;
      }

      setTogglingFavorite(pharmacyId);
      const isFavorite = favoritePharmacyIds.has(pharmacyId);

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("pharmacy_favourite")
          .delete()
          .eq("user_id", user.id)
          .eq("pharmacy_id", pharmacyId);

        if (error) {
          throw error;
        }

        setFavoritePharmacyIds((prev) => {
          const next = new Set(prev);
          next.delete(pharmacyId);
          return next;
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("pharmacy_favourite")
          .insert({
            user_id: user.id,
            pharmacy_id: pharmacyId
          });

        if (error) {
          throw error;
        }

        setFavoritePharmacyIds((prev) => {
          const next = new Set(prev);
          next.add(pharmacyId);
          return next;
        });
      }

      // Refresh favorites list
      await fetchFavorites();
    } catch (err) {
      console.error("Error toggling favorite:", err);
      Alert.alert("Error", "Unable to update favorite. Please try again.");
    } finally {
      setTogglingFavorite(null);
    }
  }, [favoritePharmacyIds, fetchFavorites]);

  const renderServiceChip = (service: string) => (
    <View key={service} style={styles.serviceChip}>
      <Text style={styles.serviceText}>{service}</Text>
    </View>
  );

  const renderCard = (pharmacy: Pharmacy, index: number) => {
    const isSelected = selectedPharmacy === pharmacy.id;
    const uniqueKey = pharmacy.id || `pharmacy-unknown-${index}`;

    return (
      <TouchableOpacity
        key={`pharmacy-${uniqueKey}-${activeTab}-${index}`}
        activeOpacity={0.9}
        style={[styles.pharmacyCard, isSelected && styles.pharmacyCardSelected]}
        onPress={() => {
          const newSelection = isSelected ? null : pharmacy.id;
          setSelectedPharmacy(newSelection);
        }}
      >
        <View style={styles.cardHeader}>
          <Image source={locationBlue} style={styles.cardIconNoContainer} resizeMode="contain" />
          <View style={styles.cardTitleWrapper}>
            <View style={styles.cardTitleRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRowWithFavorite}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {pharmacy.name}
                  </Text>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavorite(pharmacy.id);
                    }}
                    disabled={togglingFavorite === pharmacy.id}
                    activeOpacity={0.7}
                    style={styles.favoriteButton}
                  >
                    {favoritePharmacyIds.has(pharmacy.id) ? (
                      <View style={styles.favoriteIconContainer}>
                        <Image
                          source={favouriteIcon}
                          style={styles.favoriteIconFilled}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      <Image
                        source={favouriteIcon}
                        style={styles.favoriteIcon}
                        resizeMode="contain"
                      />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.ratingRow}>
                  <Image source={ratedStar} style={styles.ratingIcon} resizeMode="contain" />
                  <Text style={styles.ratingText}>
                    {pharmacy.rating ? pharmacy.rating.toFixed(1) : "N/A"}
                  </Text>
                  <Text style={styles.ratingCount}>
                    ({pharmacy.ratingCount ?? 0})
                  </Text>
                </View>
              </View>
              <View style={styles.statusWrapper}>
                <View
                  style={[
                    styles.statusBadge,
                    pharmacy.isOpen ? styles.statusOpen : styles.statusClosed
                  ]}
                >
                  <Text style={styles.statusText}>
                    {pharmacy.isOpen ? "Open" : "Closed"}
                  </Text>
                </View>
                <Text style={styles.distanceText}>
                  {pharmacy.distanceKm ? `${pharmacy.distanceKm.toFixed(1)} km` : "–"}
                </Text>
              </View>
            </View>
            <View style={styles.addressRow}>
              <Image source={nearestIcon} style={styles.addressIcon} resizeMode="contain" />
              <Text style={styles.addressText} numberOfLines={2}>
                      {pharmacy.address}
              </Text>
            </View>
            <View style={styles.hoursRow}>
              <Image source={clockIcon} style={styles.timeIcon} resizeMode="contain" />
              <Text style={styles.hoursText}>{pharmacy.workingHours}</Text>
            </View>
          </View>
        </View>

        {pharmacy.services.length > 0 && (
          <View style={styles.servicesWrapper}>
            {pharmacy.services.map((service, serviceIndex) => (
              <View
                key={`service-${pharmacy.id}-${serviceIndex}`}
                style={[
                  styles.serviceChip,
                  isSelected && styles.serviceChipSelected
                ]}
              >
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.directionButton,
              isSelected && styles.actionButtonSelected,
              pressedButton?.pharmacyId === pharmacy.id && pressedButton?.button === "directions" && styles.directionButtonActive
            ]}
            onPressIn={() => setPressedButton({ pharmacyId: pharmacy.id, button: "directions" })}
            onPressOut={() => setPressedButton(null)}
            onPress={(e) => {
                      e.stopPropagation();
              handleDirections(pharmacy);
              setPressedButton(null);
            }}
            activeOpacity={1}
          >
            <Image
              source={directionIcon}
              style={[
                styles.actionIcon,
                pressedButton?.pharmacyId === pharmacy.id && pressedButton?.button === "directions" && styles.actionIconBlue
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.actionText,
                pressedButton?.pharmacyId === pharmacy.id && pressedButton?.button === "directions" && styles.actionTextBlue
              ]}
            >
                    Directions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.callButton,
              isSelected && styles.actionButtonSelected,
              pressedButton?.pharmacyId === pharmacy.id && pressedButton?.button === "call" && styles.callButtonActive
            ]}
            onPressIn={() => setPressedButton({ pharmacyId: pharmacy.id, button: "call" })}
            onPressOut={() => setPressedButton(null)}
            onPress={(e) => {
                      e.stopPropagation();
                      handleCall(pharmacy.phone);
              setPressedButton(null);
            }}
            activeOpacity={1}
          >
            <Image
              source={callIcon}
              style={[
                styles.actionIcon,
                pressedButton?.pharmacyId === pharmacy.id && pressedButton?.button === "call" && styles.actionIconGreen
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.actionText,
                pressedButton?.pharmacyId === pharmacy.id && pressedButton?.button === "call" && styles.actionTextGreen
              ]}
            >
              Call
            </Text>
          </TouchableOpacity>
        </View>

        {isSelected && (
          <View style={styles.expandedSection}>
            <View style={styles.expandedRow}>
              <Image source={callIcon} style={styles.expandedIconGrey} resizeMode="contain" />
              <Text style={styles.expandedTextGrey}>{pharmacy.phone}</Text>
            </View>
            <View style={styles.expandedRow}>
              <Image source={nearestIcon} style={styles.expandedIconGrey} resizeMode="contain" />
              <Text style={styles.expandedTextGrey}>{pharmacy.address}</Text>
            </View>
            <TouchableOpacity
              style={styles.orderButton}
              activeOpacity={0.9}
              onPress={() =>
                router.push({
                  pathname: "/newOrderScreen",
                  params: {
                    pharmacyId: pharmacy.id,
                    pharmacyName: pharmacy.name,
                    pharmacyAddress: pharmacy.address
                  }
                })
              }
            >
              <Text style={styles.orderButtonText}>New Order</Text>
              <Image source={forwardIcon} style={styles.forwardIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (
    <View style={styles.emptyState}>
      <Image source={locationBlue} style={styles.emptyIcon} resizeMode="contain" />
      <Text style={styles.emptyTitle}>No pharmacies found</Text>
      <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
    </View>
  );

  const quickFilters = [
    {
      key: "nearest",
      label: "Nearest",
      filter: "nearest" as QuickFilter,
      icon: nearestIcon,
      backgroundColor: "#E0F2FE",
      textColor: "#1D4ED8",
      iconTint: "#1D4ED8"
    },
    {
      key: "open",
      label: "Open now",
      filter: "open" as QuickFilter,
      icon: clockIcon,
      backgroundColor: "#DCFCE7",
      textColor: "#047857",
      iconTint: "#10B981"
    },
    {
      key: "top",
      label: "Top rated",
      filter: "top" as QuickFilter,
      icon: topRatedIcon,
      backgroundColor: "#FFF7ED",
      textColor: "#C2410C",
      iconTint: "#EA580C"
    },
    {
      key: "247",
      label: "24/7",
      filter: "247" as QuickFilter,
      icon: null,
      backgroundColor: "#EDE9FE",
      textColor: "#7C3AED",
      iconTint: undefined
    }
  ];

  const renderListHeader = () => (
    <>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={() => router.push("/home")}>
          <Image source={backArrow} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Find Pharmacies</Text>
          <Text style={styles.headerSubtitle}>Discover nearby partners</Text>
        </View>
        <Image source={locationGreen} style={styles.headerIcon} resizeMode="contain" />
      </View>

      <View style={[styles.searchWrapper, isSearchFocused && styles.searchWrapperFocused]}>
        <Image source={searchIcon} style={styles.searchIcon} resizeMode="contain" />
        <TextInput
          placeholder="Search pharmacies..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={quickFilters}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickFilterList}
        renderItem={({ item }) => {
          const isSelected = selectedFilter === item.filter;
          return (
            <TouchableOpacity
              style={[
                styles.quickFilter,
                { backgroundColor: isSelected ? item.backgroundColor : item.backgroundColor },
                isSelected && { borderColor: item.textColor, borderWidth: 2 }
              ]}
              onPress={() =>
                setSelectedFilter(selectedFilter === item.filter ? null : item.filter)
              }
            >
              {item.icon ? (
                <Image
                  source={item.icon}
                  style={[styles.quickFilterIcon, { tintColor: isSelected ? item.iconTint : item.iconTint }]}
                  resizeMode="contain"
                />
              ) : null}
              <Text
                style={[
                  styles.quickFilterText,
                  {
                    color: isSelected ? item.textColor : item.textColor,
                    fontWeight: isSelected ? "700" : "500"
                  }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.mapCard}>
        <View style={styles.mapCardContent}>
          <Image source={locationBlue} style={styles.mapIcon} resizeMode="contain" />
          <Text style={styles.mapTitle}>Interactive Map</Text>
          <Text style={styles.mapSubtitle}>Tap to view in Google Maps</Text>
        </View>
        <View style={styles.mapCardFooter}>
          <TouchableOpacity
            style={styles.openMapButton}
            activeOpacity={0.8}
            onPress={() =>
              Linking.openURL("https://www.google.com/maps/search/pharmacy+near+me").catch(() =>
                Alert.alert("Unable to open map")
              )
            }
          >
            <Image source={directionIcon} style={styles.openMapIcon} resizeMode="contain" />
            <Text style={styles.openMapText}>Open Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "all" && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab("all");
            setSelectedPharmacy(null);
          }}
        >
          <Text
            style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}
          >{`All Pharmacies (${activeTab === "all" ? filteredList.length : pharmacies.length})`}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "favorites" && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab("favorites");
            setSelectedPharmacy(null);
          }}
        >
          <Text style={[styles.tabText, activeTab === "favorites" && styles.tabTextActive]}>
            {`Favorites (${activeTab === "favorites" ? filteredList.length : favorites.length})`}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredList}
        keyExtractor={(item, index) => `pharmacy-${item.id || `unknown-${index}`}-${activeTab}-${index}`}
        renderItem={({ item, index }) => renderCard(item, index)}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color="#2563EB" />
          ) : (
            renderEmptyState
          )
        }
        ListFooterComponent={
          <View style={styles.tipCard}>
            <Image source={quickTip} style={styles.tipIcon} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Quick Tip</Text>
              <Text style={styles.tipText}>
                Call ahead to confirm stock availability before visiting the pharmacy.
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: "#F8FAFF"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffffffaa",
    alignItems: "center",
    justifyContent: "center"
  },
  backIcon: {
    width: 16,
    height: 16,
    tintColor: "#0F172A"
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0F172A"
  },
  headerSubtitle: {
    marginTop: 4,
    color: "#64748B"
  },
  headerIcon: {
    width: 56,
    height: 56
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  quickFilterList: {
    marginTop: 18,
    marginBottom: 10
  },
  quickFilter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginRight: 10
  },
  quickFilterActive: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2
  },
  quickFilterIcon: {
    width: 16,
    height: 16,
    marginRight: 6
  },
  quickFilterText: {
    fontSize: 13,
    color: "#475569"
  },
  quickFilterTextActive: {
    fontWeight: "700"
  },
  mapCard: {
    backgroundColor: "#E0F2FE",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2
  },
  mapCardContent: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  mapCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  mapIcon: {
    width: 64,
    height: 64,
    marginBottom: 12
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "center"
  },
  mapSubtitle: {
    color: "#475569",
    marginTop: 4,
    textAlign: "center"
  },
  openMapButton: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center"
  },
  openMapIcon: {
    width: 18,
    height: 18,
    tintColor: "#FFFFFF",
    marginRight: 8
  },
  openMapText: {
    color: "#FFFFFF",
    fontWeight: "600"
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 18,
    padding: 4,
    marginBottom: 24
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center"
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#94A3B8",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2
  },
  tabText: {
    color: "#475569",
    fontWeight: "500"
  },
  tabTextActive: {
    color: "#1D4ED8",
    fontWeight: "600"
  },
  pharmacyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  pharmacyCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#DBEAFE"
  },
  cardHeader: {
    flexDirection: "row"
  },
  cardIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14
  },
  cardIcon: {
    width: 28,
    height: 28
  },
  cardIconNoContainer: {
    width: 48,
    height: 48,
    marginRight: 14
  },
  cardTitleWrapper: {
    flex: 1
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1
  },
  titleRowWithFavorite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  favoriteButton: {
    padding: 4
  },
  favoriteIcon: {
    width: 20,
    height: 20,
    tintColor: "#94A3B8"
  },
  favoriteIconContainer: {
    width: 20,
    height: 20,
    backgroundColor: "#EC4899",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  favoriteIconFilled: {
    width: 16,
    height: 16,
    tintColor: "#FFFFFF"
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  ratingIcon: {
    width: 14,
    height: 14,
    marginRight: 4
  },
  ratingText: {
    color: "#0F172A",
    fontWeight: "600",
    marginRight: 4
  },
  ratingCount: {
    color: "#94A3B8"
  },
  statusWrapper: {
    alignItems: "flex-end",
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  statusOpen: {
    backgroundColor: "#DCFCE7"
  },
  statusClosed: {
    backgroundColor: "#FEE2E2"
  },
  statusText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "600"
  },
  distanceText: {
    marginTop: 4,
    color: "#64748B"
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8
  },
  addressIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: "#475569"
  },
  addressText: {
    flex: 1,
    color: "#475569"
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6
  },
  timeIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: "#475569"
  },
  hoursText: {
    color: "#475569"
  },
  servicesWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12
  },
  serviceChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#E2E8F0"
  },
  serviceChipSelected: {
    backgroundColor: "#DBEAFE",
    borderColor: "rgba(148, 163, 184, 0.6)"
  },
  serviceText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "500"
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 10
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14
  },
  directionButton: {
    backgroundColor: "#F1F5F9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent"
  },
  actionButtonSelected: {
    backgroundColor: "#FFFFFF"
  },
  directionButtonActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#1E40AF"
  },
  callButton: {
    backgroundColor: "#F1F5F9",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "transparent"
  },
  callButtonActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#047857"
  },
  actionIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: "#0F172A"
  },
  actionIconBlue: {
    tintColor: "#1E40AF"
  },
  actionIconGreen: {
    tintColor: "#047857"
  },
  actionText: {
    color: "#0F172A",
    fontWeight: "600"
  },
  actionTextBlue: {
    color: "#1E40AF"
  },
  actionTextGreen: {
    color: "#047857"
  },
  expandedSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    paddingTop: 12
  },
  expandedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  expandedIcon: {
    width: 18,
    height: 18,
    marginRight: 10
  },
  expandedIconGrey: {
    width: 18,
    height: 18,
    marginRight: 10,
    tintColor: "#94A3B8"
  },
  expandedText: {
    flex: 1,
    color: "#475569"
  },
  expandedTextGrey: {
    flex: 1,
    color: "#94A3B8"
  },
  orderButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  orderButtonText: {
    color: "#FFFFFF",
    fontWeight: "600"
  },
  forwardIcon: {
    width: 16,
    height: 16,
    marginLeft: 8,
    tintColor: "#FFFFFF"
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 24
  },
  emptyIcon: {
    width: 48,
    height: 48,
    marginBottom: 10
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A"
  },
  emptySubtitle: {
    color: "#94A3B8",
    marginTop: 4
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 60
  },
  tipIcon: {
    width: 44,
    height: 44,
    marginRight: 12
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D4ED8"
  },
  tipText: {
    marginTop: 4,
    color: "#1D4ED8"
  }
} as const;
