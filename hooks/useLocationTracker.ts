import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { apiRequest } from "@/lib/query-client";

const LOCATION_UPDATE_INTERVAL = 30000;

export function useLocationTracker(isAuthenticated: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPermissionGranted(null);
      return;
    }

    let cancelled = false;

    async function checkAndRequestPermission(): Promise<boolean> {
      if (Platform.OS === "web") {
        if (!navigator.geolocation) return false;
        return true;
      }

      try {
        const Location = await import("expo-location");
        const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
        if (existingStatus === "granted") return true;

        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === "granted";
      } catch {
        return false;
      }
    }

    async function sendLocation() {
      try {
        if (Platform.OS === "web") {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              if (
                lastSentRef.current &&
                Math.abs(lastSentRef.current.lat - lat) < 0.00001 &&
                Math.abs(lastSentRef.current.lng - lng) < 0.00001
              ) {
                return;
              }
              try {
                await apiRequest("POST", "/api/location/update", {
                  latitude: lat,
                  longitude: lng,
                });
                lastSentRef.current = { lat, lng };
              } catch {}
            },
            () => {},
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 15000 }
          );
          return;
        }

        const Location = await import("expo-location");
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;

        if (
          lastSentRef.current &&
          Math.abs(lastSentRef.current.lat - lat) < 0.00001 &&
          Math.abs(lastSentRef.current.lng - lng) < 0.00001
        ) {
          return;
        }

        await apiRequest("POST", "/api/location/update", {
          latitude: lat,
          longitude: lng,
        });
        lastSentRef.current = { lat, lng };
      } catch {}
    }

    async function init() {
      const granted = await checkAndRequestPermission();
      if (cancelled) return;
      setPermissionGranted(granted);

      if (!granted) return;

      sendLocation();
      intervalRef.current = setInterval(sendLocation, LOCATION_UPDATE_INTERVAL);
    }

    init();

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated]);

  return { permissionGranted };
}
