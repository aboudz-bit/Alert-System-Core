import React, { useState } from "react";
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
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useAppStore } from "@/lib/store";

const PRESET_COLORS = ["#FF0000", "#FF9500", "#007AFF", "#34C759", "#AF52DE", "#FF2D55"];

export default function CreateZoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addZone = useAppStore((s) => s.addZone);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#FF0000");
  const [pointsText, setPointsText] = useState("");
  const [error, setError] = useState("");

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
      }

      const res = await apiRequest("POST", "/api/zones", {
        name: name.trim(),
        description: description.trim(),
        polygon,
        color,
      });
      return res.json();
    },
    onSuccess: (data) => {
      addZone(data);
      queryClient.invalidateQueries({ queryKey: ["/api/zones"] });
      router.back();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleCreate = () => {
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
          placeholder="e.g. Building A"
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
          One point per line: latitude, longitude
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={pointsText}
          onChangeText={setPointsText}
          placeholder={"-33.8688, 151.2093\n-33.8700, 151.2100\n-33.8710, 151.2080"}
          placeholderTextColor="#999"
          multiline
          numberOfLines={5}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && { opacity: 0.9 },
          mutation.isPending && { opacity: 0.6 },
        ]}
        onPress={handleCreate}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Zone</Text>
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
