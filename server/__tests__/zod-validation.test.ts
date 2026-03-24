import { describe, it, expect } from "vitest";
import {
  updateWindSchema,
  updateUserLocationSchema,
  activateEmergencySchema,
  setResponseStatusSchema,
  loginSchema,
  insertAlertSchema,
  insertZoneSchema,
} from "@shared/schema";

describe("Zod validation boundaries", () => {
  describe("updateWindSchema", () => {
    describe("direction", () => {
      it("accepts 0 (north)", () => {
        expect(updateWindSchema.safeParse({ direction: 0, speed: 10 }).success).toBe(true);
      });

      it("accepts 360 (full circle)", () => {
        expect(updateWindSchema.safeParse({ direction: 360, speed: 10 }).success).toBe(true);
      });

      it("accepts 180 (south)", () => {
        expect(updateWindSchema.safeParse({ direction: 180, speed: 10 }).success).toBe(true);
      });

      it("rejects negative direction", () => {
        expect(updateWindSchema.safeParse({ direction: -1, speed: 10 }).success).toBe(false);
      });

      it("rejects direction above 360", () => {
        expect(updateWindSchema.safeParse({ direction: 361, speed: 10 }).success).toBe(false);
      });

      it("rejects non-number direction", () => {
        expect(updateWindSchema.safeParse({ direction: "north", speed: 10 }).success).toBe(false);
      });
    });

    describe("speed", () => {
      it("accepts 0 (calm)", () => {
        expect(updateWindSchema.safeParse({ direction: 0, speed: 0 }).success).toBe(true);
      });

      it("accepts 300 (max)", () => {
        expect(updateWindSchema.safeParse({ direction: 0, speed: 300 }).success).toBe(true);
      });

      it("accepts mid-range value", () => {
        expect(updateWindSchema.safeParse({ direction: 90, speed: 150 }).success).toBe(true);
      });

      it("rejects negative speed", () => {
        expect(updateWindSchema.safeParse({ direction: 0, speed: -1 }).success).toBe(false);
      });

      it("rejects speed above 300", () => {
        expect(updateWindSchema.safeParse({ direction: 0, speed: 301 }).success).toBe(false);
      });

      it("rejects non-number speed", () => {
        expect(updateWindSchema.safeParse({ direction: 0, speed: "fast" }).success).toBe(false);
      });
    });

    it("rejects missing fields", () => {
      expect(updateWindSchema.safeParse({}).success).toBe(false);
      expect(updateWindSchema.safeParse({ direction: 10 }).success).toBe(false);
      expect(updateWindSchema.safeParse({ speed: 10 }).success).toBe(false);
    });
  });

  describe("updateUserLocationSchema", () => {
    describe("latitude", () => {
      it("accepts -90 (south pole)", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: -90, longitude: 0 }).success).toBe(true);
      });

      it("accepts 90 (north pole)", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: 90, longitude: 0 }).success).toBe(true);
      });

      it("accepts 0 (equator)", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: 0, longitude: 0 }).success).toBe(true);
      });

      it("accepts decimal latitudes", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: 26.3456, longitude: 50.123 }).success).toBe(true);
      });

      it("rejects latitude below -90", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: -91, longitude: 0 }).success).toBe(false);
      });

      it("rejects latitude above 90", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: 91, longitude: 0 }).success).toBe(false);
      });
    });

    describe("longitude", () => {
      it("accepts -180 (antimeridian west)", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: 0, longitude: -180 }).success).toBe(true);
      });

      it("accepts 180 (antimeridian east)", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: 0, longitude: 180 }).success).toBe(true);
      });

      it("accepts 0 (prime meridian)", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: 0, longitude: 0 }).success).toBe(true);
      });

      it("rejects longitude below -180", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: 0, longitude: -181 }).success).toBe(false);
      });

      it("rejects longitude above 180", () => {
        expect(updateUserLocationSchema.safeParse({ latitude: 0, longitude: 181 }).success).toBe(false);
      });
    });

    it("rejects missing fields", () => {
      expect(updateUserLocationSchema.safeParse({}).success).toBe(false);
      expect(updateUserLocationSchema.safeParse({ latitude: 26 }).success).toBe(false);
      expect(updateUserLocationSchema.safeParse({ longitude: 50 }).success).toBe(false);
    });
  });

  describe("activateEmergencySchema", () => {
    it("accepts shelter_in", () => {
      expect(activateEmergencySchema.safeParse({ type: "shelter_in" }).success).toBe(true);
    });

    it("accepts blackout", () => {
      expect(activateEmergencySchema.safeParse({ type: "blackout" }).success).toBe(true);
    });

    it("rejects unknown emergency type", () => {
      expect(activateEmergencySchema.safeParse({ type: "earthquake" }).success).toBe(false);
    });

    it("rejects empty type", () => {
      expect(activateEmergencySchema.safeParse({ type: "" }).success).toBe(false);
    });

    it("rejects missing type", () => {
      expect(activateEmergencySchema.safeParse({}).success).toBe(false);
    });
  });

  describe("setResponseStatusSchema", () => {
    it("accepts safe", () => {
      expect(setResponseStatusSchema.safeParse({ status: "safe" }).success).toBe(true);
    });

    it("accepts need_help", () => {
      expect(setResponseStatusSchema.safeParse({ status: "need_help" }).success).toBe(true);
    });

    it("rejects unknown status", () => {
      expect(setResponseStatusSchema.safeParse({ status: "evacuated" }).success).toBe(false);
    });

    it("rejects empty status", () => {
      expect(setResponseStatusSchema.safeParse({ status: "" }).success).toBe(false);
    });

    it("rejects missing status", () => {
      expect(setResponseStatusSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("accepts valid credentials", () => {
      expect(loginSchema.safeParse({ username: "admin", password: "pass123" }).success).toBe(true);
    });

    it("rejects empty username", () => {
      expect(loginSchema.safeParse({ username: "", password: "pass123" }).success).toBe(false);
    });

    it("rejects empty password", () => {
      expect(loginSchema.safeParse({ username: "admin", password: "" }).success).toBe(false);
    });

    it("rejects missing fields", () => {
      expect(loginSchema.safeParse({}).success).toBe(false);
      expect(loginSchema.safeParse({ username: "admin" }).success).toBe(false);
      expect(loginSchema.safeParse({ password: "pass" }).success).toBe(false);
    });
  });

  describe("insertAlertSchema", () => {
    it("accepts valid alert with all fields", () => {
      const result = insertAlertSchema.safeParse({
        title: "Gas Leak",
        description: "Detected in sector 7",
        severity: "critical",
        zoneId: "zone-1",
      });
      expect(result.success).toBe(true);
    });

    it("accepts alert with only required title", () => {
      const result = insertAlertSchema.safeParse({ title: "Fire" });
      expect(result.success).toBe(true);
    });

    it("rejects missing title", () => {
      const result = insertAlertSchema.safeParse({ severity: "high" });
      expect(result.success).toBe(false);
    });

    it("accepts valid severity values", () => {
      for (const severity of ["low", "medium", "high", "critical"]) {
        const result = insertAlertSchema.safeParse({ title: "Test", severity });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid severity", () => {
      const result = insertAlertSchema.safeParse({ title: "Test", severity: "extreme" });
      expect(result.success).toBe(false);
    });
  });

  describe("insertZoneSchema", () => {
    it("accepts valid zone", () => {
      const result = insertZoneSchema.safeParse({
        name: "Hot Zone",
        description: "Danger area",
        polygon: [{ latitude: 0, longitude: 0 }],
        color: "#FF0000",
        zoneType: "hot",
      });
      expect(result.success).toBe(true);
    });

    it("accepts zone with only required name", () => {
      const result = insertZoneSchema.safeParse({ name: "Test Zone" });
      expect(result.success).toBe(true);
    });

    it("rejects missing name", () => {
      const result = insertZoneSchema.safeParse({ color: "#00FF00" });
      expect(result.success).toBe(false);
    });

    it("accepts all valid zone types", () => {
      for (const zoneType of ["general", "alert", "hot", "warm", "safe"]) {
        const result = insertZoneSchema.safeParse({ name: "Z", zoneType });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid zone type", () => {
      const result = insertZoneSchema.safeParse({ name: "Z", zoneType: "radioactive" });
      expect(result.success).toBe(false);
    });
  });
});
