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

export default function CreateLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addLocation = useAppStore((s) => s.addLocation);
  const setZones = useAppStore((s) => s.setZones);

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
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
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng)) throw new Error("Invalid coordinates");
      if (lat < -90 || lat > 90) throw new Error("Latitude must be -90 to 90");
      if (lng < -180 || lng > 180) throw new Error("Longitude must be -180 to 180");

      const res = await apiRequest("POST", "/api/locations", {
        name: name.trim(),
        latitude: lat,
        longitude: lng,
        zoneId: selectedZoneId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      addLocation(data);
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      router.back();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Location name is required");
      return;
    }
    if (!latitude.trim() || !longitude.trim()) {
      setError("Latitude and longitude are required");
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
        <Text style={styles.label}>Location Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Main Entrance"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Latitude *</Text>
          <TextInput
            style={styles.input}
            value={latitude}
            onChangeText={setLatitude}
            placeholder="-33.8688"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Longitude *</Text>
          <TextInput
            style={styles.input}
            value={longitude}
            onChangeText={setLongitude}
            placeholder="151.2093"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
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
              No Zone
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
          <Text style={styles.buttonText}>Add Location</Text>
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
  row: {
    flexDirection: "row" as const,
    gap: 12,
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
