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

describe("POST /api/location/update", () => {
  describe("saves lat/lng", () => {
    it("calls updateUserLocation with correct coordinates", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u1");
      vi.mocked(ctx.storage.updateUserLocation).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: 26.32, longitude: 50.12 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Location updated");
      expect(ctx.storage.updateUserLocation).toHaveBeenCalledWith(
        expect.any(String),
        26.32,
        50.12,
      );
    });

    it("accepts zero coordinates (equator/prime meridian)", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u2");
      vi.mocked(ctx.storage.updateUserLocation).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: 0, longitude: 0 });

      expect(res.status).toBe(200);
      expect(ctx.storage.updateUserLocation).toHaveBeenCalledWith(
        expect.any(String), 0, 0,
      );
    });

    it("accepts boundary coordinates", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u3");
      vi.mocked(ctx.storage.updateUserLocation).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: 90, longitude: -180 });

      expect(res.status).toBe(200);
    });

    it("accepts negative coordinates", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u4");
      vi.mocked(ctx.storage.updateUserLocation).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: -33.8688, longitude: 151.2093 });

      expect(res.status).toBe(200);
      expect(ctx.storage.updateUserLocation).toHaveBeenCalledWith(
        expect.any(String), -33.8688, 151.2093,
      );
    });
  });

  describe("rejects invalid coordinates", () => {
    it("rejects latitude above 90", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u5");

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: 91, longitude: 50 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid location data");
      expect(ctx.storage.updateUserLocation).not.toHaveBeenCalled();
    });

    it("rejects latitude below -90", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u6");

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: -91, longitude: 50 });

      expect(res.status).toBe(400);
    });

    it("rejects longitude above 180", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u7");

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: 26, longitude: 181 });

      expect(res.status).toBe(400);
    });

    it("rejects longitude below -180", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u8");

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: 26, longitude: -181 });

      expect(res.status).toBe(400);
    });

    it("rejects non-numeric latitude", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u9");

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: "north", longitude: 50 });

      expect(res.status).toBe(400);
    });

    it("rejects missing latitude", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u10");

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ longitude: 50 });

      expect(res.status).toBe(400);
    });

    it("rejects missing longitude", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u11");

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: 26 });

      expect(res.status).toBe(400);
    });

    it("rejects empty body", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u12");

      const res = await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("rejects unauthenticated", () => {
    it("returns 401 without session", async () => {
      const res = await request(ctx.app)
        .post("/api/location/update")
        .send({ latitude: 26.32, longitude: 50.12 });

      expect(res.status).toBe(401);
    });
  });

  describe("passes userId from session", () => {
    it("uses the session userId, not a body-supplied id", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u13");
      vi.mocked(ctx.storage.updateUserLocation).mockResolvedValueOnce(undefined);

      await request(ctx.app)
        .post("/api/location/update")
        .set("Cookie", cookie)
        .send({ latitude: 26.32, longitude: 50.12 });

      // The first arg to updateUserLocation should be the session userId
      const callArgs = vi.mocked(ctx.storage.updateUserLocation).mock.calls[0];
      expect(callArgs[0]).toContain("user-id"); // from loginAs helper
      expect(callArgs[1]).toBe(26.32);
      expect(callArgs[2]).toBe(50.12);
    });
  });
});
