import React from "react";
import MapView, { Polygon, Marker } from "react-native-maps";
import type { Zone, Location, Alert } from "@shared/schema";

interface NativeMapProps {
  zones: Zone[];
  locations?: Location[];
  activeAlerts?: Alert[];
  alertZoneIds?: Set<string>;
}

function isValidPolygon(polygon: unknown): polygon is Array<{ latitude: number; longitude: number }> {
  if (!Array.isArray(polygon)) return false;
  if (polygon.length < 3) return false;
  return polygon.every(
    (p) =>
      p &&
      typeof p === "object" &&
      "latitude" in p &&
      "longitude" in p &&
      typeof p.latitude === "number" &&
      typeof p.longitude === "number" &&
      !isNaN(p.latitude) &&
      !isNaN(p.longitude) &&
      p.latitude >= -90 &&
      p.latitude <= 90 &&
      p.longitude >= -180 &&
      p.longitude <= 180
  );
}

function isValidCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export default function NativeMap({ zones, locations, activeAlerts, alertZoneIds }: NativeMapProps) {
  const safeZones = (zones || []).filter((z) => z && isValidPolygon(z.polygon));
  const safeLocations = (locations || []).filter(
    (l) => l && isValidCoord(l.latitude, l.longitude)
  );
  const safeAlertZoneIds = alertZoneIds || new Set<string>();

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: -33.8688,
        longitude: 151.2093,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      showsUserLocation={false}
    >
      {safeZones.map((zone) => {
        const poly = zone.polygon as Array<{ latitude: number; longitude: number }>;
        const hasAlert = safeAlertZoneIds.has(zone.id);
        return (
          <Polygon
            key={zone.id}
            coordinates={poly}
            fillColor={hasAlert ? "#FF3B3044" : `${zone.color || "#FF0000"}33`}
            strokeColor={hasAlert ? "#FF3B30" : (zone.color || "#FF0000")}
            strokeWidth={hasAlert ? 3 : 2}
          />
        );
      })}
      {safeLocations.map((loc) => (
        <Marker
          key={loc.id}
          coordinate={{
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
          }}
          title={loc.name}
          pinColor="#007AFF"
        />
      ))}
    </MapView>
  );
}
