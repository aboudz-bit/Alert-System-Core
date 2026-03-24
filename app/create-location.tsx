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
import type { Zone, Location } from "@shared/schema";

export default function CreateLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!params.editId;

  const { data: zones } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: existingLoc } = useQuery<Location>({
    queryKey: ["/api/locations", params.editId],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isEditing,
  });

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleUseMyLocation = async () => {
    setGpsLoading(true);
    setError("");
    try {
      if (Platform.OS === "web") {
        if (!navigator.geolocation) {
          setError("Geolocation not available in this browser");
          setGpsLoading(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLatitude(pos.coords.latitude.toFixed(6));
            setLongitude(pos.coords.longitude.toFixed(6));
            setGpsLoading(false);
          },
          () => {
            setError("Could not get location. Check browser permissions.");
            setGpsLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
        return;
      }
      const Location = await import("expo-location");
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") {
          setError("Location permission not granted");
          setGpsLoading(false);
          return;
        }
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
    } catch {
      setError("Could not get current location");
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    if (isEditing && existingLoc && !initialized) {
      setName(existingLoc.name);
      setLatitude(String(existingLoc.latitude));
      setLongitude(String(existingLoc.longitude));
      setZoneId(existingLoc.zoneId);
      setInitialized(true);
    }
  }, [isEditing, existingLoc, initialized]);

  const safeZones = zones || [];

  const mutation = useMutation({
    mutationFn: async () => {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) throw new Error("Latitude must be between -90 and 90");
      if (isNaN(lng) || lng < -180 || lng > 180) throw new Error("Longitude must be between -180 and 180");

      const body: any = {
        name: name.trim(),
        latitude: lat,
        longitude: lng,
      };
      if (zoneId) body.zoneId = zoneId;

      if (isEditing) {
        const res = await apiRequest("PUT", `/api/locations/${params.editId}`, body);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/locations", body);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      router.back();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSave = () => {
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
          placeholder="e.g. Assembly Point A"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Coordinates *</Text>
        <Text style={styles.hint}>
          Enter latitude and longitude. Tip: Long-press on Google Maps to copy coordinates.
        </Text>
        <View style={styles.coordRow}>
          <View style={styles.coordInput}>
            <Text style={styles.coordLabel}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={latitude}
              onChangeText={setLatitude}
              placeholder="24.6333"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.coordInput}>
            <Text style={styles.coordLabel}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={longitude}
              onChangeText={setLongitude}
              placeholder="46.7167"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.gpsButton,
            pressed && { opacity: 0.85 },
            gpsLoading && { opacity: 0.6 },
          ]}
          onPress={handleUseMyLocation}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={Colors.light.tint} />
          ) : (
            <Feather name="crosshair" size={16} color={Colors.light.tint} />
          )}
          <Text style={styles.gpsButtonText}>Use My Current Location</Text>
        </Pressable>
      </View>

      {safeZones.length > 0 ? (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Zone (optional)</Text>
          <View style={styles.zoneList}>
            <Pressable
              style={[styles.zoneOption, !zoneId && styles.zoneSelected]}
              onPress={() => setZoneId(null)}
            >
              <Text style={[styles.zoneText, !zoneId && styles.zoneTextSelected]}>None</Text>
            </Pressable>
            {safeZones.map((z) => (
              <Pressable
                key={z.id}
                style={[styles.zoneOption, zoneId === z.id && styles.zoneSelected]}
                onPress={() => setZoneId(z.id)}
              >
                <View style={[styles.zoneDot, { backgroundColor: z.color || "#FF0000" }]} />
                <Text style={[styles.zoneText, zoneId === z.id && styles.zoneTextSelected]}>
                  {z.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

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
          <Text style={styles.buttonText}>{isEditing ? "Save Changes" : "Create Location"}</Text>
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
  coordRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 4,
  },
  coordInput: {
    flex: 1,
    gap: 4,
  },
  coordLabel: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  gpsButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    backgroundColor: `${Colors.light.tint}08`,
    marginTop: 4,
  },
  gpsButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  zoneList: {
    gap: 6,
    marginTop: 4,
  },
  zoneOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
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
  zoneText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  zoneTextSelected: {
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
