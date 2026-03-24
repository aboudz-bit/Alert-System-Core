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

// Helper: login and return cookie
async function loginAs(role: string, username = "testuser") {
  const password = "password123";
  const hashedPassword = hashPassword(password);

  vi.mocked(storage.getUserByUsername).mockResolvedValueOnce({
    id: `user-${role}`,
    username,
    password: hashedPassword,
    name: `Test ${role}`,
    role: role as any,
    badgeNumber: null,
    affiliation: null,
    zoneId: null,
    locationId: null,
    currentLatitude: null,
    currentLongitude: null,
    locationUpdatedAt: null,
    createdAt: new Date(),
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ username, password });

  expect(res.status).toBe(200);
  return res.headers["set-cookie"];
}

describe("requireAuth middleware", () => {
  it("returns 401 when no session cookie is provided", async () => {
    const res = await request(app).get("/api/zones");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Not authenticated");
  });

  it("allows access with a valid session", async () => {
    const cookie = await loginAs("user");
    vi.mocked(storage.getZones).mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/zones")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
  });
});

describe("requireRole middleware", () => {
  it("returns 401 when not authenticated on role-protected route", async () => {
    const res = await request(app)
      .post("/api/zones")
      .send({ name: "Test Zone" });

    expect(res.status).toBe(401);
  });

  it("returns 403 when user role is insufficient", async () => {
    const cookie = await loginAs("user");

    const res = await request(app)
      .post("/api/zones")
      .set("Cookie", cookie)
      .send({ name: "Test Zone", polygon: [], color: "#FF0000" });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Insufficient permissions");
  });

  it("allows admin to access admin-only routes", async () => {
    const cookie = await loginAs("admin", "admin1");
    vi.mocked(storage.deleteZone).mockResolvedValueOnce(true);

    const res = await request(app)
      .delete("/api/zones/zone-1")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
  });

  it("allows supervisor to create zones (admin+supervisor route)", async () => {
    const cookie = await loginAs("supervisor", "super1");
    vi.mocked(storage.createZone).mockResolvedValueOnce({
      id: "zone-new",
      name: "New Zone",
      description: "",
      polygon: [],
      color: "#FF0000",
      zoneType: "general",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post("/api/zones")
      .set("Cookie", cookie)
      .send({ name: "New Zone", polygon: [], color: "#FF0000" });

    expect(res.status).toBe(201);
  });

  it("denies regular user from deleting zones (admin-only)", async () => {
    const cookie = await loginAs("user", "regular1");

    const res = await request(app)
      .delete("/api/zones/zone-1")
      .set("Cookie", cookie);

    expect(res.status).toBe(403);
  });

  it("allows eco role to create alerts", async () => {
    const cookie = await loginAs("eco", "eco1");
    vi.mocked(storage.createAlert).mockResolvedValueOnce({
      id: "alert-1",
      title: "Test Alert",
      description: "",
      severity: "high",
      status: "active",
      zoneId: null,
      createdBy: "user-eco",
      createdAt: new Date(),
      clearedAt: null,
    });

    const res = await request(app)
      .post("/api/alerts")
      .set("Cookie", cookie)
      .send({ title: "Test Alert", severity: "high" });

    expect(res.status).toBe(201);
  });
});
