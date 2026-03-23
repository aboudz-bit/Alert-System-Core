import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { Zone } from "@shared/schema";

interface NativeMapProps {
  zones: Zone[];
}

export default function NativeMap({ zones }: NativeMapProps) {
  const safeZones = Array.isArray(zones) ? zones : [];

  return (
    <View style={styles.container}>
      <Feather name="map" size={48} color={Colors.light.tabIconDefault} />
      <Text style={styles.title}>Map View</Text>
      <Text style={styles.text}>
        {safeZones.length > 0
          ? `${safeZones.length} zone${safeZones.length !== 1 ? "s" : ""} configured`
          : "No zones configured yet"}
      </Text>
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
});
