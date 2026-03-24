import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { loginAs, setupTestServer } from "./helpers/test-harness";

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

const triangle = [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 10 },
  { latitude: 10, longitude: 5 },
];

const square = [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 10 },
  { latitude: 10, longitude: 10 },
  { latitude: 10, longitude: 0 },
];

describe("POST /api/zones — polygon validation and persistence", () => {
  describe("valid polygon accepted", () => {
    it("accepts a triangle (3 points)", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");
      const created = {
        id: "z1", name: "Triangle Zone", description: "", polygon: triangle,
        color: "#FF0000", zoneType: "general" as const,
        createdAt: new Date(), updatedAt: new Date(),
      };
      vi.mocked(ctx.storage.createZone).mockResolvedValueOnce(created);

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({ name: "Triangle Zone", polygon: triangle });

      expect(res.status).toBe(201);
      expect(res.body.polygon).toEqual(triangle);
      expect(ctx.storage.createZone).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Triangle Zone", polygon: triangle }),
      );
    });

    it("accepts a square (4 points)", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");
      const created = {
        id: "z2", name: "Square Zone", description: "", polygon: square,
        color: "#00FF00", zoneType: "hot" as const,
        createdAt: new Date(), updatedAt: new Date(),
      };
      vi.mocked(ctx.storage.createZone).mockResolvedValueOnce(created);

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({ name: "Square Zone", polygon: square, color: "#00FF00", zoneType: "hot" });

      expect(res.status).toBe(201);
      expect(res.body.polygon).toEqual(square);
    });

    it("accepts all valid zone types", async () => {
      const types = ["general", "alert", "hot", "warm", "safe"] as const;
      for (const zoneType of types) {
        vi.clearAllMocks();
        const cookie = await loginAs(ctx.app, ctx.storage, "admin");
        vi.mocked(ctx.storage.createZone).mockResolvedValueOnce({
          id: `z-${zoneType}`, name: `${zoneType} zone`, description: "",
          polygon: triangle, color: "#FF0000", zoneType,
          createdAt: new Date(), updatedAt: new Date(),
        });

        const res = await request(ctx.app)
          .post("/api/zones")
          .set("Cookie", cookie)
          .send({ name: `${zoneType} zone`, polygon: triangle, zoneType });

        expect(res.status).toBe(201);
        expect(res.body.zoneType).toBe(zoneType);
      }
    });

    it("returns the created zone with all fields", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");
      const created = {
        id: "z3", name: "Full Zone", description: "desc", polygon: square,
        color: "#0000FF", zoneType: "safe" as const,
        createdAt: new Date(), updatedAt: new Date(),
      };
      vi.mocked(ctx.storage.createZone).mockResolvedValueOnce(created);

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({ name: "Full Zone", description: "desc", polygon: square, color: "#0000FF", zoneType: "safe" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: "z3",
        name: "Full Zone",
        description: "desc",
        color: "#0000FF",
        zoneType: "safe",
      });
      expect(res.body.polygon).toEqual(square);
    });
  });

  describe("empty polygon", () => {
    it("accepts empty polygon (schema default is [])", async () => {
      // The insertZoneSchema uses jsonb with default([]), so empty array is valid at schema level.
      // polygon validation happens at query time via pointInPolygon (requires >= 3 points).
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");
      vi.mocked(ctx.storage.createZone).mockResolvedValueOnce({
        id: "z4", name: "Empty Poly", description: "", polygon: [],
        color: "#FF0000", zoneType: "general" as const,
        createdAt: new Date(), updatedAt: new Date(),
      });

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({ name: "Empty Poly", polygon: [] });

      // Schema allows empty array — it's stored as-is; pointInPolygon will return false
      expect(res.status).toBe(201);
      expect(res.body.polygon).toEqual([]);
    });
  });

  describe("missing required fields rejected", () => {
    it("rejects zone without name", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({ polygon: triangle });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid zone data");
      expect(ctx.storage.createZone).not.toHaveBeenCalled();
    });

    it("rejects empty body", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("invalid zone type rejected", () => {
    it("rejects unknown zone type", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({ name: "Bad Type", polygon: triangle, zoneType: "danger" });

      expect(res.status).toBe(400);
    });
  });

  describe("role restriction enforced", () => {
    it("admin can create zones", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");
      vi.mocked(ctx.storage.createZone).mockResolvedValueOnce({
        id: "z5", name: "Admin Zone", description: "", polygon: triangle,
        color: "#FF0000", zoneType: "general" as const,
        createdAt: new Date(), updatedAt: new Date(),
      });

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({ name: "Admin Zone", polygon: triangle });

      expect(res.status).toBe(201);
    });

    it("supervisor can create zones", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "supervisor");
      vi.mocked(ctx.storage.createZone).mockResolvedValueOnce({
        id: "z6", name: "Sup Zone", description: "", polygon: triangle,
        color: "#FF0000", zoneType: "general" as const,
        createdAt: new Date(), updatedAt: new Date(),
      });

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({ name: "Sup Zone", polygon: triangle });

      expect(res.status).toBe(201);
    });

    it("eco cannot create zones", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "eco");

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({ name: "Eco Zone", polygon: triangle });

      expect(res.status).toBe(403);
      expect(ctx.storage.createZone).not.toHaveBeenCalled();
    });

    it("regular user cannot create zones", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user");

      const res = await request(ctx.app)
        .post("/api/zones")
        .set("Cookie", cookie)
        .send({ name: "User Zone", polygon: triangle });

      expect(res.status).toBe(403);
      expect(ctx.storage.createZone).not.toHaveBeenCalled();
    });

    it("unauthenticated request cannot create zones", async () => {
      const res = await request(ctx.app)
        .post("/api/zones")
        .send({ name: "No Auth", polygon: triangle });

      expect(res.status).toBe(401);
      expect(ctx.storage.createZone).not.toHaveBeenCalled();
    });
  });
});
