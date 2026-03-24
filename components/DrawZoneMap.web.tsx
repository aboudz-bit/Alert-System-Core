import React, { useState, useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface DrawZoneMapProps {
  points: Array<{ latitude: number; longitude: number }>;
  onPointsChange: (points: Array<{ latitude: number; longitude: number }>) => void;
  color: string;
}

export default function DrawZoneMap({ points, onPointsChange, color }: DrawZoneMapProps) {
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [error, setError] = useState("");

  const handleAddPoint = useCallback(() => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng)) {
      setError("Enter valid numbers");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Lat: -90 to 90, Lng: -180 to 180");
      return;
    }
    setError("");
    onPointsChange([...points, { latitude: lat, longitude: lng }]);
    setLatInput("");
    setLngInput("");
  }, [latInput, lngInput, points, onPointsChange]);

  const handleUndo = useCallback(() => {
    if (points.length > 0) {
      onPointsChange(points.slice(0, -1));
    }
  }, [points, onPointsChange]);

  const handleClear = useCallback(() => {
    onPointsChange([]);
  }, [onPointsChange]);

  return (
    <View style={styles.container}>
      <View style={styles.previewContainer}>
        <View style={styles.svgContainer}>
          {points.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="map-pin" size={32} color={Colors.light.tabIconDefault} />
              <Text style={styles.emptyText}>Add points below to draw the zone polygon</Text>
              <Text style={styles.emptyHint}>Map drawing is available on mobile. On web, add points manually.</Text>
            </View>
          ) : (
            <View style={styles.pointsList}>
              <Text style={styles.pointsTitle}>Polygon Points</Text>
              {points.map((p, i) => (
                <View key={i} style={styles.pointRow}>
                  <View style={[styles.pointDot, { backgroundColor: color }]}>
                    <Text style={styles.pointDotText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.pointCoord}>
                    {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)}
                  </Text>
                </View>
              ))}
              <View style={[styles.statusBadge, { backgroundColor: points.length >= 3 ? "#E8F8ED" : "#FFF3E0" }]}>
                <Feather
                  name={points.length >= 3 ? "check-circle" : "info"}
                  size={14}
                  color={points.length >= 3 ? Colors.light.success : Colors.light.pending}
                />
                <Text style={[styles.statusText, { color: points.length >= 3 ? Colors.light.success : Colors.light.pending }]}>
                  {points.length >= 3 ? "Valid polygon" : `Need ${3 - points.length} more point${3 - points.length !== 1 ? "s" : ""}`}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.addPointRow}>
        <TextInput
          style={styles.coordInput}
          value={latInput}
          onChangeText={setLatInput}
          placeholder="Latitude"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
        <TextInput
          style={styles.coordInput}
          value={lngInput}
          onChangeText={setLngInput}
          placeholder="Longitude"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
        <Pressable style={styles.addButton} onPress={handleAddPoint}>
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.toolbar}>
        <Pressable
          style={[styles.toolButton, points.length === 0 && styles.toolButtonDisabled]}
          onPress={handleUndo}
          disabled={points.length === 0}
        >
          <Feather name="corner-up-left" size={18} color={points.length > 0 ? Colors.light.tint : "#ccc"} />
          <Text style={[styles.toolText, points.length === 0 && styles.toolTextDisabled]}>Undo</Text>
        </Pressable>

        <Pressable
          style={[styles.toolButton, points.length === 0 && styles.toolButtonDisabled]}
          onPress={handleClear}
          disabled={points.length === 0}
        >
          <Feather name="trash-2" size={18} color={points.length > 0 ? Colors.light.danger : "#ccc"} />
          <Text style={[styles.toolText, points.length === 0 && styles.toolTextDisabled]}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  previewContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
    minHeight: 200,
  },
  svgContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.text,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    textAlign: "center",
  },
  pointsList: {
    gap: 8,
  },
  pointsTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pointDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  pointDotText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  pointCoord: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.light.textSecondary,
    fontFamily: "monospace",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  addPointRow: {
    flexDirection: "row",
    gap: 8,
  },
  coordInput: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    color: Colors.light.text,
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.danger,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  toolButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  toolButtonDisabled: {
    opacity: 0.5,
  },
  toolText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  toolTextDisabled: {
    color: "#ccc",
  },
});
