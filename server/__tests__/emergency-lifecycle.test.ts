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

const now = new Date();

function makeEmergencyMode(overrides: Record<string, unknown> = {}) {
  return {
    id: "em-1",
    type: "shelter_in" as const,
    status: "active" as const,
    activatedBy: "admin-id-admin1",
    activatedAt: now,
    clearedAt: null,
    clearedBy: null,
    ...overrides,
  };
}

describe("Emergency mode lifecycle", () => {
  describe("POST /api/emergency/activate", () => {
    it("activates a shelter_in emergency", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin1");
      const mode = makeEmergencyMode();
      vi.mocked(ctx.storage.activateEmergencyMode).mockResolvedValueOnce(mode);

      const res = await request(ctx.app)
        .post("/api/emergency/activate")
        .set("Cookie", cookie)
        .send({ type: "shelter_in" });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe("shelter_in");
      expect(res.body.status).toBe("active");
      expect(ctx.storage.activateEmergencyMode).toHaveBeenCalledWith(
        "shelter_in",
        expect.any(String),
      );
    });

    it("activates a blackout emergency", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "eco", "eco1");
      const mode = makeEmergencyMode({ type: "blackout", id: "em-2" });
      vi.mocked(ctx.storage.activateEmergencyMode).mockResolvedValueOnce(mode);

      const res = await request(ctx.app)
        .post("/api/emergency/activate")
        .set("Cookie", cookie)
        .send({ type: "blackout" });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe("blackout");
    });

    it("rejects invalid emergency type", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin2");

      const res = await request(ctx.app)
        .post("/api/emergency/activate")
        .set("Cookie", cookie)
        .send({ type: "earthquake" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid emergency mode type");
    });

    it("rejects activation by regular user", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "regular1");

      const res = await request(ctx.app)
        .post("/api/emergency/activate")
        .set("Cookie", cookie)
        .send({ type: "shelter_in" });

      expect(res.status).toBe(403);
    });

    it("rejects activation without authentication", async () => {
      const res = await request(ctx.app)
        .post("/api/emergency/activate")
        .send({ type: "shelter_in" });

      expect(res.status).toBe(401);
    });

    it("passes userId to storage so storage can clear previous active mode", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "supervisor", "sup1");
      vi.mocked(ctx.storage.activateEmergencyMode).mockResolvedValueOnce(
        makeEmergencyMode({ id: "em-new" }),
      );

      await request(ctx.app)
        .post("/api/emergency/activate")
        .set("Cookie", cookie)
        .send({ type: "blackout" });

      // Storage.activateEmergencyMode is responsible for clearing previous active mode
      // (see storage.ts transaction). We verify it was called with correct args.
      expect(ctx.storage.activateEmergencyMode).toHaveBeenCalledWith(
        "blackout",
        expect.stringContaining("supervisor-id"),
      );
    });
  });

  describe("PATCH /api/emergency/:id/clear", () => {
    it("clears an active emergency mode", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin3");
      const cleared = makeEmergencyMode({
        status: "cleared",
        clearedAt: now,
        clearedBy: "admin-id-admin3",
      });
      vi.mocked(ctx.storage.clearEmergencyMode).mockResolvedValueOnce(cleared);

      const res = await request(ctx.app)
        .patch("/api/emergency/em-1/clear")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("cleared");
      expect(ctx.storage.clearEmergencyMode).toHaveBeenCalledWith(
        "em-1",
        expect.any(String),
      );
    });

    it("returns 404 when no active emergency with that id", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin4");
      vi.mocked(ctx.storage.clearEmergencyMode).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .patch("/api/emergency/nonexistent/clear")
        .set("Cookie", cookie);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Active emergency mode not found");
    });

    it("rejects clearing by regular user", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "reg2");

      const res = await request(ctx.app)
        .patch("/api/emergency/em-1/clear")
        .set("Cookie", cookie);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/emergency/active", () => {
    it("returns the active emergency mode", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u1");
      const mode = makeEmergencyMode();
      vi.mocked(ctx.storage.getActiveEmergencyMode).mockResolvedValueOnce(mode);

      const res = await request(ctx.app)
        .get("/api/emergency/active")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("em-1");
      expect(res.body.status).toBe("active");
    });

    it("returns null when no active emergency", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u2");
      vi.mocked(ctx.storage.getActiveEmergencyMode).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .get("/api/emergency/active")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe("GET /api/emergency/history", () => {
    it("returns all emergency modes", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u3");
      const modes = [
        makeEmergencyMode({ id: "em-1", status: "cleared" }),
        makeEmergencyMode({ id: "em-2", type: "blackout" }),
      ];
      vi.mocked(ctx.storage.getEmergencyModes).mockResolvedValueOnce(modes);

      const res = await request(ctx.app)
        .get("/api/emergency/history")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });
});
