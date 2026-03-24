import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { Zone, Location, Alert } from "@shared/schema";
import type { WindData } from "@/lib/store";

export interface PersonnelMarker {
  id: string;
  name: string;
  status: "safe" | "pending" | "need_help" | "no_reply";
  latitude: number;
  longitude: number;
}

interface NativeMapProps {
  zones: Zone[];
  locations?: Location[];
  activeAlerts?: Alert[];
  alertZoneIds?: Set<string>;
  windData?: WindData | null;
  personnel?: PersonnelMarker[];
}

function getWindDirectionLabel(degrees: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8;
  return dirs[index];
}

const PERSONNEL_COLORS: Record<PersonnelMarker["status"], string> = {
  safe: "#34C759",
  pending: "#FF9500",
  need_help: "#FF3B30",
  no_reply: "#8E8E93",
};

const STATUS_LABELS: Record<PersonnelMarker["status"], string> = {
  safe: "Safe",
  pending: "Pending",
  need_help: "Need Help",
  no_reply: "No Reply",
};

export default function NativeMap({ zones, locations, activeAlerts, windData, personnel }: NativeMapProps) {
  const safeZones = Array.isArray(zones) ? zones : [];
  const safeLocations = Array.isArray(locations) ? locations : [];
  const safeAlerts = Array.isArray(activeAlerts) ? activeAlerts : [];
  const safePersonnel = Array.isArray(personnel) ? personnel : [];

  const statusCounts = safePersonnel.reduce(
    (acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <View style={styles.container}>
      <Feather name="map" size={48} color={Colors.light.tint} />
      <Text style={styles.title}>Zone Map</Text>
      <Text style={styles.text}>
        {safeZones.length > 0
          ? `${safeZones.length} zone${safeZones.length !== 1 ? "s" : ""} configured`
          : "No zones configured yet"}
      </Text>
      {safeLocations.length > 0 ? (
        <Text style={styles.text}>
          {safeLocations.length} location{safeLocations.length !== 1 ? "s" : ""} on map
        </Text>
      ) : null}
      {safeAlerts.length > 0 ? (
        <Text style={[styles.text, { color: Colors.light.danger }]}>
          {safeAlerts.length} active alert{safeAlerts.length !== 1 ? "s" : ""}
        </Text>
      ) : null}
      {windData && windData.speed > 0 ? (
        <View style={styles.windRow}>
          <Feather name="wind" size={16} color={Colors.light.tint} />
          <Text style={styles.windText}>
            Wind: {getWindDirectionLabel(windData.direction)} at {windData.speed} km/h
          </Text>
        </View>
      ) : null}
      {safePersonnel.length > 0 ? (
        <View style={styles.personnelSection}>
          <Text style={styles.personnelTitle}>Personnel ({safePersonnel.length})</Text>
          <View style={styles.statusGrid}>
            {(Object.keys(statusCounts) as PersonnelMarker["status"][]).map((status) => (
              <View key={status} style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: PERSONNEL_COLORS[status] }]} />
                <Text style={styles.statusText}>{statusCounts[status]} {STATUS_LABELS[status]}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <Text style={styles.hint}>
        Full map view available on mobile devices
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.light.background,
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  text: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  hint: {
    fontSize: 13,
    color: Colors.light.tabIconDefault,
    marginTop: 8,
  },
  windRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  windText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.light.tint,
  },
  personnelSection: {
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 14,
    width: "100%" as any,
    maxWidth: 320,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  personnelTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  statusGrid: {
    gap: 6,
  },
  statusItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
});
