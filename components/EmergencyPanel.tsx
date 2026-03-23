import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Alert as RNAlert,
  Platform,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAppStore, selectEmergencyMode } from "@/lib/store";
import { getQueryFn, apiRequest, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import type { EmergencyMode, EmergencyModeType, EmergencyReceipt } from "@shared/schema";

type ReceiptUser = {
  id: string;
  name: string;
  username: string;
  role: string;
  confirmedAt?: string | null;
};

type ReceiptSummary = {
  confirmed: ReceiptUser[];
  notConfirmed: ReceiptUser[];
  total: number;
};

function getModeLabel(type: EmergencyModeType): string {
  switch (type) {
    case "shelter_in":
      return "Shelter In Place";
    case "blackout":
      return "Blackout";
    default:
      return "Emergency";
  }
}

function getModeIcon(type: EmergencyModeType): keyof typeof Feather.glyphMap {
  switch (type) {
    case "shelter_in":
      return "home";
    case "blackout":
      return "moon";
    default:
      return "alert-triangle";
  }
}

function getModeColor(type: EmergencyModeType): string {
  switch (type) {
    case "shelter_in":
      return Colors.light.warning;
    case "blackout":
      return "#1C1C1E";
    default:
      return Colors.light.danger;
  }
}

function ReceiptConfirmation({ emergencyModeId }: { emergencyModeId: string }) {
  const { data: myReceipt, isLoading } = useQuery<EmergencyReceipt | null>({
    queryKey: ["/api/emergency", emergencyModeId, "receipt", "me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 10000,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/emergency/${emergencyModeId}/receipt`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/emergency", emergencyModeId, "receipt", "me"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/emergency", emergencyModeId, "receipts", "summary"],
      });
    },
    onError: () => {
      const msg = "Failed to confirm receipt. Please try again.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        RNAlert.alert("Error", msg);
      }
    },
  });

  if (isLoading) {
    return (
      <View style={styles.receiptRow}>
        <ActivityIndicator size="small" color={Colors.light.tint} />
      </View>
    );
  }

  if (myReceipt) {
    return (
      <View style={styles.receiptConfirmed}>
        <Feather name="check-circle" size={16} color={Colors.light.success} />
        <Text style={styles.receiptConfirmedText}>
          Receipt confirmed at{" "}
          {new Date(myReceipt.confirmedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.receiptButton,
        pressed && { opacity: 0.85 },
        confirmMutation.isPending && { opacity: 0.5 },
      ]}
      onPress={() => confirmMutation.mutate()}
      disabled={confirmMutation.isPending}
    >
      {confirmMutation.isPending ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Feather name="check" size={18} color="#fff" />
          <Text style={styles.receiptButtonText}>Confirm Receipt</Text>
        </>
      )}
    </Pressable>
  );
}

