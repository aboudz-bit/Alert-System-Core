import { create } from "zustand";
import type { Zone, Location, Alert, EmergencyMode, WindCondition } from "@shared/schema";

export interface WindData {
  direction: number;
  speed: number;
}

interface AppState {
  zones: Zone[];
  locations: Location[];
  alerts: Alert[];
  emergencyMode: EmergencyMode | null;
  windData: WindData | null;

  setZones: (zones: Zone[]) => void;
  addZone: (zone: Zone) => void;
  updateZone: (id: string, zone: Partial<Zone>) => void;
  removeZone: (id: string) => void;

  setLocations: (locations: Location[]) => void;
  addLocation: (location: Location) => void;
  removeLocation: (id: string) => void;

  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, alert: Partial<Alert>) => void;

  setEmergencyMode: (mode: EmergencyMode | null) => void;
  setWindData: (wind: WindData | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  zones: [],
  locations: [],
  alerts: [],
  emergencyMode: null,
  windData: null,

  setZones: (zones) => {
    const arr = Array.isArray(zones) ? zones : [];
    if (arr === get().zones) return;
    set({ zones: arr });
  },
  addZone: (zone) =>
    set((state) => ({ zones: [...(state.zones || []), zone] })),
  updateZone: (id, updates) =>
    set((state) => ({
      zones: (state.zones || []).map((z) =>
        z.id === id ? { ...z, ...updates } : z
      ),
    })),
  removeZone: (id) =>
    set((state) => ({
      zones: (state.zones || []).filter((z) => z.id !== id),
    })),

  setLocations: (locations) => {
    const arr = Array.isArray(locations) ? locations : [];
    if (arr === get().locations) return;
    set({ locations: arr });
  },
  addLocation: (location) =>
    set((state) => ({
      locations: [...(state.locations || []), location],
    })),
  removeLocation: (id) =>
    set((state) => ({
      locations: (state.locations || []).filter((l) => l.id !== id),
    })),

  setAlerts: (alerts) => {
    const arr = Array.isArray(alerts) ? alerts : [];
    if (arr === get().alerts) return;
    set({ alerts: arr });
  },
  addAlert: (alert) =>
    set((state) => ({ alerts: [...(state.alerts || []), alert] })),
  updateAlert: (id, updates) =>
    set((state) => ({
      alerts: (state.alerts || []).map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  setEmergencyMode: (mode) => {
    const resolved = mode || null;
    const current = get().emergencyMode;
    if (resolved === null && current === null) return;
    if (resolved && current && resolved.id === current.id && resolved.status === current.status) return;
    set({ emergencyMode: resolved });
  },
  setWindData: (wind) => {
    const current = get().windData;
    if (
      wind &&
      typeof wind.direction === "number" &&
      typeof wind.speed === "number" &&
      !isNaN(wind.direction) &&
      !isNaN(wind.speed) &&
      isFinite(wind.direction) &&
      isFinite(wind.speed) &&
      wind.direction >= 0 &&
      wind.direction <= 360 &&
      wind.speed >= 0 &&
      wind.speed <= 300
    ) {
      if (current && current.direction === wind.direction && current.speed === wind.speed) return;
      set({ windData: { direction: wind.direction, speed: wind.speed } });
    } else {
      if (current === null) return;
      set({ windData: null });
    }
  },
}));

export const selectZones = (state: AppState) => state.zones || [];
export const selectLocations = (state: AppState) => state.locations || [];
export const selectAlerts = (state: AppState) => state.alerts || [];
export const selectActiveAlerts = (state: AppState) =>
  (state.alerts || []).filter((a) => a.status === "active");
export const selectEmergencyMode = (state: AppState) => state.emergencyMode;
export const selectWindData = (state: AppState) => state.windData;
