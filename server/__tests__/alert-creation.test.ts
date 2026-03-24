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

describe("POST /api/alerts — alert creation rules", () => {
  describe("global alert (no zoneId)", () => {
    it("creates a global alert without zoneId", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");
      const created = {
        id: "a1", title: "Global Alert", description: "", severity: "medium",
        status: "active", zoneId: null, createdBy: "admin-id-admin-user",
        createdAt: new Date(), clearedAt: null,
      };
      vi.mocked(ctx.storage.createAlert).mockResolvedValueOnce(created);

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ title: "Global Alert" });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Global Alert");
      expect(res.body.zoneId).toBeNull();
      expect(ctx.storage.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Global Alert", createdBy: expect.any(String) }),
      );
    });

    it("sets default severity to medium when omitted", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");
      const created = {
        id: "a2", title: "Test", description: "", severity: "medium",
        status: "active", zoneId: null, createdBy: "admin-id-admin-user",
        createdAt: new Date(), clearedAt: null,
      };
      vi.mocked(ctx.storage.createAlert).mockResolvedValueOnce(created);

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ title: "Test" });

      expect(res.status).toBe(201);
      // Schema default is "medium" — storage should receive no severity override or "medium"
      const callArg = vi.mocked(ctx.storage.createAlert).mock.calls[0][0];
      expect(callArg.severity === undefined || callArg.severity === "medium").toBe(true);
    });
  });

  describe("zone alert", () => {
    it("creates an alert with a zoneId", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");
      const created = {
        id: "a3", title: "Zone Alert", description: "", severity: "high",
        status: "active", zoneId: "zone-1", createdBy: "admin-id-admin-user",
        createdAt: new Date(), clearedAt: null,
      };
      vi.mocked(ctx.storage.createAlert).mockResolvedValueOnce(created);

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ title: "Zone Alert", severity: "high", zoneId: "zone-1" });

      expect(res.status).toBe(201);
      expect(res.body.zoneId).toBe("zone-1");
      expect(ctx.storage.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Zone Alert", zoneId: "zone-1", severity: "high" }),
      );
    });

    it("accepts all valid severity levels", async () => {
      const severities = ["low", "medium", "high", "critical"] as const;
      for (const severity of severities) {
        vi.clearAllMocks();
        const cookie = await loginAs(ctx.app, ctx.storage, "eco");
        const created = {
          id: `a-${severity}`, title: `${severity} alert`, description: "",
          severity, status: "active" as const, zoneId: null,
          createdBy: "eco-id-eco-user", createdAt: new Date(), clearedAt: null,
        };
        vi.mocked(ctx.storage.createAlert).mockResolvedValueOnce(created);

        const res = await request(ctx.app)
          .post("/api/alerts")
          .set("Cookie", cookie)
          .send({ title: `${severity} alert`, severity });

        expect(res.status).toBe(201);
        expect(res.body.severity).toBe(severity);
      }
    });
  });

  describe("invalid severity rejected", () => {
    it("rejects unknown severity value", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ title: "Bad Alert", severity: "extreme" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid alert data");
      expect(ctx.storage.createAlert).not.toHaveBeenCalled();
    });

    it("rejects numeric severity", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ title: "Bad Alert", severity: 5 });

      expect(res.status).toBe(400);
    });
  });

  describe("missing required fields rejected", () => {
    it("rejects alert without title", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ severity: "high" });

      expect(res.status).toBe(400);
      expect(ctx.storage.createAlert).not.toHaveBeenCalled();
    });

    it("rejects empty body", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("role restriction enforced", () => {
    it("admin can create alerts", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin");
      vi.mocked(ctx.storage.createAlert).mockResolvedValueOnce({
        id: "a4", title: "Admin Alert", description: "", severity: "medium",
        status: "active", zoneId: null, createdBy: "admin-id-admin-user",
        createdAt: new Date(), clearedAt: null,
      });

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ title: "Admin Alert" });

      expect(res.status).toBe(201);
    });

    it("eco can create alerts", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "eco");
      vi.mocked(ctx.storage.createAlert).mockResolvedValueOnce({
        id: "a5", title: "Eco Alert", description: "", severity: "medium",
        status: "active", zoneId: null, createdBy: "eco-id-eco-user",
        createdAt: new Date(), clearedAt: null,
      });

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ title: "Eco Alert" });

      expect(res.status).toBe(201);
    });

    it("supervisor can create alerts", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "supervisor");
      vi.mocked(ctx.storage.createAlert).mockResolvedValueOnce({
        id: "a6", title: "Sup Alert", description: "", severity: "medium",
        status: "active", zoneId: null, createdBy: "supervisor-id-supervisor-user",
        createdAt: new Date(), clearedAt: null,
      });

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ title: "Sup Alert" });

      expect(res.status).toBe(201);
    });

    it("regular user cannot create alerts", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user");

      const res = await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ title: "User Alert" });

      expect(res.status).toBe(403);
      expect(ctx.storage.createAlert).not.toHaveBeenCalled();
    });

    it("unauthenticated request cannot create alerts", async () => {
      const res = await request(ctx.app)
        .post("/api/alerts")
        .send({ title: "No Auth" });

      expect(res.status).toBe(401);
      expect(ctx.storage.createAlert).not.toHaveBeenCalled();
    });
  });

  describe("sets createdBy from session", () => {
    it("injects session userId as createdBy", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin-bob");
      vi.mocked(ctx.storage.createAlert).mockResolvedValueOnce({
        id: "a7", title: "Track Creator", description: "", severity: "medium",
        status: "active", zoneId: null, createdBy: "admin-id-admin-bob",
        createdAt: new Date(), clearedAt: null,
      });

      await request(ctx.app)
        .post("/api/alerts")
        .set("Cookie", cookie)
        .send({ title: "Track Creator" });

      const callArg = vi.mocked(ctx.storage.createAlert).mock.calls[0][0];
      expect(callArg.createdBy).toBe("admin-id-admin-bob");
    });
  });
});
