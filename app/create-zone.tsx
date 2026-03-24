import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { apiRequest, queryClient, getQueryFn } from "@/lib/query-client";
import DrawZoneMap from "@/components/DrawZoneMap";
import type { Zone } from "@shared/schema";

const PRESET_COLORS = ["#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#007AFF", "#AF52DE", "#8E8E93"];

const ZONE_TYPES = [
  { value: "general", label: "General", icon: "layers" as const, color: "#007AFF" },
  { value: "alert", label: "Alert / Danger", icon: "alert-triangle" as const, color: "#FF3B30" },
  { value: "hot", label: "Hot Zone", icon: "thermometer" as const, color: "#FF9500" },
  { value: "warm", label: "Warm Zone", icon: "sun" as const, color: "#FFCC00" },
  { value: "safe", label: "Safe Zone", icon: "shield" as const, color: "#34C759" },
];

export default function CreateZoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!params.editId;

  const { data: existingZone } = useQuery<Zone>({
    queryKey: ["/api/zones", params.editId],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isEditing,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#FF3B30");
  const [zoneType, setZoneType] = useState("general");
  const [polygonPoints, setPolygonPoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [pointsText, setPointsText] = useState("");
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isEditing && existingZone && !initialized) {
      setName(existingZone.name);
      setDescription(existingZone.description || "");
      setColor(existingZone.color || "#FF3B30");
      setZoneType((existingZone as any).zoneType || "general");
      const poly = Array.isArray(existingZone.polygon) ? existingZone.polygon : [];
      const validPoints = poly.filter(
        (p: any) => p && typeof p.latitude === "number" && typeof p.longitude === "number"
      ) as Array<{ latitude: number; longitude: number }>;
      setPolygonPoints(validPoints);
      setInitialized(true);
    }
  }, [isEditing, existingZone, initialized]);

  const handlePointsChange = useCallback((pts: Array<{ latitude: number; longitude: number }>) => {
    setPolygonPoints(pts);
  }, []);

  const handleApplyManualPoints = useCallback(() => {
    if (!pointsText.trim()) return;
    const lines = pointsText.trim().split("\n");
    const newPoints: Array<{ latitude: number; longitude: number }> = [];
    for (const line of lines) {
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length !== 2) {
        setError("Each line must be: latitude, longitude");
        return;
      }
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lng)) {
        setError("Invalid number in coordinates");
        return;
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setError("Coordinates out of range");
        return;
      }
      newPoints.push({ latitude: lat, longitude: lng });
    }
    setPolygonPoints(newPoints);
    setShowManualInput(false);
    setPointsText("");
    setError("");
  }, [pointsText]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (polygonPoints.length < 3) {
        throw new Error("A zone polygon needs at least 3 points");
      }

      const body = {
        name: name.trim(),
        description: description.trim(),
        polygon: polygonPoints,
        color,
        zoneType,
      };

      if (isEditing) {
        const res = await apiRequest("PUT", `/api/zones/${params.editId}`, body);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/zones", body);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      router.back();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      setError("Zone name is required");
      return;
    }
    if (polygonPoints.length < 3) {
      setError("Draw at least 3 points on the map to create a zone polygon");
      return;
    }
    setError("");
    mutation.mutate();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={16} color={Colors.light.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Zone Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Admin Building"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Zone Type</Text>
        <View style={styles.typeGrid}>
          {ZONE_TYPES.map((t) => (
            <Pressable
              key={t.value}
              style={[
                styles.typeOption,
                zoneType === t.value && { borderColor: t.color, backgroundColor: `${t.color}15` },
              ]}
              onPress={() => setZoneType(t.value)}
            >
              <Feather name={t.icon} size={18} color={zoneType === t.value ? t.color : "#8E8E93"} />
              <Text
                style={[
                  styles.typeLabel,
                  zoneType === t.value && { color: t.color, fontWeight: "600" as const },
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {PRESET_COLORS.map((c) => (
            <Pressable
              key={c}
              style={[
                styles.colorOption,
                { backgroundColor: c },
                color === c && styles.colorSelected,
              ]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Draw Zone on Map *</Text>
          <Pressable
            style={styles.manualToggle}
            onPress={() => setShowManualInput(!showManualInput)}
          >
            <Feather name="edit-3" size={14} color={Colors.light.tint} />
            <Text style={styles.manualToggleText}>
              {showManualInput ? "Hide manual" : "Manual input"}
            </Text>
          </Pressable>
        </View>

        <DrawZoneMap
          points={polygonPoints}
          onPointsChange={handlePointsChange}
          color={color}
        />

        {showManualInput && (
          <View style={styles.manualSection}>
            <Text style={styles.hint}>
              One point per line: latitude, longitude{"\n"}
              This will replace all drawn points.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, { minHeight: 100 }]}
              value={pointsText}
              onChangeText={setPointsText}
              placeholder={"24.6333, 46.7167\n24.6340, 46.7175\n24.6328, 46.7180"}
              placeholderTextColor="#999"
              multiline
              numberOfLines={5}
            />
            <Pressable style={styles.applyButton} onPress={handleApplyManualPoints}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Coordinates</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && { opacity: 0.9 },
          mutation.isPending && { opacity: 0.6 },
        ]}
        onPress={handleSave}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{isEditing ? "Save Changes" : "Create Zone"}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  errorBox: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#FFF0F0",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: 14,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  hint: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    lineHeight: 18,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    color: Colors.light.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top" as const,
  },
  typeGrid: {
    gap: 8,
    marginTop: 4,
  },
  typeOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  typeLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  colorRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 4,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: Colors.light.text,
  },
  manualToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  manualToggleText: {
    fontSize: 13,
    color: Colors.light.tint,
    fontWeight: "500" as const,
  },
  manualSection: {
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  applyButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    paddingVertical: 10,
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    padding: 16,
    alignItems: "center" as const,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
});
