import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, ActivityIndicator, Text, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import {
  useAppStore,
  selectZones,
  selectLocations,
  selectAlerts,
  selectEmergencyMode,
  selectWindData,
} from "@/lib/store";
import { getQueryFn } from "@/lib/query-client";
import NativeMap from "@/components/NativeMap";
import WindIndicator from "@/components/WindIndicator";
import type { Zone, Location, Alert as AlertType, EmergencyMode, WindCondition } from "@shared/schema";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const zones = useAppStore(selectZones);
  const locations = useAppStore(selectLocations);
  const alerts = useAppStore(selectAlerts);
  const emergencyMode = useAppStore(selectEmergencyMode);
  const windData = useAppStore(selectWindData);
  const setZones = useAppStore((s) => s.setZones);
  const setLocations = useAppStore((s) => s.setLocations);
  const setAlerts = useAppStore((s) => s.setAlerts);
  const setEmergencyMode = useAppStore((s) => s.setEmergencyMode);
  const setWindData = useAppStore((s) => s.setWindData);

  const { data: zoneData, isLoading: zonesLoading } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: locationData, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: alertData } = useQuery<AlertType[]>({
    queryKey: ["/api/alerts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: emergencyData } = useQuery<EmergencyMode | null>({
    queryKey: ["/api/emergency/active"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 15000,
  });

  const { data: windDataResponse } = useQuery<WindCondition | null>({
    queryKey: ["/api/wind"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (zoneData && Array.isArray(zoneData)) setZones(zoneData);
  }, [zoneData]);

  useEffect(() => {
    if (locationData && Array.isArray(locationData)) setLocations(locationData);
  }, [locationData]);

  useEffect(() => {
    if (alertData && Array.isArray(alertData)) setAlerts(alertData);
  }, [alertData]);

  useEffect(() => {
    if (emergencyData !== undefined) setEmergencyMode(emergencyData);
  }, [emergencyData]);

  useEffect(() => {
    if (
      windDataResponse &&
      typeof windDataResponse.direction === "number" &&
      typeof windDataResponse.speed === "number"
    ) {
      setWindData({
        direction: windDataResponse.direction,
        speed: windDataResponse.speed,
      });
    } else {
      setWindData(null);
    }
  }, [windDataResponse]);

  const safeZones = zones || [];
  const safeLocations = locations || [];
  const safeAlerts = alerts || [];

  const activeAlerts = useMemo(
    () => safeAlerts.filter((a) => a.status === "active"),
    [safeAlerts]
  );

  const alertZoneIds = useMemo(() => {
    const ids = new Set<string>();
    activeAlerts.forEach((a) => {
      if (a.zoneId) ids.add(a.zoneId);
    });
    return ids;
  }, [activeAlerts]);

  const showMonitorContext =
    user?.role === "eco" ||
    user?.role === "admin" ||
    user?.role === "supervisor";

  const isLoading = zonesLoading || locationsLoading;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  const hasEmergency = emergencyMode && emergencyMode.status === "active";

  return (
    <View style={styles.container}>
      <NativeMap
        zones={safeZones}
        locations={showMonitorContext ? safeLocations : undefined}
        activeAlerts={showMonitorContext ? activeAlerts : undefined}
        alertZoneIds={showMonitorContext ? alertZoneIds : undefined}
        windData={showMonitorContext ? windData : undefined}
      />

      {hasEmergency ? (
        <View
          style={[
            styles.emergencyBanner,
            {
              top: Platform.OS === "web" ? 67 + 12 : insets.top + 60,
              backgroundColor:
                emergencyMode.type === "blackout" ? "#1C1C1E" : Colors.light.warning,
            },
          ]}
        >
          <Feather
            name={emergencyMode.type === "blackout" ? "moon" : "home"}
            size={16}
            color="#fff"
          />
          <Text style={styles.emergencyBannerText}>
            {emergencyMode.type === "shelter_in" ? "SHELTER IN PLACE" : "BLACKOUT"} ACTIVE
          </Text>
        </View>
      ) : null}

      {showMonitorContext && activeAlerts.length > 0 ? (
        <View
          style={[
            styles.alertBadge,
            {
              top: Platform.OS === "web"
                ? 67 + (hasEmergency ? 56 : 12)
                : insets.top + (hasEmergency ? 104 : 60),
            },
          ]}
        >
          <Feather name="alert-triangle" size={14} color={Colors.light.danger} />
          <Text style={styles.alertBadgeText}>
            {activeAlerts.length} active alert{activeAlerts.length !== 1 ? "s" : ""}
          </Text>
        </View>
      ) : null}

      {showMonitorContext && windData && windData.speed > 0 ? (
        <View
          style={[
            styles.windOverlay,
            {
              bottom: Platform.OS === "web" ? 84 + 12 : 100,
            },
          ]}
        >
          <WindIndicator windData={windData} />
        </View>
      ) : null}

      {safeZones.length === 0 && !hasEmergency ? (
        <View
          style={[
            styles.emptyOverlay,
            {
              top: Platform.OS === "web" ? 67 + 12 : insets.top + 60,
            },
          ]}
        >
          <View style={styles.emptyCard}>
            <Feather name="info" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.emptyText}>No zones on map yet</Text>
          </View>
        </View>
      ) : null}
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
  emergencyBanner: {
    position: "absolute" as const,
    left: 16,
    right: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  emergencyBannerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800" as const,
    letterSpacing: 0.8,
  },
  alertBadge: {
    position: "absolute" as const,
    left: 16,
    right: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: Colors.light.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.danger,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertBadgeText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.danger,
  },
  windOverlay: {
    position: "absolute" as const,
    right: 12,
  },
});
