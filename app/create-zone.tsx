import React, { useState, useEffect } from "react";
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
      setPointsText(
        poly
          .map((p: any) => `${p.latitude}, ${p.longitude}`)
          .join("\n")
      );
      setInitialized(true);
    }
  }, [isEditing, existingZone, initialized]);

  const mutation = useMutation({
    mutationFn: async () => {
      let polygon: Array<{ latitude: number; longitude: number }> = [];

      if (pointsText.trim()) {
        const lines = pointsText.trim().split("\n");
        for (const line of lines) {
          const parts = line.split(",").map((s) => s.trim());
          if (parts.length !== 2) throw new Error("Each line must be: latitude, longitude");
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (isNaN(lat) || isNaN(lng)) throw new Error("Invalid number in coordinates");
          if (lat < -90 || lat > 90) throw new Error("Latitude must be -90 to 90");
          if (lng < -180 || lng > 180) throw new Error("Longitude must be -180 to 180");
          polygon.push({ latitude: lat, longitude: lng });
        }
        if (polygon.length < 3) throw new Error("A zone polygon needs at least 3 points");
      }

      const body = {
        name: name.trim(),
        description: description.trim(),
        polygon,
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
        <Text style={styles.label}>Polygon Points</Text>
        <Text style={styles.hint}>
          One point per line: latitude, longitude{"\n"}
          Minimum 3 points to form a polygon.{"\n"}
          Tip: Use Google Maps to find coordinates.
        </Text>
        <TextInput
          style={[styles.input, styles.textArea, { minHeight: 120 }]}
          value={pointsText}
          onChangeText={setPointsText}
          placeholder={"24.6333, 46.7167\n24.6340, 46.7175\n24.6328, 46.7180"}
          placeholderTextColor="#999"
          multiline
          numberOfLines={6}
        />
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
