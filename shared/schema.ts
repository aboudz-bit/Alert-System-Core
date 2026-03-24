import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, real, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("user_role", ["admin", "eco", "supervisor", "user"]);
export const alertStatusEnum = pgEnum("alert_status", ["active", "cleared"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["low", "medium", "high", "critical"]);
export const emergencyModeTypeEnum = pgEnum("emergency_mode_type", ["shelter_in", "blackout"]);
export const emergencyModeStatusEnum = pgEnum("emergency_mode_status", ["active", "cleared"]);

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("user"),
  badgeNumber: text("badge_number"),
  zoneId: varchar("zone_id").references(() => zones.id),
  locationId: varchar("location_id").references(() => locations.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const zones = pgTable("zones", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  polygon: jsonb("polygon").notNull().default([]),
  color: text("color").notNull().default("#FF0000"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const locations = pgTable("locations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  zoneId: varchar("zone_id").references(() => zones.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  severity: alertSeverityEnum("severity").notNull().default("medium"),
  status: alertStatusEnum("status").notNull().default("active"),
  zoneId: varchar("zone_id").references(() => zones.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  clearedAt: timestamp("cleared_at"),
});

export const emergencyModes = pgTable("emergency_modes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: emergencyModeTypeEnum("type").notNull(),
  status: emergencyModeStatusEnum("status").notNull().default("active"),
  activatedBy: varchar("activated_by").references(() => users.id),
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
  clearedAt: timestamp("cleared_at"),
  clearedBy: varchar("cleared_by").references(() => users.id),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  badgeNumber: true,
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const insertZoneSchema = createInsertSchema(zones).pick({
  name: true,
  description: true,
  polygon: true,
  color: true,
});

export const insertLocationSchema = createInsertSchema(locations).pick({
  name: true,
  latitude: true,
  longitude: true,
  zoneId: true,
});

export const insertAlertSchema = createInsertSchema(alerts).pick({
  title: true,
  description: true,
  severity: true,
  zoneId: true,
});

export const responseStatusEnum = pgEnum("response_status", ["safe", "need_help"]);

export const emergencyReceipts = pgTable("emergency_receipts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  emergencyModeId: varchar("emergency_mode_id")
    .notNull()
    .references(() => emergencyModes.id),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  confirmedAt: timestamp("confirmed_at").notNull().defaultNow(),
  responseStatus: responseStatusEnum("response_status"),
  respondedAt: timestamp("responded_at"),
}, (table) => [
  unique().on(table.emergencyModeId, table.userId),
]);

export const windConditions = pgTable("wind_conditions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  direction: real("direction").notNull().default(0),
  speed: real("speed").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

export const activateEmergencySchema = z.object({
  type: z.enum(["shelter_in", "blackout"]),
});

export const updateUserAssignmentSchema = z.object({
  zoneId: z.string().nullable(),
  locationId: z.string().nullable(),
});

export const updateWindSchema = z.object({
  direction: z.number().min(0).max(360),
  speed: z.number().min(0).max(300),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type EmergencyMode = typeof emergencyModes.$inferSelect;
export type EmergencyReceipt = typeof emergencyReceipts.$inferSelect;
export type EmergencyModeType = "shelter_in" | "blackout";
export type ResponseStatus = "safe" | "need_help";
export type UserRole = "admin" | "eco" | "supervisor" | "user";
export type WindCondition = typeof windConditions.$inferSelect;

export const setResponseStatusSchema = z.object({
  status: z.enum(["safe", "need_help"]),
});
