import { pool } from "./db";
import { storage } from "./storage";
import crypto from "crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function seed() {
  console.log("Seeding database...");

  const existing = await storage.getUserByUsername("admin");
  if (existing) {
    console.log("Admin user already exists, skipping seed.");
    await pool.end();
    return;
  }

  await storage.createUser({
    username: "admin",
    password: hashPassword("admin123"),
    name: "System Admin",
    role: "admin",
  });

  await storage.createUser({
    username: "eco1",
    password: hashPassword("eco123"),
    name: "ECO Officer",
    role: "eco",
  });

  await storage.createUser({
    username: "supervisor1",
    password: hashPassword("super123"),
    name: "Site Supervisor",
    role: "supervisor",
  });

  await storage.createUser({
    username: "user1",
    password: hashPassword("user123"),
    name: "Staff Member",
    role: "user",
  });

  console.log("Seed complete. Users created:");
  console.log("  admin / admin123 (Admin)");
  console.log("  eco1 / eco123 (ECO)");
  console.log("  supervisor1 / super123 (Supervisor)");
  console.log("  user1 / user123 (User)");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
