import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { loginAs, mockUser, setupTestServer } from "./helpers/test-harness";
import { hashPassword } from "../routes";

vi.mock("../db", () => ({
  pool: { query: vi.fn(), on: vi.fn() },
  db: {},
}));

vi.mock("../storage", () => {
  return {
    storage: {
      getUser: vi.fn(),
      getUserByUsername: vi.fn(),
      getUsers: vi.fn().mockResolvedValue([]),
      createUser: vi.fn(),
      updateUserAssignment: vi.fn(),
      updateUserLocation: vi.fn(),
      getZones: vi.fn().mockResolvedValue([]),
      getZone: vi.fn(),
      createZone: vi.fn(),
      updateZone: vi.fn(),
      deleteZone: vi.fn(),
      getLocations: vi.fn().mockResolvedValue([]),
      getLocation: vi.fn(),
      createLocation: vi.fn(),
      updateLocation: vi.fn(),
      deleteLocation: vi.fn(),
      getAlerts: vi.fn().mockResolvedValue([]),
      getAlert: vi.fn(),
      createAlert: vi.fn(),
      updateAlert: vi.fn(),
      clearAlert: vi.fn(),
      deleteAlert: vi.fn(),
      getActiveEmergencyMode: vi.fn(),
      getEmergencyModes: vi.fn().mockResolvedValue([]),
      activateEmergencyMode: vi.fn(),
      clearEmergencyMode: vi.fn(),
      confirmReceipt: vi.fn(),
      setResponseStatus: vi.fn(),
      getReceiptsByMode: vi.fn().mockResolvedValue([]),
      getUserReceipt: vi.fn(),
      getWindCondition: vi.fn(),
      updateWindCondition: vi.fn(),
    },
    DatabaseStorage: vi.fn(),
  };
});

import * as storageMod from "../storage";
const ctx = setupTestServer(storageMod);

// ---- Test fixtures ----

