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

const now = new Date();

function makeReceipt(overrides: Record<string, unknown> = {}) {
  return {
    id: "receipt-1",
    emergencyModeId: "em-1",
    userId: "user-id-u1",
    confirmedAt: now,
    responseStatus: null,
    respondedAt: null,
    ...overrides,
  };
}

function makeEmergency(overrides: Record<string, unknown> = {}) {
  return {
    id: "em-1",
    type: "shelter_in" as const,
    status: "active" as const,
    activatedBy: "admin-1",
    activatedAt: now,
    clearedAt: null,
    clearedBy: null,
    ...overrides,
  };
}

describe("Receipt + response flow", () => {
  describe("POST /api/emergency/:id/receipt", () => {
    it("confirms receipt for authenticated user", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u1");
      const receipt = makeReceipt();
      vi.mocked(ctx.storage.confirmReceipt).mockResolvedValueOnce(receipt);

      const res = await request(ctx.app)
        .post("/api/emergency/em-1/receipt")
        .set("Cookie", cookie);

      expect(res.status).toBe(201);
      expect(res.body.emergencyModeId).toBe("em-1");
      expect(res.body.confirmedAt).toBeTruthy();
      expect(ctx.storage.confirmReceipt).toHaveBeenCalledWith(
        "em-1",
        expect.any(String),
      );
    });

    it("rejects receipt without authentication", async () => {
      const res = await request(ctx.app)
        .post("/api/emergency/em-1/receipt");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/emergency/:id/response", () => {
    it("sets response status to safe", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u2");
      const emergency = makeEmergency();
      vi.mocked(ctx.storage.getActiveEmergencyMode).mockResolvedValueOnce(emergency);
      const receipt = makeReceipt({
        userId: "user-id-u2",
        responseStatus: "safe",
        respondedAt: now,
      });
      vi.mocked(ctx.storage.setResponseStatus).mockResolvedValueOnce(receipt);

      const res = await request(ctx.app)
        .post("/api/emergency/em-1/response")
        .set("Cookie", cookie)
        .send({ status: "safe" });

      expect(res.status).toBe(200);
      expect(res.body.responseStatus).toBe("safe");
      expect(ctx.storage.setResponseStatus).toHaveBeenCalledWith(
        "em-1",
        expect.any(String),
        "safe",
      );
    });

    it("sets response status to need_help", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u3");
      const emergency = makeEmergency();
      vi.mocked(ctx.storage.getActiveEmergencyMode).mockResolvedValueOnce(emergency);
      const receipt = makeReceipt({
        userId: "user-id-u3",
        responseStatus: "need_help",
        respondedAt: now,
      });
      vi.mocked(ctx.storage.setResponseStatus).mockResolvedValueOnce(receipt);

      const res = await request(ctx.app)
        .post("/api/emergency/em-1/response")
        .set("Cookie", cookie)
        .send({ status: "need_help" });

      expect(res.status).toBe(200);
      expect(res.body.responseStatus).toBe("need_help");
    });

    it("rejects invalid response status", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u4");

      const res = await request(ctx.app)
        .post("/api/emergency/em-1/response")
        .set("Cookie", cookie)
        .send({ status: "unknown" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid status");
    });

    it("rejects response when no active emergency with that ID", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u5");
      vi.mocked(ctx.storage.getActiveEmergencyMode).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .post("/api/emergency/em-1/response")
        .set("Cookie", cookie)
        .send({ status: "safe" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("No active emergency with this ID.");
    });

    it("rejects response when active emergency has a different ID", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u6");
      vi.mocked(ctx.storage.getActiveEmergencyMode).mockResolvedValueOnce(
        makeEmergency({ id: "em-other" }),
      );

      const res = await request(ctx.app)
        .post("/api/emergency/em-1/response")
        .set("Cookie", cookie)
        .send({ status: "safe" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("No active emergency with this ID.");
    });

    it("rejects response without authentication", async () => {
      const res = await request(ctx.app)
        .post("/api/emergency/em-1/response")
        .send({ status: "safe" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/emergency/:id/receipt/me", () => {
    it("returns user receipt when confirmed", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u7");
      const receipt = makeReceipt({ userId: "user-id-u7" });
      vi.mocked(ctx.storage.getUserReceipt).mockResolvedValueOnce(receipt);

      const res = await request(ctx.app)
        .get("/api/emergency/em-1/receipt/me")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe("user-id-u7");
    });

    it("returns null when user has not confirmed", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "u8");
      vi.mocked(ctx.storage.getUserReceipt).mockResolvedValueOnce(undefined);

      const res = await request(ctx.app)
        .get("/api/emergency/em-1/receipt/me")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe("GET /api/emergency/:id/receipts/summary", () => {
    it("returns confirmed, notConfirmed, and total counts", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin1");

      const allUsers = [
        mockUser({ id: "u1", username: "user1", name: "User 1", role: "user" }),
        mockUser({ id: "u2", username: "user2", name: "User 2", role: "user" }),
        mockUser({ id: "u3", username: "user3", name: "User 3", role: "eco" }),
      ];
      vi.mocked(ctx.storage.getUsers).mockResolvedValueOnce(allUsers as any);

      const receipts = [
        makeReceipt({ id: "r1", userId: "u1", responseStatus: "safe", respondedAt: now }),
      ];
      vi.mocked(ctx.storage.getReceiptsByMode).mockResolvedValueOnce(receipts);

      const res = await request(ctx.app)
        .get("/api/emergency/em-1/receipts/summary")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.confirmed).toHaveLength(1);
      expect(res.body.confirmed[0].id).toBe("u1");
      expect(res.body.confirmed[0].responseStatus).toBe("safe");
      expect(res.body.notConfirmed).toHaveLength(2);
      const notConfirmedIds = res.body.notConfirmed.map((u: any) => u.id);
      expect(notConfirmedIds).toContain("u2");
      expect(notConfirmedIds).toContain("u3");
    });

    it("returns all users as notConfirmed when no receipts", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "admin", "admin2");

      vi.mocked(ctx.storage.getUsers).mockResolvedValueOnce([
        mockUser({ id: "u1" }) as any,
        mockUser({ id: "u2" }) as any,
      ]);
      vi.mocked(ctx.storage.getReceiptsByMode).mockResolvedValueOnce([]);

      const res = await request(ctx.app)
        .get("/api/emergency/em-1/receipts/summary")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.confirmed).toHaveLength(0);
      expect(res.body.notConfirmed).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it("includes respondedAt for users who responded", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "eco", "eco1");

      vi.mocked(ctx.storage.getUsers).mockResolvedValueOnce([
        mockUser({ id: "u1" }) as any,
      ]);
      vi.mocked(ctx.storage.getReceiptsByMode).mockResolvedValueOnce([
        makeReceipt({
          userId: "u1",
          responseStatus: "need_help",
          respondedAt: now,
        }),
      ]);

      const res = await request(ctx.app)
        .get("/api/emergency/em-1/receipts/summary")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.confirmed[0].responseStatus).toBe("need_help");
      expect(res.body.confirmed[0].respondedAt).toBeTruthy();
    });

    it("rejects summary request from regular user", async () => {
      const cookie = await loginAs(ctx.app, ctx.storage, "user", "reg1");

      const res = await request(ctx.app)
        .get("/api/emergency/em-1/receipts/summary")
        .set("Cookie", cookie);

      expect(res.status).toBe(403);
    });
  });
});
