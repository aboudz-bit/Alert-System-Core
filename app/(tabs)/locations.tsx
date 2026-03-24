import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert as RNAlert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAppStore, selectLocations, selectZones } from "@/lib/store";
import { getQueryFn, apiRequest, queryClient } from "@/lib/query-client";
import type { Location, Zone } from "@shared/schema";

export default function LocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locations = useAppStore(selectLocations);
  const zones = useAppStore(selectZones);
  const setLocations = useAppStore((s) => s.setLocations);
  const setZones = useAppStore((s) => s.setZones);

  const { data: locData, isLoading: locLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: zoneData } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (locData && Array.isArray(locData)) setLocations(locData);
  }, [locData]);

  useEffect(() => {
    if (zoneData && Array.isArray(zoneData)) setZones(zoneData);
  }, [zoneData]);

  const safeLocations = locations || [];
  const safeZones = zones || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
  });

  const handleDelete = (loc: Location) => {
    if (Platform.OS === "web") {
      if (confirm(`Delete location "${loc.name}"?`)) {
        deleteMutation.mutate(loc.id);
      }
    } else {
      RNAlert.alert(
        "Delete Location",
        `Delete "${loc.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(loc.id) },
        ]
      );
    }
  };

  const getZoneName = (zoneId: string | null): string => {
    if (!zoneId) return "No zone";
    const zone = safeZones.find((z) => z.id === zoneId);
    return zone?.name || "Unknown zone";
  };

  const getZoneColor = (zoneId: string | null): string => {
    if (!zoneId) return Colors.light.tabIconDefault;
    const zone = safeZones.find((z) => z.id === zoneId);
    return zone?.color || Colors.light.tabIconDefault;
  };

  const renderLocation = ({ item }: { item: Location }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/create-location?editId=${item.id}`)}
    >
      <View style={styles.iconWrap}>
        <Feather name="map-pin" size={20} color={Colors.light.tint} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.name || "Unnamed"}</Text>
        <Text style={styles.cardMeta}>
          {typeof item.latitude === "number" ? item.latitude.toFixed(4) : "?"},{" "}
          {typeof item.longitude === "number" ? item.longitude.toFixed(4) : "?"}
        </Text>
        <View style={styles.zoneRow}>
          <View style={[styles.zoneDot, { backgroundColor: getZoneColor(item.zoneId) }]} />
          <Text style={styles.cardZone}>{getZoneName(item.zoneId)}</Text>
        </View>
      </View>
      <Pressable
        style={styles.deleteBtn}
        onPress={() => handleDelete(item)}
        hitSlop={8}
      >
        <Feather name="trash-2" size={18} color={Colors.light.danger} />
      </Pressable>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {locLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : safeLocations.length === 0 ? (
        <View style={styles.center}>
          <Feather name="map-pin" size={48} color={Colors.light.tabIconDefault} />
          <Text style={styles.emptyTitle}>No Locations</Text>
          <Text style={styles.emptyText}>Tap + to add a location</Text>
        </View>
      ) : (
        <FlatList
          data={safeLocations}
          keyExtractor={(item) => item.id}
          renderItem={renderLocation}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 90 },
          ]}
          scrollEnabled={safeLocations.length > 0}
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: Platform.OS === "web" ? 34 + 84 + 16 : insets.bottom + 90 + 16 },
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push("/create-location")}
        testID="create-location-button"
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  center: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.light.tint}15`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  cardMeta: {
    fontSize: 13,
    color: Colors.light.tabIconDefault,
  },
  zoneRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardZone: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  deleteBtn: {
    padding: 10,
  },
  fab: {
    position: "absolute" as const,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.tint,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
});
