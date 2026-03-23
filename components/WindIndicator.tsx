import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import type { WindData } from "@/lib/store";

interface WindIndicatorProps {
  windData: WindData;
}

function getWindDirectionLabel(degrees: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8;
  return dirs[index];
}

export default function WindIndicator({ windData }: WindIndicatorProps) {
  if (!windData || windData.speed <= 0) return null;

  const arrowRotation = `${((windData.direction + 180) % 360)}deg`;

  return (
    <View style={styles.container}>
      <View style={styles.arrowContainer}>
        <View style={{ transform: [{ rotate: arrowRotation }] }}>
          <Feather name="arrow-up" size={18} color={Colors.light.tint} />
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.directionText}>
          {getWindDirectionLabel(windData.direction)}
        </Text>
        <Text style={styles.speedText}>{windData.speed} km/h</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.light.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  textContainer: {
    gap: 1,
  },
  directionText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  speedText: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: Colors.light.textSecondary,
  },
});
