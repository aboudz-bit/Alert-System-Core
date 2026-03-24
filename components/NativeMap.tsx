import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import MapView, { Polygon, Marker, Callout } from "react-native-maps";
import type { Zone, Location, Alert } from "@shared/schema";
import type { WindData } from "@/lib/store";

export interface PersonnelMarker {
  id: string;
  name: string;
  status: "safe" | "pending" | "need_help" | "no_reply";
  latitude: number;
  longitude: number;
}

interface NativeMapProps {
  zones: Zone[];
  locations?: Location[];
  activeAlerts?: Alert[];
  alertZoneIds?: Set<string>;
  windData?: WindData | null;
  personnel?: PersonnelMarker[];
}

const EMPTY_SET = new Set<string>();

const PERSONNEL_COLORS: Record<PersonnelMarker["status"], string> = {
  safe: "#34C759",
  pending: "#FF9500",
  need_help: "#FF3B30",
  no_reply: "#8E8E93",
};

const ZONE_TYPE_FILL: Record<string, { fill: string; stroke: string }> = {
  general: { fill: "33", stroke: "" },
  alert: { fill: "#FF3B3044", stroke: "#FF3B30" },
  hot: { fill: "#FF950044", stroke: "#FF9500" },
  warm: { fill: "#FFCC0033", stroke: "#FFCC00" },
  safe: { fill: "#34C75933", stroke: "#34C759" },
};

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

function computePolygonCentroid(
  polygon: Array<{ latitude: number; longitude: number }>
): { latitude: number; longitude: number } {
  let latSum = 0;
  let lngSum = 0;
  for (const p of polygon) {
    latSum += p.latitude;
    lngSum += p.longitude;
  }
  return {
    latitude: latSum / polygon.length,
    longitude: lngSum / polygon.length,
  };
}

function computeHazardCone(
  centroid: { latitude: number; longitude: number },
  windDirection: number,
  windSpeed: number
): Array<{ latitude: number; longitude: number }> | null {
  if (windSpeed <= 0) return null;

  const dirRad = ((windDirection + 180) % 360) * (Math.PI / 180);

  const reach = Math.min(0.005 + windSpeed * 0.0003, 0.03);
  const spreadAngle = 25 * (Math.PI / 180);

  const tipLat = centroid.latitude + reach * Math.cos(dirRad);
  const tipLng = centroid.longitude + reach * Math.sin(dirRad);

  const leftLat = centroid.latitude + reach * 0.7 * Math.cos(dirRad - spreadAngle);
  const leftLng = centroid.longitude + reach * 0.7 * Math.sin(dirRad - spreadAngle);

  const rightLat = centroid.latitude + reach * 0.7 * Math.cos(dirRad + spreadAngle);
  const rightLng = centroid.longitude + reach * 0.7 * Math.sin(dirRad + spreadAngle);

  const points = [
    centroid,
    { latitude: leftLat, longitude: leftLng },
    { latitude: tipLat, longitude: tipLng },
    { latitude: rightLat, longitude: rightLng },
  ];

  for (const p of points) {
    if (!isValidCoord(p.latitude, p.longitude)) return null;
  }

  return points;
}

const STATUS_LABELS: Record<PersonnelMarker["status"], string> = {
  safe: "Safe",
  pending: "Pending",
  need_help: "Need Help",
  no_reply: "No Reply",
};

