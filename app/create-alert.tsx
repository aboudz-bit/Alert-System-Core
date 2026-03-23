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
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { apiRequest, queryClient, getQueryFn } from "@/lib/query-client";
import { useAppStore } from "@/lib/store";
import type { Zone } from "@shared/schema";

const SEVERITIES = [
  { value: "low", label: "Low", color: Colors.light.severityLow },
  { value: "medium", label: "Medium", color: Colors.light.severityMedium },
  { value: "high", label: "High", color: Colors.light.severityHigh },
  { value: "critical", label: "Critical", color: Colors.light.severityCritical },
] as const;

export default function CreateAlertScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addAlert = useAppStore((s) => s.addAlert);
  const setZones = useAppStore((s) => s.setZones);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("medium");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: zoneData } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (zoneData && Array.isArray(zoneData)) setZones(zoneData);
  }, [zoneData]);

  const safeZones = Array.isArray(zoneData) ? zoneData : [];

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/alerts", {
        title: title.trim(),
        description: description.trim(),
        severity,
        zoneId: selectedZoneId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      addAlert(data);
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      router.back();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleCreate = () => {
    if (!title.trim()) {
      setError("Alert title is required");
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
        <Text style={styles.label}>Alert Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Fire evacuation"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Details about this alert"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Severity</Text>
        <View style={styles.severityRow}>
          {SEVERITIES.map((sev) => (
            <Pressable
              key={sev.value}
              style={[
                styles.severityOption,
                { borderColor: sev.color },
                severity === sev.value && { backgroundColor: sev.color },
              ]}
              onPress={() => setSeverity(sev.value)}
            >
              <Text
                style={[
                  styles.severityText,
                  {
                    color: severity === sev.value ? "#fff" : sev.color,
                  },
                ]}
              >
                {sev.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Zone (optional)</Text>
        <View style={styles.zoneList}>
          <Pressable
            style={[
              styles.zoneOption,
              selectedZoneId === null && styles.zoneSelected,
            ]}
            onPress={() => setSelectedZoneId(null)}
          >
            <Text
              style={[
                styles.zoneOptionText,
                selectedZoneId === null && styles.zoneSelectedText,
              ]}
            >
              All Zones
            </Text>
          </Pressable>
          {safeZones.map((zone) => (
            <Pressable
              key={zone.id}
              style={[
                styles.zoneOption,
                selectedZoneId === zone.id && styles.zoneSelected,
              ]}
              onPress={() => setSelectedZoneId(zone.id)}
            >
              <View
                style={[styles.zoneDot, { backgroundColor: zone.color || "#FF0000" }]}
              />
              <Text
                style={[
                  styles.zoneOptionText,
                  selectedZoneId === zone.id && styles.zoneSelectedText,
                ]}
                numberOfLines={1}
              >
                {zone.name}
              </Text>
            </Pressable>
          ))}
        </View>
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
          <Text style={styles.buttonText}>Create Alert</Text>
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
  severityRow: {
    flexDirection: "row" as const,
    gap: 8,
    flexWrap: "wrap" as const,
  },
  severityOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  severityText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  zoneList: {
    gap: 8,
  },
  zoneOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    padding: 12,
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  zoneSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: `${Colors.light.tint}10`,
  },
  zoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  zoneOptionText: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  zoneSelectedText: {
    color: Colors.light.tint,
    fontWeight: "600" as const,
  },
  button: {
    backgroundColor: Colors.light.danger,
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
