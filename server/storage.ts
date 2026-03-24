import {
  type User,
  type InsertUser,
  type Zone,
  type InsertZone,
  type Location,
  type InsertLocation,
  type Alert,
  type InsertAlert,
  type EmergencyMode,
  type EmergencyModeType,
  type EmergencyReceipt,
  type WindCondition,
  users,
  zones,
  locations,
  alerts,
  emergencyModes,
  emergencyReceipts,
  windConditions,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserAssignment(id: string, zoneId: string | null, locationId: string | null): Promise<User | undefined>;

  getZones(): Promise<Zone[]>;
  getZone(id: string): Promise<Zone | undefined>;
  createZone(zone: InsertZone): Promise<Zone>;
  updateZone(id: string, zone: Partial<InsertZone>): Promise<Zone | undefined>;
  deleteZone(id: string): Promise<boolean>;

  getLocations(): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: string): Promise<boolean>;

  getAlerts(): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert & { createdBy?: string }): Promise<Alert>;
  updateAlert(id: string, alert: Partial<InsertAlert>): Promise<Alert | undefined>;
  clearAlert(id: string): Promise<Alert | undefined>;
  deleteAlert(id: string): Promise<boolean>;

  getActiveEmergencyMode(): Promise<EmergencyMode | undefined>;
  getEmergencyModes(): Promise<EmergencyMode[]>;
  activateEmergencyMode(type: EmergencyModeType, activatedBy: string): Promise<EmergencyMode>;
  clearEmergencyMode(id: string, clearedBy: string): Promise<EmergencyMode | undefined>;

  confirmReceipt(emergencyModeId: string, userId: string): Promise<EmergencyReceipt>;
  setResponseStatus(emergencyModeId: string, userId: string, status: "safe" | "need_help"): Promise<EmergencyReceipt>;
  getReceiptsByMode(emergencyModeId: string): Promise<EmergencyReceipt[]>;
  getUserReceipt(emergencyModeId: string, userId: string): Promise<EmergencyReceipt | undefined>;

  getWindCondition(): Promise<WindCondition | undefined>;
  updateWindCondition(direction: number, speed: number, updatedBy: string): Promise<WindCondition>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUserAssignment(id: string, zoneId: string | null, locationId: string | null): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ zoneId, locationId })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getZones(): Promise<Zone[]> {
    return db.select().from(zones);
  }

  async getZone(id: string): Promise<Zone | undefined> {
    const result = await db.select().from(zones).where(eq(zones.id, id));
    return result[0];
  }

  async createZone(zone: InsertZone): Promise<Zone> {
    const result = await db.insert(zones).values(zone).returning();
    return result[0];
  }

  async updateZone(id: string, zone: Partial<InsertZone>): Promise<Zone | undefined> {
    const result = await db
      .update(zones)
      .set({ ...zone, updatedAt: new Date() })
      .where(eq(zones.id, id))
      .returning();
    return result[0];
  }

  async deleteZone(id: string): Promise<boolean> {
    const result = await db.delete(zones).where(eq(zones.id, id)).returning();
    return result.length > 0;
  }

  async getLocations(): Promise<Location[]> {
    return db.select().from(locations);
  }

  async getLocation(id: string): Promise<Location | undefined> {
    const result = await db.select().from(locations).where(eq(locations.id, id));
    return result[0];
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const result = await db.insert(locations).values(location).returning();
    return result[0];
  }

  async updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const result = await db
      .update(locations)
      .set(location)
      .where(eq(locations.id, id))
      .returning();
    return result[0];
  }

  async deleteLocation(id: string): Promise<boolean> {
    const result = await db.delete(locations).where(eq(locations.id, id)).returning();
    return result.length > 0;
  }

  async getAlerts(): Promise<Alert[]> {
    return db.select().from(alerts);
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const result = await db.select().from(alerts).where(eq(alerts.id, id));
    return result[0];
  }

  async createAlert(alert: InsertAlert & { createdBy?: string }): Promise<Alert> {
    const result = await db.insert(alerts).values(alert).returning();
    return result[0];
  }

  async updateAlert(id: string, alert: Partial<InsertAlert>): Promise<Alert | undefined> {
    const result = await db
      .update(alerts)
      .set(alert)
      .where(eq(alerts.id, id))
      .returning();
    return result[0];
  }

  async clearAlert(id: string): Promise<Alert | undefined> {
    const result = await db
      .update(alerts)
      .set({ status: "cleared", clearedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();
    return result[0];
  }

  async deleteAlert(id: string): Promise<boolean> {
    const result = await db.delete(alerts).where(eq(alerts.id, id)).returning();
    return result.length > 0;
  }

  async getActiveEmergencyMode(): Promise<EmergencyMode | undefined> {
    const result = await db
      .select()
      .from(emergencyModes)
      .where(eq(emergencyModes.status, "active"));
    return result[0];
  }

  async getEmergencyModes(): Promise<EmergencyMode[]> {
    return db.select().from(emergencyModes);
  }

  async activateEmergencyMode(type: EmergencyModeType, activatedBy: string): Promise<EmergencyMode> {
    return db.transaction(async (tx) => {
      await tx
        .update(emergencyModes)
        .set({ status: "cleared", clearedAt: new Date(), clearedBy: activatedBy })
        .where(eq(emergencyModes.status, "active"));

      const result = await tx
        .insert(emergencyModes)
        .values({ type, activatedBy })
        .returning();
      return result[0];
    });
  }

  async clearEmergencyMode(id: string, clearedBy: string): Promise<EmergencyMode | undefined> {
    const result = await db
      .update(emergencyModes)
      .set({ status: "cleared", clearedAt: new Date(), clearedBy })
      .where(and(eq(emergencyModes.id, id), eq(emergencyModes.status, "active")))
      .returning();
    return result[0];
  }

  async confirmReceipt(emergencyModeId: string, userId: string): Promise<EmergencyReceipt> {
    const result = await db
      .insert(emergencyReceipts)
      .values({ emergencyModeId, userId })
      .onConflictDoNothing()
      .returning();
    if (result.length > 0) return result[0];
    const existing = await this.getUserReceipt(emergencyModeId, userId);
    if (!existing) throw new Error("Failed to confirm receipt");
    return existing;
  }

  async setResponseStatus(emergencyModeId: string, userId: string, status: "safe" | "need_help"): Promise<EmergencyReceipt> {
    const existing = await this.getUserReceipt(emergencyModeId, userId);
    const now = new Date();
    if (existing) {
      const result = await db
        .update(emergencyReceipts)
        .set({ responseStatus: status, respondedAt: now })
        .where(eq(emergencyReceipts.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db
      .insert(emergencyReceipts)
      .values({ emergencyModeId, userId, confirmedAt: now, responseStatus: status, respondedAt: now })
      .returning();
    return result[0];
  }

  async getReceiptsByMode(emergencyModeId: string): Promise<EmergencyReceipt[]> {
    return db
      .select()
      .from(emergencyReceipts)
      .where(eq(emergencyReceipts.emergencyModeId, emergencyModeId));
  }

  async getUserReceipt(emergencyModeId: string, userId: string): Promise<EmergencyReceipt | undefined> {
    const result = await db
      .select()
      .from(emergencyReceipts)
      .where(
        and(
          eq(emergencyReceipts.emergencyModeId, emergencyModeId),
          eq(emergencyReceipts.userId, userId)
        )
      );
    return result[0];
  }

  async getWindCondition(): Promise<WindCondition | undefined> {
    const result = await db.select().from(windConditions);
    return result[0];
  }

  async updateWindCondition(direction: number, speed: number, updatedBy: string): Promise<WindCondition> {
    const existing = await this.getWindCondition();
    if (existing) {
      const result = await db
        .update(windConditions)
        .set({ direction, speed, updatedAt: new Date(), updatedBy })
        .where(eq(windConditions.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db
      .insert(windConditions)
      .values({ direction, speed, updatedBy })
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