function PersonnelDot({ color }: { color: string }) {
  return (
    <View style={markerStyles.outer}>
      <View style={[markerStyles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const markerStyles = StyleSheet.create({
  outer: {
    width: 20,
    height: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
});

function computeInitialRegion(
  zones: Zone[],
  locations: Array<{ latitude: number; longitude: number }>
) {
  const allPoints: Array<{ latitude: number; longitude: number }> = [];

  for (const z of zones) {
    if (isValidPolygon(z.polygon)) {
      for (const p of z.polygon as Array<{ latitude: number; longitude: number }>) {
        allPoints.push(p);
      }
    }
  }

  for (const loc of locations) {
    if (isValidCoord(loc.latitude, loc.longitude)) {
      allPoints.push({ latitude: loc.latitude, longitude: loc.longitude });
    }
  }

  if (allPoints.length === 0) {
    return {
      latitude: 24.7136,
      longitude: 46.6753,
      latitudeDelta: 2,
      longitudeDelta: 2,
    };
  }

  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  for (const p of allPoints) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }

  const latDelta = Math.max((maxLat - minLat) * 1.5, 0.005);
  const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.005);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

function NativeMapInner({ zones, locations, activeAlerts, alertZoneIds, windData, personnel }: NativeMapProps) {
  const safeZones = useMemo(
    () => (zones || []).filter((z) => z && isValidPolygon(z.polygon)),
    [zones]
  );
  const safeLocations = useMemo(
    () => (locations || []).filter((l) => l && isValidCoord(l.latitude, l.longitude)),
    [locations]
  );
  const safePersonnel = useMemo(
    () => (personnel || []).filter((p) => p && isValidCoord(p.latitude, p.longitude)),
    [personnel]
  );
  const safeAlertZoneIds = alertZoneIds || EMPTY_SET;

  const initialRegion = useMemo(
    () => computeInitialRegion(zones || [], safeLocations),
    [zones, safeLocations]
  );

  const hazardCones = useMemo(() => {
    if (!windData || windData.speed <= 0) return [];
    const cones: Array<{ id: string; polygon: Array<{ latitude: number; longitude: number }> }> = [];

    for (const zone of safeZones) {
      const zt = (zone as any).zoneType || "general";
      if (!safeAlertZoneIds.has(zone.id) && zt !== "alert" && zt !== "hot") continue;
      const poly = zone.polygon as Array<{ latitude: number; longitude: number }>;
      const centroid = computePolygonCentroid(poly);
      const cone = computeHazardCone(centroid, windData.direction, windData.speed);
      if (cone) {
        cones.push({ id: `hazard-${zone.id}`, polygon: cone });
      }
    }
    return cones;
  }, [safeZones, safeAlertZoneIds, windData]);

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      showsUserLocation={false}
    >
      {safeZones.map((zone) => {
        const poly = zone.polygon as Array<{ latitude: number; longitude: number }>;
        const hasAlert = safeAlertZoneIds.has(zone.id);
        const zt = (zone as any).zoneType || "general";
        const typeStyle = ZONE_TYPE_FILL[zt] || ZONE_TYPE_FILL.general;

        let fillColor: string;
        let strokeColor: string;
        let strokeWidth = 2;

        if (hasAlert) {
          fillColor = "#FF3B3044";
          strokeColor = "#FF3B30";
          strokeWidth = 3;
        } else if (zt !== "general" && typeStyle.stroke) {
          fillColor = typeStyle.fill;
          strokeColor = typeStyle.stroke;
          strokeWidth = 2;
        } else {
          fillColor = `${zone.color || "#FF0000"}33`;
          strokeColor = zone.color || "#FF0000";
        }

        return (
          <Polygon
            key={zone.id}
            coordinates={poly}
            fillColor={fillColor}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      })}
      {hazardCones.map((cone) => (
        <Polygon
          key={cone.id}
          coordinates={cone.polygon}
          fillColor="#FF940040"
          strokeColor="#FF9400"
          strokeWidth={2}
          lineDashPattern={[6, 4]}
        />
      ))}
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
      {safePersonnel.map((p) => {
        const color = PERSONNEL_COLORS[p.status];
        return (
          <Marker
            key={`person-${p.id}`}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={p.name}
            description={STATUS_LABELS[p.status]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <PersonnelDot color={color} />
          </Marker>
        );
      })}
    </MapView>
  );
}

function windDataEqual(a?: WindData | null, b?: WindData | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.direction === b.direction && a.speed === b.speed;
}

function propsAreEqual(prev: NativeMapProps, next: NativeMapProps): boolean {
  return (
    prev.zones === next.zones &&
    prev.locations === next.locations &&
    prev.activeAlerts === next.activeAlerts &&
    prev.alertZoneIds === next.alertZoneIds &&
    prev.personnel === next.personnel &&
    windDataEqual(prev.windData, next.windData)
  );
}

const NativeMap = React.memo(NativeMapInner, propsAreEqual);
export default NativeMap;
