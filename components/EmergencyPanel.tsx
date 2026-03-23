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
import type { EmergencyMode, EmergencyModeType } from "@shared/schema";

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
});
