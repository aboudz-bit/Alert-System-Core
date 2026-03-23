import React, { useMemo } from "react";
import MapView, { Polygon, Marker } from "react-native-maps";
import type { Zone, Location, Alert } from "@shared/schema";
import type { WindData } from "@/lib/store";

interface NativeMapProps {
  zones: Zone[];
  locations?: Location[];
  activeAlerts?: Alert[];
  alertZoneIds?: Set<string>;
  windData?: WindData | null;
}

const EMPTY_SET = new Set<string>();

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

function NativeMapInner({ zones, locations, activeAlerts, alertZoneIds, windData }: NativeMapProps) {
  const safeZones = useMemo(
    () => (zones || []).filter((z) => z && isValidPolygon(z.polygon)),
    [zones]
  );
  const safeLocations = useMemo(
    () => (locations || []).filter((l) => l && isValidCoord(l.latitude, l.longitude)),
    [locations]
  );
  const safeAlertZoneIds = alertZoneIds || EMPTY_SET;

  const hazardCones = useMemo(() => {
    if (!windData || windData.speed <= 0) return [];
    const cones: Array<{ id: string; polygon: Array<{ latitude: number; longitude: number }> }> = [];

    for (const zone of safeZones) {
      if (!safeAlertZoneIds.has(zone.id)) continue;
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
    windDataEqual(prev.windData, next.windData)
  );
}

const NativeMap = React.memo(NativeMapInner, propsAreEqual);
export default NativeMap;
