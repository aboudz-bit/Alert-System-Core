import { vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { hashPassword } from "../../routes";
import { createTestApp } from "./create-app";
import type { Server } from "http";

/**
 * Shared mock definitions for storage. Used inside vi.mock factory.
 * Must be copy-pasted into vi.mock() since factory runs in hoisted scope.
 */
export const STORAGE_MOCK_FACTORY = () => ({
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
});

const PASSWORD = "password123";
const HASHED = hashPassword(PASSWORD);

/**
 * Creates a mock user object with sensible defaults.
 */
export function mockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    username: "testuser",
    password: HASHED,
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

/**
 * Logs in as a user via the API, returning the session cookie.
 * Requires storage.getUserByUsername to be mocked before calling.
 */
export async function loginAs(
  app: import("express").Express,
  storageMock: any,
  role: string,
  username = `${role}-user`,
) {
  const user = mockUser({ role, username, id: `${role}-id-${username}` });
  vi.mocked(storageMock.getUserByUsername).mockResolvedValueOnce(user as any);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ username, password: PASSWORD });
  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.headers["set-cookie"];
}

/**
 * Sets up the Express app + server for an HTTP test suite.
 * Returns { app, server, storage } after beforeAll/afterAll/beforeEach are wired.
 */
export function setupTestServer(storageMod: { storage: any }) {
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

  // Return a proxy so tests can access app/server after beforeAll runs
  return {
    get app() { return app; },
    get server() { return server; },
    get storage() { return storageMod.storage; },
  };
}