// Zone A: square from (0,0) to (10,10)
const zoneA = {
  id: "zone-a",
  name: "Zone A",
  polygon: [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 10 },
    { latitude: 10, longitude: 10 },
    { latitude: 10, longitude: 0 },
  ],
  color: "#FF0000",
  zoneType: "hot" as const,
  description: "",
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Zone B: square from (20,20) to (30,30)
const zoneB = {
  id: "zone-b",
  name: "Zone B",
  polygon: [
    { latitude: 20, longitude: 20 },
    { latitude: 20, longitude: 30 },
    { latitude: 30, longitude: 30 },
    { latitude: 30, longitude: 20 },
  ],
  color: "#00FF00",
  zoneType: "safe" as const,
  description: "",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const alertZoneA = {
  id: "alert-a",
  title: "Zone A Alert",
  description: "",
  severity: "critical" as const,
  status: "active" as const,
  zoneId: "zone-a",
  createdBy: "admin-1",
  createdAt: new Date(),
  clearedAt: null,
};

const alertZoneB = {
  id: "alert-b",
  title: "Zone B Alert",
  description: "",
  severity: "high" as const,
  status: "active" as const,
  zoneId: "zone-b",
  createdBy: "admin-1",
  createdAt: new Date(),
  clearedAt: null,
};

const alertGlobal = {
  id: "alert-global",
  title: "Global Alert",
  description: "",
  severity: "medium" as const,
  status: "active" as const,
  zoneId: null,
  createdBy: "admin-1",
  createdAt: new Date(),
  clearedAt: null,
};

const password = "password123";
const hashed = hashPassword(password);

/**
 * Helper: login as a specific user object and return cookie.
 */
async function loginAsUser(user: Record<string, unknown>) {
  vi.mocked(ctx.storage.getUserByUsername).mockResolvedValueOnce(user as any);
  const res = await request(ctx.app)
    .post("/api/auth/login")
    .send({ username: user.username, password });
  return res.headers["set-cookie"];
}

/**
 * Helper: fetch alerts and return array of alert IDs.
 */
async function fetchAlertIds(cookie: string[]) {
  const res = await request(ctx.app)
    .get("/api/alerts")
    .set("Cookie", cookie);
  expect(res.status).toBe(200);
  return (res.body as Array<{ id: string }>).map((a) => a.id);
}

describe("Alerts filtering with location updates", () => {
  it("user inside zone A sees zone A alert", async () => {
    const user = mockUser({
      id: "u1", username: "u1", password: hashed,
      currentLatitude: 5, currentLongitude: 5, // inside zone A
    });
    const cookie = await loginAsUser(user);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA, alertZoneB]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(user as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA, zoneB]);

    const ids = await fetchAlertIds(cookie);
    expect(ids).toContain("alert-a");
    expect(ids).not.toContain("alert-b");
  });

  it("user outside both zones sees no zone alerts", async () => {
    const user = mockUser({
      id: "u2", username: "u2", password: hashed,
      currentLatitude: 50, currentLongitude: 50, // outside both
    });
    const cookie = await loginAsUser(user);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA, alertZoneB]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(user as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA, zoneB]);

    const ids = await fetchAlertIds(cookie);
    expect(ids).toHaveLength(0);
  });

  it("user moves from zone A to zone B — sees only zone B alert", async () => {
    // Simulate: user was in zone A, now their stored location is in zone B.
    // The filtering reads currentLatitude/currentLongitude from storage.getUser.
    const user = mockUser({
      id: "u3", username: "u3", password: hashed,
      currentLatitude: 25, currentLongitude: 25, // now in zone B
    });
    const cookie = await loginAsUser(user);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA, alertZoneB]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(user as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA, zoneB]);

    const ids = await fetchAlertIds(cookie);
    expect(ids).not.toContain("alert-a");
    expect(ids).toContain("alert-b");
  });

  it("user moves from outside to inside zone A — sees zone A alert", async () => {
    const user = mockUser({
      id: "u4", username: "u4", password: hashed,
      currentLatitude: 5, currentLongitude: 5, // inside zone A after move
    });
    const cookie = await loginAsUser(user);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA, alertGlobal]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(user as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA, zoneB]);

    const ids = await fetchAlertIds(cookie);
    expect(ids).toContain("alert-a");
    expect(ids).toContain("alert-global");
  });

  it("user with null location sees only global alerts, not zone alerts", async () => {
    const user = mockUser({
      id: "u5", username: "u5", password: hashed,
      currentLatitude: null, currentLongitude: null,
    });
    const cookie = await loginAsUser(user);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA, alertZoneB, alertGlobal]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(user as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA, zoneB]);

    const ids = await fetchAlertIds(cookie);
    expect(ids).toEqual(["alert-global"]);
  });

  it("user on zone boundary edge — outside at (0, 5) lat=0", async () => {
    // Point exactly on edge is implementation-dependent for ray casting.
    // With this polygon winding, (lat=0, lng=5) is on the bottom edge.
    // The algorithm may or may not include boundary points.
    // We test that it doesn't crash and returns a boolean result.
    const user = mockUser({
      id: "u6", username: "u6", password: hashed,
      currentLatitude: 0, currentLongitude: 5,
    });
    const cookie = await loginAsUser(user);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(user as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA]);

    const res = await request(ctx.app)
      .get("/api/alerts")
      .set("Cookie", cookie);

    // Just verify it doesn't error — boundary behavior is acceptable either way
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("user inside both overlapping zones sees both zone alerts", async () => {
    // Create an overlapping zone that covers same area as zone A
    const zoneC = {
      ...zoneA,
      id: "zone-c",
      name: "Zone C (overlapping A)",
    };
    const alertZoneC = {
      ...alertZoneA,
      id: "alert-c",
      title: "Zone C Alert",
      zoneId: "zone-c",
    };

    const user = mockUser({
      id: "u7", username: "u7", password: hashed,
      currentLatitude: 5, currentLongitude: 5, // inside both A and C
    });
    const cookie = await loginAsUser(user);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA, alertZoneC]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(user as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA, zoneC]);

    const ids = await fetchAlertIds(cookie);
    expect(ids).toContain("alert-a");
    expect(ids).toContain("alert-c");
  });

  it("user at exact center of zone A sees zone A alert", async () => {
    const user = mockUser({
      id: "u8", username: "u8", password: hashed,
      currentLatitude: 5, currentLongitude: 5,
    });
    const cookie = await loginAsUser(user);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(user as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA]);

    const ids = await fetchAlertIds(cookie);
    expect(ids).toContain("alert-a");
  });

  it("user just barely inside zone A corner sees zone A alert", async () => {
    const user = mockUser({
      id: "u9", username: "u9", password: hashed,
      currentLatitude: 0.001, currentLongitude: 0.001, // just inside corner
    });
    const cookie = await loginAsUser(user);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(user as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA]);

    const ids = await fetchAlertIds(cookie);
    expect(ids).toContain("alert-a");
  });

  it("user just barely outside zone A sees no zone A alert", async () => {
    const user = mockUser({
      id: "u10", username: "u10", password: hashed,
      currentLatitude: 10.001, currentLongitude: 5, // just above zone A
    });
    const cookie = await loginAsUser(user);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(user as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA]);

    const ids = await fetchAlertIds(cookie);
    expect(ids).not.toContain("alert-a");
  });

  it("sequential location changes result in different alert visibility", async () => {
    // First request: user in zone A
    const userInA = mockUser({
      id: "u11", username: "u11", password: hashed,
      currentLatitude: 5, currentLongitude: 5,
    });
    const cookie = await loginAsUser(userInA);

    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA, alertZoneB]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(userInA as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA, zoneB]);

    const ids1 = await fetchAlertIds(cookie);
    expect(ids1).toContain("alert-a");
    expect(ids1).not.toContain("alert-b");

    // Second request: same session, but storage now returns updated location in zone B
    const userInB = { ...userInA, currentLatitude: 25, currentLongitude: 25 };
    vi.mocked(ctx.storage.getAlerts).mockResolvedValueOnce([alertZoneA, alertZoneB]);
    vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(userInB as any);
    vi.mocked(ctx.storage.getZones).mockResolvedValueOnce([zoneA, zoneB]);

    const ids2 = await fetchAlertIds(cookie);
    expect(ids2).not.toContain("alert-a");
    expect(ids2).toContain("alert-b");
  });
});
