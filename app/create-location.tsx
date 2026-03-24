import React, { useState, useEffect, useRef } from "react";
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

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== "web") {
  try {
    const maps = require("react-native-maps");
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch {
    // react-native-maps not available
  }
}

const DEFAULT_REGION = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export default function CreateLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!params.editId;
  const mapRef = useRef<any>(null);

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
  const [markerCoord, setMarkerCoord] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [manualExpanded, setManualExpanded] = useState(false);

  const showMap = Platform.OS !== "web" && MapView !== null;

  const animateToCoord = (lat: number, lng: number) => {
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500
      );
    }
  };

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
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setLatitude(lat.toFixed(6));
            setLongitude(lng.toFixed(6));
            setMarkerCoord({ latitude: lat, longitude: lng });
            animateToCoord(lat, lng);
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
      const LocationModule = await import("expo-location");
      const { status } = await LocationModule.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const perm = await LocationModule.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") {
          setError("Location permission not granted");
          setGpsLoading(false);
          return;
        }
      }
      const loc = await LocationModule.getCurrentPositionAsync({
        accuracy: LocationModule.Accuracy.High,
      });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      setMarkerCoord({ latitude: lat, longitude: lng });
      animateToCoord(lat, lng);
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
      const lat = parseFloat(String(existingLoc.latitude));
      const lng = parseFloat(String(existingLoc.longitude));
      if (!isNaN(lat) && !isNaN(lng)) {
        setMarkerCoord({ latitude: lat, longitude: lng });
      }
      setInitialized(true);
    }
  }, [isEditing, existingLoc, initialized]);

  const safeZones = zones || [];

  const initialRegion =
    isEditing && existingLoc
      ? {
          latitude: parseFloat(String(existingLoc.latitude)) || DEFAULT_REGION.latitude,
          longitude: parseFloat(String(existingLoc.longitude)) || DEFAULT_REGION.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : DEFAULT_REGION;

  const handleMapPress = (e: any) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    setMarkerCoord({ latitude: lat, longitude: lng });
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
  };

  const handleMarkerDragEnd = (e: any) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    setMarkerCoord({ latitude: lat, longitude: lng });
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || lat < -90 || lat > 90)
        throw new Error("Latitude must be between -90 and 90");
      if (isNaN(lng) || lng < -180 || lng > 180)
        throw new Error("Longitude must be between -180 and 180");

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

      {showMap ? (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pick Location on Map *</Text>
          <Text style={styles.hint}>
            Tap the map to place a marker, or drag the marker to adjust.
          </Text>
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={initialRegion}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {markerCoord ? (
                <Marker
                  coordinate={markerCoord}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                  pinColor="red"
                />
              ) : null}
            </MapView>
          </View>
          {markerCoord ? (
            <Text style={styles.coordPreview}>
              {markerCoord.latitude.toFixed(6)}, {markerCoord.longitude.toFixed(6)}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.inputGroup}>
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

      {showMap ? (
        <View style={styles.inputGroup}>
          <Pressable
            style={styles.collapseToggle}
            onPress={() => setManualExpanded((prev) => !prev)}
          >
            <Feather
              name={manualExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.light.tabIconDefault}
            />
            <Text style={styles.collapseToggleText}>Manual coordinates</Text>
          </Pressable>
          {manualExpanded ? (
            <View style={styles.manualSection}>
              <View style={styles.coordRow}>
                <View style={styles.coordInput}>
                  <Text style={styles.coordLabel}>Latitude</Text>
                  <TextInput
                    style={styles.input}
                    value={latitude}
                    onChangeText={(val) => {
                      setLatitude(val);
                      const lat = parseFloat(val);
                      const lng = parseFloat(longitude);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        setMarkerCoord({ latitude: lat, longitude: lng });
                      }
                    }}
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
                    onChangeText={(val) => {
                      setLongitude(val);
                      const lat = parseFloat(latitude);
                      const lng = parseFloat(val);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        setMarkerCoord({ latitude: lat, longitude: lng });
                      }
                    }}
                    placeholder="46.7167"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
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
        </View>
      )}

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
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginTop: 4,
  },
  map: {
    flex: 1,
  },
  coordPreview: {
    fontSize: 13,
    color: Colors.light.tabIconDefault,
    textAlign: "center" as const,
    marginTop: 4,
  },
  collapseToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 8,
  },
  collapseToggleText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    fontWeight: "500" as const,
  },
  manualSection: {
    gap: 6,
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
