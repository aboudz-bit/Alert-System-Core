import { create } from "zustand";
import type { Zone, Location, Alert } from "@shared/schema";

interface AppState {
  zones: Zone[];
  locations: Location[];
  alerts: Alert[];

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
}

export const useAppStore = create<AppState>((set) => ({
  zones: [],
  locations: [],
  alerts: [],

  setZones: (zones) => set({ zones: Array.isArray(zones) ? zones : [] }),
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

  setLocations: (locations) =>
    set({ locations: Array.isArray(locations) ? locations : [] }),
  addLocation: (location) =>
    set((state) => ({
      locations: [...(state.locations || []), location],
    })),
  removeLocation: (id) =>
    set((state) => ({
      locations: (state.locations || []).filter((l) => l.id !== id),
    })),

  setAlerts: (alerts) =>
    set({ alerts: Array.isArray(alerts) ? alerts : [] }),
  addAlert: (alert) =>
    set((state) => ({ alerts: [...(state.alerts || []), alert] })),
  updateAlert: (id, updates) =>
    set((state) => ({
      alerts: (state.alerts || []).map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),
}));

export const selectZones = (state: AppState) => state.zones || [];
export const selectLocations = (state: AppState) => state.locations || [];
export const selectAlerts = (state: AppState) => state.alerts || [];
export const selectActiveAlerts = (state: AppState) =>
  (state.alerts || []).filter((a) => a.status === "active");
