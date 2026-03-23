import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert as RNAlert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAppStore, selectAlerts, selectZones } from "@/lib/store";
import { getQueryFn, apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import type { Alert as AlertType, Zone } from "@shared/schema";

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "low":
      return Colors.light.severityLow;
    case "medium":
      return Colors.light.severityMedium;
    case "high":
      return Colors.light.severityHigh;
    case "critical":
      return Colors.light.severityCritical;
    default:
      return Colors.light.severityMedium;
  }
}

export default function AlertsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const alerts = useAppStore(selectAlerts);
  const zones = useAppStore(selectZones);
  const setAlerts = useAppStore((s) => s.setAlerts);
  const setZones = useAppStore((s) => s.setZones);
  const updateAlert = useAppStore((s) => s.updateAlert);

  const { data: alertData, isLoading } = useQuery<AlertType[]>({
    queryKey: ["/api/alerts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: zoneData } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (alertData && Array.isArray(alertData)) setAlerts(alertData);
  }, [alertData]);

  useEffect(() => {
    if (zoneData && Array.isArray(zoneData)) setZones(zoneData);
  }, [zoneData]);

  const clearMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/alerts/${id}/clear`);
    },
    onSuccess: (_, id) => {
      updateAlert(id, { status: "cleared", clearedAt: new Date() as any });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const safeAlerts = alerts || [];
  const safeZones = zones || [];
  const canCreate = user?.role === "admin" || user?.role === "eco" || user?.role === "supervisor";

  const getZoneName = (zoneId: string | null): string => {
    if (!zoneId) return "No zone";
    const zone = safeZones.find((z) => z.id === zoneId);
    return zone?.name || "Unknown";
  };

  const handleClear = (alert: AlertType) => {
    if (Platform.OS === "web") {
      if (confirm(`Clear alert "${alert.title}"?`)) {
        clearMutation.mutate(alert.id);
      }
    } else {
      RNAlert.alert("Clear Alert", `Clear "${alert.title}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => clearMutation.mutate(alert.id) },
      ]);
    }
  };

  const sortedAlerts = [...safeAlerts].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const renderAlert = ({ item }: { item: AlertType }) => {
    const isActive = item.status === "active";
    const sevColor = getSeverityColor(item.severity);

    return (
      <View style={[styles.card, !isActive && styles.cardCleared]}>
        <View style={styles.cardHeader}>
          <View style={[styles.severityBadge, { backgroundColor: sevColor }]}>
            <Text style={styles.severityText}>
              {(item.severity || "medium").toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isActive ? "#FFF0E0" : "#E8F5E9" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isActive ? Colors.light.warning : Colors.light.success },
              ]}
            >
              {isActive ? "ACTIVE" : "CLEARED"}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{item.title || "Untitled"}</Text>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <Text style={styles.cardMeta}>
          Zone: {getZoneName(item.zoneId)}
        </Text>
        {isActive && canCreate ? (
          <Pressable
            style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
            onPress={() => handleClear(item)}
          >
            <Feather name="check-circle" size={16} color={Colors.light.success} />
            <Text style={styles.clearBtnText}>Clear Alert</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : sortedAlerts.length === 0 ? (
        <View style={styles.center}>
          <Feather name="bell-off" size={48} color={Colors.light.tabIconDefault} />
          <Text style={styles.emptyTitle}>No Alerts</Text>
          <Text style={styles.emptyText}>All clear — no alerts at this time</Text>
        </View>
      ) : (
        <FlatList
          data={sortedAlerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 90 },
          ]}
          scrollEnabled={sortedAlerts.length > 0}
        />
      )}

      {canCreate ? (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { bottom: Platform.OS === "web" ? 34 + 84 + 16 : insets.bottom + 90 + 16 },
            pressed && styles.fabPressed,
          ]}
          onPress={() => router.push("/create-alert")}
          testID="create-alert-button"
        >
          <Feather name="plus" size={24} color="#fff" />
        </Pressable>
      ) : null}
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
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 8,
  },
  cardCleared: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: "row" as const,
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  severityText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700" as const,
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
  },
  clearBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 4,
    alignSelf: "flex-start" as const,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#E8F5E9",
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.success,
  },
  fab: {
    position: "absolute" as const,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.danger,
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
