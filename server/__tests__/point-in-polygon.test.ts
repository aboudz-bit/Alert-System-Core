import { describe, it, expect } from "vitest";
import { pointInPolygon } from "../utils/geo";

// A simple square polygon: (0,0), (0,10), (10,10), (10,0)
const square = [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 10 },
  { latitude: 10, longitude: 10 },
  { latitude: 10, longitude: 0 },
];

// A triangle: (0,0), (5,10), (10,0)
const triangle = [
  { latitude: 0, longitude: 0 },
  { latitude: 5, longitude: 10 },
  { latitude: 10, longitude: 0 },
];

// An L-shaped concave polygon
const lShape = [
  { latitude: 0, longitude: 0 },
  { latitude: 0, longitude: 5 },
  { latitude: 5, longitude: 5 },
  { latitude: 5, longitude: 10 },
  { latitude: 10, longitude: 10 },
  { latitude: 10, longitude: 0 },
];

describe("pointInPolygon", () => {
  describe("square polygon", () => {
    it("returns true for a point inside the square", () => {
      expect(pointInPolygon(5, 5, square)).toBe(true);
    });

    it("returns true for a point near a corner but inside", () => {
      expect(pointInPolygon(1, 1, square)).toBe(true);
    });

    it("returns false for a point outside the square", () => {
      expect(pointInPolygon(15, 15, square)).toBe(false);
    });

    it("returns false for a point above the square", () => {
      expect(pointInPolygon(5, 15, square)).toBe(false);
    });

    it("returns false for a point left of the square", () => {
      expect(pointInPolygon(5, -1, square)).toBe(false);
    });

    it("returns false for a point below the square", () => {
      expect(pointInPolygon(-1, 5, square)).toBe(false);
    });
  });

  describe("triangle polygon", () => {
    it("returns true for centroid of triangle", () => {
      expect(pointInPolygon(5, 3, triangle)).toBe(true);
    });

    it("returns false for a point outside the triangle", () => {
      expect(pointInPolygon(1, 8, triangle)).toBe(false);
    });
  });

  describe("concave (L-shaped) polygon", () => {
    it("returns true for a point in the bottom part of the L", () => {
      expect(pointInPolygon(8, 5, lShape)).toBe(true);
    });

    it("returns true for a point in the right arm of the L", () => {
      // lat=7, lng=8 is in the upper-right section (lat 5-10, lng 0-10)
      expect(pointInPolygon(7, 8, lShape)).toBe(true);
    });

    it("returns false for a point in the concave cutout", () => {
      expect(pointInPolygon(2, 8, lShape)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false for null/undefined polygon", () => {
      expect(pointInPolygon(5, 5, null as any)).toBe(false);
    });

    it("returns false for empty polygon", () => {
      expect(pointInPolygon(5, 5, [])).toBe(false);
    });

    it("returns false for polygon with fewer than 3 points", () => {
      const line = [
        { latitude: 0, longitude: 0 },
        { latitude: 10, longitude: 10 },
      ];
      expect(pointInPolygon(5, 5, line)).toBe(false);
    });

    it("returns false for a single-point polygon", () => {
      const point = [{ latitude: 5, longitude: 5 }];
      expect(pointInPolygon(5, 5, point)).toBe(false);
    });
  });

  describe("real-world coordinates", () => {
    // A rough polygon around a facility area (lat/lng in Saudi Arabia region)
    const facilityZone = [
      { latitude: 26.30, longitude: 50.10 },
      { latitude: 26.30, longitude: 50.14 },
      { latitude: 26.34, longitude: 50.14 },
      { latitude: 26.34, longitude: 50.10 },
    ];

    it("returns true for a point inside the facility zone", () => {
      expect(pointInPolygon(26.32, 50.12, facilityZone)).toBe(true);
    });

    it("returns false for a point outside the facility zone", () => {
      expect(pointInPolygon(26.35, 50.15, facilityZone)).toBe(false);
    });

    it("returns false for a point far away", () => {
      expect(pointInPolygon(25.0, 49.0, facilityZone)).toBe(false);
    });
  });
});
