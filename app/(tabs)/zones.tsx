import React, { useEffect, useState } from "react";
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
import { useAppStore, selectZones } from "@/lib/store";
import { getQueryFn, apiRequest, queryClient } from "@/lib/query-client";
import type { Zone } from "@shared/schema";

const ZONE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  general: { label: "General", color: "#007AFF", icon: "layers" },
  alert: { label: "Alert", color: "#FF3B30", icon: "alert-triangle" },
  hot: { label: "Hot", color: "#FF9500", icon: "thermometer" },
  warm: { label: "Warm", color: "#FFCC00", icon: "sun" },
  safe: { label: "Safe", color: "#34C759", icon: "shield" },
};

export default function ZonesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const zones = useAppStore(selectZones);
  const setZones = useAppStore((s) => s.setZones);

  const { data, isLoading, refetch } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setZones(data);
    }
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/zones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
    },
  });

  const handleDelete = (zone: Zone) => {
    if (Platform.OS === "web") {
      if (confirm(`Delete zone "${zone.name}"? This cannot be undone.`)) {
        deleteMutation.mutate(zone.id);
      }
    } else {
      RNAlert.alert(
        "Delete Zone",
        `Delete "${zone.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(zone.id) },
        ]
      );
    }
  };

  const safeZones = zones || [];

  const renderZone = ({ item }: { item: Zone }) => {
    const polygon = Array.isArray(item.polygon) ? item.polygon : [];
    const zt = (item as any).zoneType || "general";
    const typeConfig = ZONE_TYPE_CONFIG[zt] || ZONE_TYPE_CONFIG.general;

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/create-zone?editId=${item.id}`)}
      >
        <View style={[styles.colorStripe, { backgroundColor: item.color || "#FF0000" }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name || "Unnamed Zone"}</Text>
            <View style={[styles.typeBadge, { backgroundColor: `${typeConfig.color}18` }]}>
              <Feather name={typeConfig.icon} size={11} color={typeConfig.color} />
              <Text style={[styles.typeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
            </View>
          </View>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <Text style={styles.cardMeta}>
            {polygon.length} point{polygon.length !== 1 ? "s" : ""}
          </Text>
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
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : safeZones.length === 0 ? (
        <View style={styles.center}>
          <Feather name="layers" size={48} color={Colors.light.tabIconDefault} />
          <Text style={styles.emptyTitle}>No Zones</Text>
          <Text style={styles.emptyText}>Tap + to create your first zone</Text>
        </View>
      ) : (
        <FlatList
          data={safeZones}
          keyExtractor={(item) => item.id}
          renderItem={renderZone}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 90 },
          ]}
          scrollEnabled={safeZones.length > 0}
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: Platform.OS === "web" ? 34 + 84 + 16 : insets.bottom + 90 + 16 },
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push("/create-zone")}
        testID="create-zone-button"
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 4,
  },
  colorStripe: {
    width: 5,
    alignSelf: "stretch" as const,
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.text,
    flex: 1,
  },
  typeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  cardDesc: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  cardMeta: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  deleteBtn: {
    padding: 14,
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
