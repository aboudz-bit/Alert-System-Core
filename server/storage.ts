import {
  type User,
  type InsertUser,
  type Zone,
  type InsertZone,
  type Location,
  type InsertLocation,
  type Alert,
  type InsertAlert,
  users,
  zones,
  locations,
  alerts,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getZones(): Promise<Zone[]>;
  getZone(id: string): Promise<Zone | undefined>;
  createZone(zone: InsertZone): Promise<Zone>;
  updateZone(id: string, zone: Partial<InsertZone>): Promise<Zone | undefined>;
  deleteZone(id: string): Promise<boolean>;

  getLocations(): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  deleteLocation(id: string): Promise<boolean>;

  getAlerts(): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert & { createdBy?: string }): Promise<Alert>;
  clearAlert(id: string): Promise<Alert | undefined>;
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

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
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

  async clearAlert(id: string): Promise<Alert | undefined> {
    const result = await db
      .update(alerts)
      .set({ status: "cleared", clearedAt: new Date() })
      .where(eq(alerts.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
