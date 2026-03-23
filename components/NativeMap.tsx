import React from "react";
import MapView, { Polygon } from "react-native-maps";
import type { Zone } from "@shared/schema";

interface NativeMapProps {
  zones: Zone[];
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

export default function NativeMap({ zones }: NativeMapProps) {
  const safeZones = (zones || []).filter((z) => z && isValidPolygon(z.polygon));

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
        return (
          <Polygon
            key={zone.id}
            coordinates={poly}
            fillColor={`${zone.color || "#FF0000"}33`}
            strokeColor={zone.color || "#FF0000"}
            strokeWidth={2}
          />
        );
      })}
    </MapView>
  );
}
