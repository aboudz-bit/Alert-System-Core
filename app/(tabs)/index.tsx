import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, ActivityIndicator, Text, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import {
  useAppStore,
  selectZones,
  selectLocations,
  selectAlerts,
  selectWindData,
} from "@/lib/store";
import { getQueryFn } from "@/lib/query-client";
import { useEmergency } from "@/lib/emergency-context";
import NativeMap from "@/components/NativeMap";
import type { PersonnelMarker } from "@/components/NativeMap";
import WindIndicator from "@/components/WindIndicator";
import type { Zone, Location, Alert as AlertType, WindCondition } from "@shared/schema";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";

interface PersonEntry {
  id: string;
  name: string;
  locationId: string | null;
  receiptStatus: "confirmed" | "not_confirmed" | null;
  responseStatus: "safe" | "need_help" | null;
}

interface PeopleResponse {
  people: PersonEntry[];
  zones: { id: string; name: string }[];
  locations: { id: string; name: string; zoneId: string | null }[];
}

const PENDING_WINDOW_MS = 10 * 60 * 1000;

function computePersonnelStatus(
  person: PersonEntry,
  emergencyActivatedAt: string | null
): PersonnelMarker["status"] {
  if (person.responseStatus === "need_help") return "need_help";
  if (person.responseStatus === "safe") return "safe";
  if (emergencyActivatedAt) {
    const elapsed = Date.now() - new Date(emergencyActivatedAt).getTime();
    if (elapsed < PENDING_WINDOW_MS) return "pending";
  }
  return "no_reply";
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const zones = useAppStore(selectZones);
  const locations = useAppStore(selectLocations);
  const alerts = useAppStore(selectAlerts);
  const windData = useAppStore(selectWindData);
  const setZones = useAppStore((s) => s.setZones);
  const setLocations = useAppStore((s) => s.setLocations);
  const setAlerts = useAppStore((s) => s.setAlerts);
  const setWindData = useAppStore((s) => s.setWindData);
  const { emergencyMode, isActive: hasEmergency, activatedAt: emergencyActivatedAt } = useEmergency();

  const showMonitorContext =
    user?.role === "eco" ||
    user?.role === "admin" ||
    user?.role === "supervisor";

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

  const { data: windDataResponse } = useQuery<WindCondition | null>({
    queryKey: ["/api/wind"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 30000,
  });

  const { data: peopleData } = useQuery<PeopleResponse>({
    queryKey: ["/api/people"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: showMonitorContext,
    refetchInterval: hasEmergency ? 15000 : false,
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

  const locationCoordMap = useMemo(() => {
    const map = new Map<string, { latitude: number; longitude: number }>();
    for (const loc of safeLocations) {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        map.set(loc.id, { latitude: lat, longitude: lng });
      }
    }
    return map;
  }, [safeLocations]);

  const personnelMarkers: PersonnelMarker[] = useMemo(() => {
    if (!showMonitorContext || !hasEmergency) return [];
    const people = peopleData?.people || [];
    const markers: PersonnelMarker[] = [];
    for (const person of people) {
      if (!person.locationId) continue;
      const coord = locationCoordMap.get(person.locationId);
      if (!coord) continue;
      const status = computePersonnelStatus(person, emergencyActivatedAt);
      const jitter = (parseInt(person.id, 36) % 100) / 100000;
      markers.push({
        id: person.id,
        name: person.name,
        status,
        latitude: coord.latitude + jitter,
        longitude: coord.longitude + jitter,
      });
    }
    return markers;
  }, [showMonitorContext, hasEmergency, peopleData?.people, locationCoordMap, emergencyActivatedAt]);

  const isLoading = zonesLoading || locationsLoading;

  const statusCounts = useMemo(() => {
    if (!hasEmergency || personnelMarkers.length === 0) return null;
    const counts = { safe: 0, pending: 0, need_help: 0, no_reply: 0 };
    for (const m of personnelMarkers) {
      counts[m.status]++;
    }
    return counts;
  }, [hasEmergency, personnelMarkers]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NativeMap
        zones={safeZones}
        locations={showMonitorContext ? safeLocations : undefined}
        activeAlerts={showMonitorContext ? activeAlerts : undefined}
        alertZoneIds={showMonitorContext ? alertZoneIds : undefined}
        windData={showMonitorContext ? windData : undefined}
        personnel={personnelMarkers.length > 0 ? personnelMarkers : undefined}
      />

      {hasEmergency && emergencyMode ? (
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

      {hasEmergency && statusCounts ? (
        <View
          style={[
            styles.legendOverlay,
            {
              top: Platform.OS === "web" ? 67 + 56 : insets.top + 104,
            },
          ]}
        >
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#34C759" }]} />
              <Text style={styles.legendText}>{statusCounts.safe}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#FF9500" }]} />
              <Text style={styles.legendText}>{statusCounts.pending}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#FF3B30" }]} />
              <Text style={styles.legendText}>{statusCounts.need_help}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#8E8E93" }]} />
              <Text style={styles.legendText}>{statusCounts.no_reply}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {showMonitorContext && activeAlerts.length > 0 ? (
        <View
          style={[
            styles.alertBadge,
            {
              top: Platform.OS === "web"
                ? 67 + (hasEmergency ? (statusCounts ? 100 : 56) : 12)
                : insets.top + (hasEmergency ? (statusCounts ? 148 : 104) : 60),
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
  legendOverlay: {
    position: "absolute" as const,
    left: 16,
    right: 16,
  },
  legendRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 16,
    backgroundColor: Colors.light.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.text,
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
