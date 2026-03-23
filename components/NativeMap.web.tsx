import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { Zone, Location, Alert } from "@shared/schema";
import type { WindData } from "@/lib/store";

interface NativeMapProps {
  zones: Zone[];
  locations?: Location[];
  activeAlerts?: Alert[];
  alertZoneIds?: Set<string>;
  windData?: WindData | null;
}

function getWindDirectionLabel(degrees: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8;
  return dirs[index];
}

export default function NativeMap({ zones, locations, activeAlerts, windData }: NativeMapProps) {
  const safeZones = Array.isArray(zones) ? zones : [];
  const safeLocations = Array.isArray(locations) ? locations : [];
  const safeAlerts = Array.isArray(activeAlerts) ? activeAlerts : [];

  return (
    <View style={styles.container}>
      <Feather name="map" size={48} color={Colors.light.tabIconDefault} />
      <Text style={styles.title}>Map View</Text>
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
      <Text style={styles.hint}>
        Map rendering is available on mobile devices
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
    fontSize: 14,
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
});
