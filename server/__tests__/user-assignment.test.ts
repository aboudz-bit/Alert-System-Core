import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { loginAs, mockUser, setupTestServer } from "./helpers/test-harness";

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

const targetUser = mockUser({ id: "target-1", username: "target", name: "Target User" });

function makeZone(overrides: Record<string, unknown> = {}) {
  return {
    id: "zone-1",
    name: "Zone 1",
    description: "",
    polygon: [],
    color: "#FF0000",
    zoneType: "general" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeLocation(overrides: Record<string, unknown> = {}) {
  return {
    id: "loc-1",
    name: "Location 1",
    latitude: 26.32,
    longitude: 50.12,
    zoneId: "zone-1",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("PATCH /api/users/:id/assignment", () => {
  describe("authorization", () => {
    it("rejects non-admin users", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "reg1");

      const res = await request(ctx.app)
        .patch("/api/users/target-1/assignment")
        .set("Cookie", cookie)
        .send({ zoneId: "zone-1", locationId: null });

      expect(res.status).toBe(403);
    });

    it("rejects unauthenticated requests", async () => {
      const res = await request(ctx.app)
        .patch("/api/users/target-1/assignment")
        .send({ zoneId: "zone-1", locationId: null });

      expect(res.status).toBe(401);
    });
  });

  describe("cannot assign location without zone", () => {
    it("returns 400 when locationId is set but zoneId is null", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin1");

      const res = await request(ctx.app)
        .patch("/api/users/target-1/assignment")
        .set("Cookie", cookie)
        .send({ zoneId: null, locationId: "loc-1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Cannot assign location without a zone");
    });
  });

  describe("zone validation", () => {
    it("rejects assignment when zone does not exist", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin2");
      vi.mocked(ctx.storage.getZone).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .patch("/api/users/target-1/assignment")
        .set("Cookie", cookie)
        .send({ zoneId: "nonexistent-zone", locationId: null });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Zone not found");
    });
  });

  describe("location validation", () => {
    it("rejects assignment when location does not exist", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin3");
      vi.mocked(ctx.storage.getZone).mockResolvedValueOnce(makeZone());
      vi.mocked(ctx.storage.getLocation).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .patch("/api/users/target-1/assignment")
        .set("Cookie", cookie)
        .send({ zoneId: "zone-1", locationId: "nonexistent-loc" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Location not found");
    });

    it("rejects when location does not belong to the specified zone", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin4");
      vi.mocked(ctx.storage.getZone).mockResolvedValueOnce(makeZone());
      vi.mocked(ctx.storage.getLocation).mockResolvedValueOnce(
        makeLocation({ zoneId: "zone-other" }),
      );

      const res = await request(ctx.app)
        .patch("/api/users/target-1/assignment")
        .set("Cookie", cookie)
        .send({ zoneId: "zone-1", locationId: "loc-1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Location does not belong to selected zone");
    });
  });

  describe("target user validation", () => {
    it("returns 404 when target user does not exist", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin5");
      vi.mocked(ctx.storage.getZone).mockResolvedValueOnce(makeZone());
      vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .patch("/api/users/nonexistent/assignment")
        .set("Cookie", cookie)
        .send({ zoneId: "zone-1", locationId: null });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("User not found");
    });
  });

  describe("successful assignments", () => {
    it("assigns zone only (no location)", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin6");
      vi.mocked(ctx.storage.getZone).mockResolvedValueOnce(makeZone());
      vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(targetUser as any);
      vi.mocked(ctx.storage.updateUserAssignment).mockResolvedValueOnce({
        ...targetUser,
        zoneId: "zone-1",
        locationId: null,
      } as any);

      const res = await request(ctx.app)
        .patch("/api/users/target-1/assignment")
        .set("Cookie", cookie)
        .send({ zoneId: "zone-1", locationId: null });

      expect(res.status).toBe(200);
      expect(res.body.zoneId).toBe("zone-1");
      expect(res.body.locationId).toBeNull();
      expect(ctx.storage.updateUserAssignment).toHaveBeenCalledWith(
        "target-1", "zone-1", null,
      );
    });

    it("assigns zone and location together", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin7");
      vi.mocked(ctx.storage.getZone).mockResolvedValueOnce(makeZone());
      vi.mocked(ctx.storage.getLocation).mockResolvedValueOnce(makeLocation());
      vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(targetUser as any);
      vi.mocked(ctx.storage.updateUserAssignment).mockResolvedValueOnce({
        ...targetUser,
        zoneId: "zone-1",
        locationId: "loc-1",
      } as any);

      const res = await request(ctx.app)
        .patch("/api/users/target-1/assignment")
        .set("Cookie", cookie)
        .send({ zoneId: "zone-1", locationId: "loc-1" });

      expect(res.status).toBe(200);
      expect(res.body.zoneId).toBe("zone-1");
      expect(res.body.locationId).toBe("loc-1");
    });

    it("clears both zone and location", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin8");
      vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(targetUser as any);
      vi.mocked(ctx.storage.updateUserAssignment).mockResolvedValueOnce({
        ...targetUser,
        zoneId: null,
        locationId: null,
      } as any);

      const res = await request(ctx.app)
        .patch("/api/users/target-1/assignment")
        .set("Cookie", cookie)
        .send({ zoneId: null, locationId: null });

      expect(res.status).toBe(200);
      expect(res.body.zoneId).toBeNull();
      expect(res.body.locationId).toBeNull();
    });

    it("does not expose password in response", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin9");
      vi.mocked(ctx.storage.getUser).mockResolvedValueOnce(targetUser as any);
      vi.mocked(ctx.storage.updateUserAssignment).mockResolvedValueOnce(targetUser as any);

      const res = await request(ctx.app)
        .patch("/api/users/target-1/assignment")
        .set("Cookie", cookie)
        .send({ zoneId: null, locationId: null });

      expect(res.status).toBe(200);
      expect(res.body.password).toBeUndefined();
    });
  });
});
