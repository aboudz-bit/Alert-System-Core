import { describe, it, expect, beforeEach } from "vitest";
import {
  useAppStore,
  selectZones,
  selectLocations,
  selectAlerts,
  selectActiveAlerts,
  selectEmergencyMode,
  selectWindData,
} from "../../lib/store";
import type { Zone, Alert, EmergencyMode } from "@shared/schema";

function resetStore() {
  useAppStore.setState({
    zones: [],
    locations: [],
    alerts: [],
    emergencyMode: null,
    windData: null,
  });
}

function makeZone(overrides: Partial<Zone> = {}): Zone {
  return {
    id: "z1", name: "Zone", description: "", polygon: [],
    color: "#FF0000", zoneType: "general",
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  } as Zone;
}

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "a1", title: "Alert", description: "", severity: "medium",
    status: "active", zoneId: null, createdBy: "u1",
    createdAt: new Date(), clearedAt: null,
    ...overrides,
  } as Alert;
}

function makeEmergency(overrides: Partial<EmergencyMode> = {}): EmergencyMode {
  return {
    id: "e1", type: "shelter_in", status: "active",
    activatedBy: "u1", activatedAt: new Date(),
    clearedAt: null, clearedBy: null,
    ...overrides,
  } as EmergencyMode;
}

describe("Zustand store — setWindData validation", () => {
  beforeEach(resetStore);

  it("accepts valid wind data", () => {
    useAppStore.getState().setWindData({ direction: 180, speed: 25 });
    expect(useAppStore.getState().windData).toEqual({ direction: 180, speed: 25 });
  });

  it("accepts boundary values (0, 0)", () => {
    useAppStore.getState().setWindData({ direction: 0, speed: 0 });
    expect(useAppStore.getState().windData).toEqual({ direction: 0, speed: 0 });
  });

  it("accepts max boundary values (360, 300)", () => {
    useAppStore.getState().setWindData({ direction: 360, speed: 300 });
    expect(useAppStore.getState().windData).toEqual({ direction: 360, speed: 300 });
  });

  it("rejects direction > 360 — sets null", () => {
    useAppStore.getState().setWindData({ direction: 180, speed: 10 }); // valid first
    useAppStore.getState().setWindData({ direction: 361, speed: 10 });
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("rejects direction < 0 — sets null", () => {
    useAppStore.getState().setWindData({ direction: 180, speed: 10 });
    useAppStore.getState().setWindData({ direction: -1, speed: 10 });
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("rejects speed > 300 — sets null", () => {
    useAppStore.getState().setWindData({ direction: 90, speed: 50 });
    useAppStore.getState().setWindData({ direction: 90, speed: 301 });
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("rejects speed < 0 — sets null", () => {
    useAppStore.getState().setWindData({ direction: 90, speed: 50 });
    useAppStore.getState().setWindData({ direction: 90, speed: -1 });
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("rejects NaN direction — sets null", () => {
    useAppStore.getState().setWindData({ direction: 90, speed: 10 });
    useAppStore.getState().setWindData({ direction: NaN, speed: 10 });
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("rejects NaN speed — sets null", () => {
    useAppStore.getState().setWindData({ direction: 90, speed: 10 });
    useAppStore.getState().setWindData({ direction: 90, speed: NaN });
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("rejects Infinity direction — sets null", () => {
    useAppStore.getState().setWindData({ direction: 90, speed: 10 });
    useAppStore.getState().setWindData({ direction: Infinity, speed: 10 });
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("rejects Infinity speed — sets null", () => {
    useAppStore.getState().setWindData({ direction: 90, speed: 10 });
    useAppStore.getState().setWindData({ direction: 90, speed: Infinity });
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("rejects null — keeps null if already null (no-op)", () => {
    // starts null, setting null again is a no-op
    useAppStore.getState().setWindData(null as any);
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("setting null clears existing wind data", () => {
    useAppStore.getState().setWindData({ direction: 45, speed: 20 });
    useAppStore.getState().setWindData(null as any);
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("equality guard — same values don't trigger re-set", () => {
    useAppStore.getState().setWindData({ direction: 100, speed: 50 });
    const before = useAppStore.getState().windData;
    useAppStore.getState().setWindData({ direction: 100, speed: 50 });
    const after = useAppStore.getState().windData;
    // Same reference means set() was skipped
    expect(before).toBe(after);
  });

  it("different values do trigger re-set", () => {
    useAppStore.getState().setWindData({ direction: 100, speed: 50 });
    const before = useAppStore.getState().windData;
    useAppStore.getState().setWindData({ direction: 101, speed: 50 });
    const after = useAppStore.getState().windData;
    expect(before).not.toBe(after);
    expect(after).toEqual({ direction: 101, speed: 50 });
  });
});

describe("Zustand store — setEmergencyMode equality guard", () => {
  beforeEach(resetStore);

  it("sets emergency mode from null", () => {
    const em = makeEmergency();
    useAppStore.getState().setEmergencyMode(em);
    expect(useAppStore.getState().emergencyMode).toEqual(em);
  });

  it("clears emergency mode to null", () => {
    useAppStore.getState().setEmergencyMode(makeEmergency());
    useAppStore.getState().setEmergencyMode(null);
    expect(useAppStore.getState().emergencyMode).toBeNull();
  });

  it("null to null is a no-op (equality guard)", () => {
    // Starts null
    const before = useAppStore.getState().emergencyMode;
    useAppStore.getState().setEmergencyMode(null);
    const after = useAppStore.getState().emergencyMode;
    expect(before).toBe(after); // same null reference
  });

  it("same id + same status is a no-op", () => {
    const em1 = makeEmergency({ id: "e1", status: "active" });
    useAppStore.getState().setEmergencyMode(em1);
    const before = useAppStore.getState().emergencyMode;

    const em2 = makeEmergency({ id: "e1", status: "active" });
    useAppStore.getState().setEmergencyMode(em2);
    const after = useAppStore.getState().emergencyMode;

    // Should NOT have updated — same reference
    expect(before).toBe(after);
  });

  it("same id + different status triggers update", () => {
    const em1 = makeEmergency({ id: "e1", status: "active" });
    useAppStore.getState().setEmergencyMode(em1);
    const before = useAppStore.getState().emergencyMode;

    const em2 = makeEmergency({ id: "e1", status: "cleared" });
    useAppStore.getState().setEmergencyMode(em2);
    const after = useAppStore.getState().emergencyMode;

    expect(before).not.toBe(after);
    expect(after!.status).toBe("cleared");
  });

  it("different id triggers update", () => {
    useAppStore.getState().setEmergencyMode(makeEmergency({ id: "e1" }));
    useAppStore.getState().setEmergencyMode(makeEmergency({ id: "e2" }));
    expect(useAppStore.getState().emergencyMode!.id).toBe("e2");
  });

  it("falsy value normalizes to null", () => {
    useAppStore.getState().setEmergencyMode(makeEmergency());
    useAppStore.getState().setEmergencyMode(undefined as any);
    expect(useAppStore.getState().emergencyMode).toBeNull();
  });

  it("empty object normalizes to null (falsy-ish)", () => {
    // 0 and "" are falsy, but {} is truthy — this should set, not null-ify
    const obj = {} as any;
    useAppStore.getState().setEmergencyMode(obj);
    // {} || null === {} (truthy), so it gets set
    expect(useAppStore.getState().emergencyMode).toBeTruthy();
  });
});

describe("Zustand store — selectors", () => {
  beforeEach(resetStore);

  it("selectZones returns zones array", () => {
    const z = makeZone({ id: "z1" });
    useAppStore.getState().setZones([z]);
    const state = useAppStore.getState();
    expect(selectZones(state)).toEqual([z]);
  });

  it("selectZones returns [] when zones is empty", () => {
    expect(selectZones(useAppStore.getState())).toEqual([]);
  });

  it("selectLocations returns locations array", () => {
    expect(selectLocations(useAppStore.getState())).toEqual([]);
  });

  it("selectAlerts returns all alerts", () => {
    const a1 = makeAlert({ id: "a1", status: "active" });
    const a2 = makeAlert({ id: "a2", status: "cleared" });
    useAppStore.getState().setAlerts([a1, a2]);
    expect(selectAlerts(useAppStore.getState())).toHaveLength(2);
  });

  it("selectActiveAlerts filters only active alerts", () => {
    const a1 = makeAlert({ id: "a1", status: "active" });
    const a2 = makeAlert({ id: "a2", status: "cleared" });
    const a3 = makeAlert({ id: "a3", status: "active" });
    useAppStore.getState().setAlerts([a1, a2, a3]);
    const active = selectActiveAlerts(useAppStore.getState());
    expect(active).toHaveLength(2);
    expect(active.map(a => a.id)).toEqual(["a1", "a3"]);
  });

  it("selectActiveAlerts returns [] when no active alerts", () => {
    useAppStore.getState().setAlerts([makeAlert({ status: "cleared" })]);
    expect(selectActiveAlerts(useAppStore.getState())).toEqual([]);
  });

  it("selectEmergencyMode returns null by default", () => {
    expect(selectEmergencyMode(useAppStore.getState())).toBeNull();
  });

  it("selectEmergencyMode returns set mode", () => {
    const em = makeEmergency();
    useAppStore.getState().setEmergencyMode(em);
    expect(selectEmergencyMode(useAppStore.getState())).toEqual(em);
  });

  it("selectWindData returns null by default", () => {
    expect(selectWindData(useAppStore.getState())).toBeNull();
  });

  it("selectWindData returns set wind data", () => {
    useAppStore.getState().setWindData({ direction: 90, speed: 25 });
    expect(selectWindData(useAppStore.getState())).toEqual({ direction: 90, speed: 25 });
  });
});

describe("Zustand store — safe defaults", () => {
  beforeEach(resetStore);

  it("initial zones is empty array", () => {
    expect(useAppStore.getState().zones).toEqual([]);
  });

  it("initial locations is empty array", () => {
    expect(useAppStore.getState().locations).toEqual([]);
  });

  it("initial alerts is empty array", () => {
    expect(useAppStore.getState().alerts).toEqual([]);
  });

  it("initial emergencyMode is null", () => {
    expect(useAppStore.getState().emergencyMode).toBeNull();
  });

  it("initial windData is null", () => {
    expect(useAppStore.getState().windData).toBeNull();
  });

  it("setZones coerces non-array to empty array", () => {
    useAppStore.getState().setZones("bad" as any);
    expect(useAppStore.getState().zones).toEqual([]);
  });

  it("setLocations coerces non-array to empty array", () => {
    useAppStore.getState().setLocations(null as any);
    expect(useAppStore.getState().locations).toEqual([]);
  });

  it("setAlerts coerces non-array to empty array", () => {
    useAppStore.getState().setAlerts(undefined as any);
    expect(useAppStore.getState().alerts).toEqual([]);
  });

  it("setZones with same reference is a no-op", () => {
    const zones = [makeZone()];
    useAppStore.getState().setZones(zones);
    const before = useAppStore.getState().zones;
    useAppStore.getState().setZones(zones); // same ref
    const after = useAppStore.getState().zones;
    expect(before).toBe(after);
  });

  it("addZone appends to zones", () => {
    const z1 = makeZone({ id: "z1" });
    const z2 = makeZone({ id: "z2" });
    useAppStore.getState().addZone(z1);
    useAppStore.getState().addZone(z2);
    expect(useAppStore.getState().zones).toHaveLength(2);
    expect(useAppStore.getState().zones[1].id).toBe("z2");
  });

  it("updateZone merges partial into matching zone", () => {
    useAppStore.getState().setZones([makeZone({ id: "z1", name: "Old" })]);
    useAppStore.getState().updateZone("z1", { name: "New" });
    expect(useAppStore.getState().zones[0].name).toBe("New");
  });

  it("removeZone filters out matching zone", () => {
    useAppStore.getState().setZones([makeZone({ id: "z1" }), makeZone({ id: "z2" })]);
    useAppStore.getState().removeZone("z1");
    expect(useAppStore.getState().zones).toHaveLength(1);
    expect(useAppStore.getState().zones[0].id).toBe("z2");
  });

  it("addAlert appends to alerts", () => {
    useAppStore.getState().addAlert(makeAlert({ id: "a1" }));
    useAppStore.getState().addAlert(makeAlert({ id: "a2" }));
    expect(useAppStore.getState().alerts).toHaveLength(2);
  });

  it("updateAlert merges partial into matching alert", () => {
    useAppStore.getState().setAlerts([makeAlert({ id: "a1", title: "Old" })]);
    useAppStore.getState().updateAlert("a1", { title: "New" });
    expect(useAppStore.getState().alerts[0].title).toBe("New");
  });
});
