import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAppStore, selectZones } from "@/lib/store";
import { getQueryFn } from "@/lib/query-client";
import type { Zone } from "@shared/schema";

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

  const safeZones = zones || [];

  const renderZone = ({ item }: { item: Zone }) => {
    const polygon = Array.isArray(item.polygon) ? item.polygon : [];
    return (
      <View style={styles.card}>
        <View style={[styles.colorDot, { backgroundColor: item.color || "#FF0000" }]} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name || "Unnamed Zone"}</Text>
          <Text style={styles.cardDesc} numberOfLines={1}>
            {item.description || "No description"}
          </Text>
          <Text style={styles.cardMeta}>
            {polygon.length} point{polygon.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>
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
          <Text style={styles.emptyText}>Create a zone to get started</Text>
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
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  cardDesc: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  cardMeta: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginTop: 2,
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
