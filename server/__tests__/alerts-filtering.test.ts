import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { hashPassword } from "../routes";

// Mock db module to avoid DATABASE_URL requirement
vi.mock("../db", () => ({
  pool: { query: vi.fn(), on: vi.fn() },
  db: {},
}));

// Mock storage with inline factory (vi.mock is hoisted)
vi.mock("../storage", () => {
  return {
    storage: {
      getUser: vi.fn(),
      getUserByUsername: vi.fn(),
      getUsers: vi.fn().mockResolvedValue([]),
      createUser: vi.fn(),
      updateUserAssignment: vi.fn(),
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

import { storage } from "../storage";
import { createTestApp } from "./helpers/create-app";
import type { Server } from "http";

let app: import("express").Express;
let server: Server;

beforeAll(async () => {
  const result = await createTestApp();
  app = result.app;
  server = result.server;
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

// Helpers
const password = "password123";
const hashedPassword = hashPassword(password);

function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    username: "testuser",
    password: hashedPassword,
    name: "Test User",
    role: "user" as const,
    badgeNumber: null,
    affiliation: null,
    zoneId: null,
    locationId: null,
    currentLatitude: null,
    currentLongitude: null,
    locationUpdatedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

async function loginAs(user: ReturnType<typeof mockUser>) {
  vi.mocked(storage.getUserByUsername).mockResolvedValueOnce(user as any);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ username: user.username, password });
  return res.headers["set-cookie"];
}

// Test data
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
  zoneType: "general" as const,
  description: "",
  createdAt: new Date(),
  updatedAt: new Date(),
};

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
  zoneType: "alert" as const,
  description: "",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const alertGlobal = {
  id: "alert-global",
  title: "Global Alert",
  description: "",
  severity: "high" as const,
  status: "active" as const,
  zoneId: null,
  createdBy: "admin-1",
  createdAt: new Date(),
  clearedAt: null,
};

const alertZoneA = {
  id: "alert-zone-a",
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
  id: "alert-zone-b",
  title: "Zone B Alert",
  description: "",
  severity: "medium" as const,
  status: "active" as const,
  zoneId: "zone-b",
  createdBy: "admin-1",
  createdAt: new Date(),
  clearedAt: null,
};

describe("GET /api/alerts filtering", () => {
  describe("admin/eco/supervisor roles see all alerts", () => {
    for (const role of ["admin", "eco", "supervisor"]) {
      it(`${role} sees all alerts unfiltered`, async () => {
        const user = mockUser({ role, username: `${role}user`, id: `${role}-id` });
        const cookie = await loginAs(user);

        const allAlerts = [alertGlobal, alertZoneA, alertZoneB];
        vi.mocked(storage.getAlerts).mockResolvedValueOnce(allAlerts);

        const res = await request(app)
          .get("/api/alerts")
          .set("Cookie", cookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);
      });
    }
  });

  describe("regular user filtering by location", () => {
    it("sees global alerts (no zoneId) regardless of location", async () => {
      const user = mockUser({ currentLatitude: null, currentLongitude: null });
      const cookie = await loginAs(user);

      vi.mocked(storage.getAlerts).mockResolvedValueOnce([alertGlobal]);
      vi.mocked(storage.getUser).mockResolvedValueOnce(user as any);

      const res = await request(app)
        .get("/api/alerts")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe("alert-global");
    });

    it("sees zone-specific alert when user is inside that zone", async () => {
      const user = mockUser({
        currentLatitude: 5,  // inside zone A (0-10, 0-10)
        currentLongitude: 5,
      });
      const cookie = await loginAs(user);

      vi.mocked(storage.getAlerts).mockResolvedValueOnce([alertGlobal, alertZoneA, alertZoneB]);
      vi.mocked(storage.getUser).mockResolvedValueOnce(user as any);
      vi.mocked(storage.getZones).mockResolvedValueOnce([zoneA, zoneB]);

      const res = await request(app)
        .get("/api/alerts")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).toContain("alert-global");
      expect(ids).toContain("alert-zone-a");
      expect(ids).not.toContain("alert-zone-b");
    });

    it("does not see zone alerts when user has no location", async () => {
      const user = mockUser({ currentLatitude: null, currentLongitude: null });
      const cookie = await loginAs(user);

      vi.mocked(storage.getAlerts).mockResolvedValueOnce([alertGlobal, alertZoneA]);
      vi.mocked(storage.getUser).mockResolvedValueOnce(user as any);
      vi.mocked(storage.getZones).mockResolvedValueOnce([zoneA]);

      const res = await request(app)
        .get("/api/alerts")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).toContain("alert-global");
      expect(ids).not.toContain("alert-zone-a");
    });

    it("does not see zone alerts when user is outside all zones", async () => {
      const user = mockUser({
        currentLatitude: 50,
        currentLongitude: 50,
      });
      const cookie = await loginAs(user);

      vi.mocked(storage.getAlerts).mockResolvedValueOnce([alertZoneA, alertZoneB]);
      vi.mocked(storage.getUser).mockResolvedValueOnce(user as any);
      vi.mocked(storage.getZones).mockResolvedValueOnce([zoneA, zoneB]);

      const res = await request(app)
        .get("/api/alerts")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it("sees alerts for zone B when user is inside zone B", async () => {
      const user = mockUser({
        currentLatitude: 25,  // inside zone B (20-30, 20-30)
        currentLongitude: 25,
        username: "userB",
        id: "user-b",
      });
      const cookie = await loginAs(user);

      vi.mocked(storage.getAlerts).mockResolvedValueOnce([alertZoneA, alertZoneB]);
      vi.mocked(storage.getUser).mockResolvedValueOnce(user as any);
      vi.mocked(storage.getZones).mockResolvedValueOnce([zoneA, zoneB]);

      const res = await request(app)
        .get("/api/alerts")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).not.toContain("alert-zone-a");
      expect(ids).toContain("alert-zone-b");
    });

    it("handles alert with zoneId that references a missing zone", async () => {
      const user = mockUser({ currentLatitude: 5, currentLongitude: 5 });
      const cookie = await loginAs(user);

      const alertOrphan = { ...alertZoneA, zoneId: "zone-nonexistent" };
      vi.mocked(storage.getAlerts).mockResolvedValueOnce([alertOrphan]);
      vi.mocked(storage.getUser).mockResolvedValueOnce(user as any);
      vi.mocked(storage.getZones).mockResolvedValueOnce([zoneA]);

      const res = await request(app)
        .get("/api/alerts")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  it("returns 401 for unauthenticated requests", async () => {
    const res = await request(app).get("/api/alerts");
    expect(res.status).toBe(401);
  });
});
