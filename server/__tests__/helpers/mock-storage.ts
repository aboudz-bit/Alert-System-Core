import { vi } from "vitest";
import type { IStorage } from "../../server/storage";

export function createMockStorage(): IStorage {
  return {
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
  };
}
