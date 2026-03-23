import React, { useEffect } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAppStore, selectZones } from "@/lib/store";
import { getQueryFn } from "@/lib/query-client";
import NativeMap from "@/components/NativeMap";
import type { Zone } from "@shared/schema";
import { Feather } from "@expo/vector-icons";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const zones = useAppStore(selectZones);
  const setZones = useAppStore((s) => s.setZones);

  const { data, isLoading } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setZones(data);
    }
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  const safeZones = zones || [];

  return (
    <View style={styles.container}>
      <NativeMap zones={safeZones} />
      {safeZones.length === 0 && (
        <View style={[styles.emptyOverlay, { top: insets.top + 60 }]}>
          <View style={styles.emptyCard}>
            <Feather name="info" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.emptyText}>No zones on map yet</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyOverlay: {
    position: "absolute" as const,
    left: 16,
    right: 16,
  },
  emptyCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.light.surface,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