function ReceiptSummaryView({ emergencyModeId }: { emergencyModeId: string }) {
  const [expanded, setExpanded] = React.useState(false);

  const { data: summary, isLoading } = useQuery<ReceiptSummary>({
    queryKey: ["/api/emergency", emergencyModeId, "receipts", "summary"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 10000,
  });

  if (isLoading || !summary) {
    return null;
  }

  const confirmedCount = (summary.confirmed || []).length;
  const totalCount = summary.total || 0;

  return (
    <View style={styles.summaryContainer}>
      <Pressable
        style={styles.summaryHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.summaryCountRow}>
          <Text style={styles.summaryLabel}>Receipts</Text>
          <Text style={styles.summaryCount}>
            {confirmedCount}/{totalCount}
          </Text>
        </View>
        <View style={styles.summaryBar}>
          <View
            style={[
              styles.summaryBarFill,
              {
                width: totalCount > 0 ? `${(confirmedCount / totalCount) * 100}%` : "0%",
              },
            ]}
          />
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={Colors.light.textSecondary}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.summaryDetails}>
          {(summary.confirmed || []).length > 0 ? (
            <View style={styles.summaryGroup}>
              <Text style={styles.summaryGroupLabel}>Confirmed</Text>
              {(summary.confirmed || []).map((u) => (
                <View key={u.id} style={styles.summaryUserRow}>
                  <Feather name="check-circle" size={14} color={Colors.light.success} />
                  <Text style={styles.summaryUserName}>{u.name}</Text>
                  <Text style={styles.summaryUserRole}>{u.role}</Text>
                  {u.confirmedAt ? (
                    <Text style={styles.summaryUserTime}>
                      {new Date(u.confirmedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
          {(summary.notConfirmed || []).length > 0 ? (
            <View style={styles.summaryGroup}>
              <Text style={styles.summaryGroupLabel}>Not Confirmed</Text>
              {(summary.notConfirmed || []).map((u) => (
                <View key={u.id} style={styles.summaryUserRow}>
                  <Feather name="clock" size={14} color={Colors.light.tabIconDefault} />
                  <Text style={styles.summaryUserName}>{u.name}</Text>
                  <Text style={styles.summaryUserRole}>{u.role}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function EmergencyPanel() {
  const { user } = useAuth();
  const emergencyMode = useAppStore(selectEmergencyMode);
  const setEmergencyMode = useAppStore((s) => s.setEmergencyMode);

  const { data: modeData, isLoading, isError } = useQuery<EmergencyMode | null>({
    queryKey: ["/api/emergency/active"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 15000,
  });

  React.useEffect(() => {
    if (modeData !== undefined) {
      setEmergencyMode(modeData);
    }
  }, [modeData]);

  React.useEffect(() => {
    if (isError) {
      setEmergencyMode(null);
    }
  }, [isError]);

  const canActivate =
    user?.role === "admin" ||
    user?.role === "eco" ||
    user?.role === "supervisor";

  const activateMutation = useMutation({
    mutationFn: async (type: EmergencyModeType) => {
      const res = await apiRequest("POST", "/api/emergency/activate", { type });
      return res.json();
    },
    onSuccess: (data: EmergencyMode) => {
      setEmergencyMode(data);
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/active"] });
    },
    onError: () => {
      const msg = "Failed to activate emergency mode. Please try again.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        RNAlert.alert("Error", msg);
      }
    },
  });

  const clearMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/emergency/${id}/clear`);
    },
    onSuccess: () => {
      setEmergencyMode(null);
      queryClient.invalidateQueries({ queryKey: ["/api/emergency/active"] });
    },
    onError: () => {
      const msg = "Failed to clear emergency mode. Please try again.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        RNAlert.alert("Error", msg);
      }
    },
  });

  const handleActivate = (type: EmergencyModeType) => {
    const label = getModeLabel(type);
    if (Platform.OS === "web") {
      if (confirm(`Activate ${label}? This will alert all personnel.`)) {
        activateMutation.mutate(type);
      }
    } else {
      RNAlert.alert(
        `Activate ${label}`,
        "This will alert all personnel. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Activate",
            style: "destructive",
            onPress: () => activateMutation.mutate(type),
          },
        ]
      );
    }
  };

  const handleClear = () => {
    if (!emergencyMode) return;
    const label = getModeLabel(emergencyMode.type);
    if (Platform.OS === "web") {
      if (confirm(`Clear ${label} and issue All Clear?`)) {
        clearMutation.mutate(emergencyMode.id);
      }
    } else {
      RNAlert.alert("All Clear", `Clear ${label} and issue All Clear?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "All Clear",
          style: "default",
          onPress: () => clearMutation.mutate(emergencyMode.id),
        },
      ]);
    }
  };

  const isPending = activateMutation.isPending || clearMutation.isPending;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors.light.tint} />
      </View>
    );
  }

  if (emergencyMode && emergencyMode.status === "active") {
    const modeColor = getModeColor(emergencyMode.type);
    const modeIcon = getModeIcon(emergencyMode.type);
    const modeLabel = getModeLabel(emergencyMode.type);

    return (
      <View style={[styles.activeContainer, { borderColor: modeColor }]}>
        <View style={[styles.activeBanner, { backgroundColor: modeColor }]}>
          <Feather name={modeIcon} size={20} color="#fff" />
          <Text style={styles.activeBannerText}>{modeLabel} ACTIVE</Text>
        </View>
        <View style={styles.activeBody}>
          <Text style={styles.activeTime}>
            Since{" "}
            {new Date(emergencyMode.activatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          {canActivate ? (
            <Pressable
              style={({ pressed }) => [
                styles.clearButton,
                pressed && { opacity: 0.8 },
                isPending && { opacity: 0.5 },
              ]}
              onPress={handleClear}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={Colors.light.success} />
              ) : (
                <>
                  <Feather
                    name="check-circle"
                    size={16}
                    color={Colors.light.success}
                  />
                  <Text style={styles.clearButtonText}>All Clear</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
        <View style={styles.receiptSection}>
          <ReceiptConfirmation emergencyModeId={emergencyMode.id} />
          {canActivate ? (
            <ReceiptSummaryView emergencyModeId={emergencyMode.id} />
          ) : null}
        </View>
      </View>
    );
  }

  if (!canActivate) {
    return (
      <View style={styles.container}>
        <View style={styles.statusRow}>
          <Feather
            name="check-circle"
            size={16}
            color={Colors.light.success}
          />
          <Text style={styles.normalText}>No active emergency</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Emergency Actions</Text>
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [
            styles.activateButton,
            { backgroundColor: Colors.light.warning },
            pressed && { opacity: 0.85 },
            isPending && { opacity: 0.5 },
          ]}
          onPress={() => handleActivate("shelter_in")}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="home" size={18} color="#fff" />
              <Text style={styles.activateButtonText}>Shelter In</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.activateButton,
            { backgroundColor: "#1C1C1E" },
            pressed && { opacity: 0.85 },
            isPending && { opacity: 0.5 },
          ]}
          onPress={() => handleActivate("blackout")}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="moon" size={18} color="#fff" />
              <Text style={styles.activateButtonText}>Blackout</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  activateButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  activateButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  activeContainer: {
    borderRadius: 12,
    borderWidth: 2,
    overflow: "hidden" as const,
  },
  activeBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeBannerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800" as const,
    letterSpacing: 1,
  },
  activeBody: {
    backgroundColor: Colors.light.surface,
    padding: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  activeTime: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  clearButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.success,
  },
  statusRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  normalText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  receiptSection: {
    backgroundColor: Colors.light.background,
    padding: 14,
    gap: 12,
  },
  receiptRow: {
    alignItems: "center" as const,
    paddingVertical: 8,
  },
  receiptButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 10,
  },
  receiptButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  receiptConfirmed: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "#E8F5E9",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  receiptConfirmedText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.light.success,
  },
  summaryContainer: {
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    overflow: "hidden" as const,
  },
  summaryHeader: {
    padding: 12,
    gap: 8,
  },
  summaryCountRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  summaryBar: {
    height: 6,
    backgroundColor: Colors.light.border,
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  summaryBarFill: {
    height: 6,
    backgroundColor: Colors.light.success,
    borderRadius: 3,
  },
  summaryDetails: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
  },
  summaryGroup: {
    gap: 6,
  },
  summaryGroupLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  summaryUserRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 4,
  },
  summaryUserName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.light.text,
    flex: 1,
  },
  summaryUserRole: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textTransform: "capitalize" as const,
  },
  summaryUserTime: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});
