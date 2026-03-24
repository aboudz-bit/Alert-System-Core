import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import MapView, { Polygon, Marker, PROVIDER_GOOGLE, MapPressEvent } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface DrawZoneMapProps {
  points: Array<{ latitude: number; longitude: number }>;
  onPointsChange: (points: Array<{ latitude: number; longitude: number }>) => void;
  color: string;
}

const DEFAULT_REGION = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function DrawZoneMap({ points, onPointsChange, color }: DrawZoneMapProps) {
  const [region, setRegion] = useState(DEFAULT_REGION);

  const handleMapPress = useCallback(
    (e: MapPressEvent) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      onPointsChange([...points, { latitude, longitude }]);
    },
    [points, onPointsChange]
  );

  const handleUndo = useCallback(() => {
    if (points.length > 0) {
      onPointsChange(points.slice(0, -1));
    }
  }, [points, onPointsChange]);

  const handleClear = useCallback(() => {
    onPointsChange([]);
  }, [onPointsChange]);

  const initialRegion = points.length > 0
    ? (() => {
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        for (const p of points) {
          if (p.latitude < minLat) minLat = p.latitude;
          if (p.latitude > maxLat) maxLat = p.latitude;
          if (p.longitude < minLng) minLng = p.longitude;
          if (p.longitude > maxLng) maxLng = p.longitude;
        }
        return {
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max((maxLat - minLat) * 2, 0.01),
          longitudeDelta: Math.max((maxLng - minLng) * 2, 0.01),
        };
      })()
    : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={Platform.OS === "ios" ? undefined : PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          onPress={handleMapPress}
          showsUserLocation
          mapType="standard"
        >
          {points.length >= 3 && (
            <Polygon
              coordinates={points}
              fillColor={`${color}33`}
              strokeColor={color}
              strokeWidth={2}
            />
          )}
          {points.map((point, index) => (
            <Marker
              key={`draw-point-${index}`}
              coordinate={point}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.pointMarker, { backgroundColor: color, borderColor: index === 0 ? "#fff" : color }]}>
                <Text style={styles.pointNumber}>{index + 1}</Text>
              </View>
            </Marker>
          ))}
          {points.length === 2 && (
            <Polygon
              coordinates={[...points, points[0]]}
              fillColor="transparent"
              strokeColor={`${color}80`}
              strokeWidth={1}
              lineDashPattern={[6, 4]}
            />
          )}
        </MapView>

        <View style={styles.instructionOverlay}>
          <Text style={styles.instructionText}>
            {points.length === 0
              ? "Tap on the map to start drawing"
              : points.length < 3
              ? `Tap to add more points (${points.length}/3 min)`
              : `${points.length} points — tap to add more or save`}
          </Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <Pressable
          style={[styles.toolButton, points.length === 0 && styles.toolButtonDisabled]}
          onPress={handleUndo}
          disabled={points.length === 0}
        >
          <Feather name="corner-up-left" size={18} color={points.length > 0 ? Colors.light.tint : "#ccc"} />
          <Text style={[styles.toolText, points.length === 0 && styles.toolTextDisabled]}>Undo</Text>
        </Pressable>

        <View style={styles.pointCount}>
          <View style={[styles.pointCountDot, { backgroundColor: points.length >= 3 ? Colors.light.success : Colors.light.pending }]} />
          <Text style={styles.pointCountText}>{points.length} point{points.length !== 1 ? "s" : ""}</Text>
        </View>

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
    gap: 0,
  },
  mapContainer: {
    height: 350,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  map: {
    flex: 1,
  },
  instructionOverlay: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    alignItems: "center",
  },
  instructionText: {
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#fff",
    fontSize: 13,
    fontWeight: "600" as const,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    overflow: "hidden",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
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
  pointCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pointCountDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pointCountText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
  },
  pointMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pointNumber: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
  },
});
