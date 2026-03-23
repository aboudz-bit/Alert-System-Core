import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";
import { loginSchema, insertZoneSchema, insertLocationSchema, insertAlertSchema } from "@shared/schema";
import bcrypt from "bcryptjs";

const PgSession = connectPgSimple(session);

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password: string, stored: string): boolean {
  return bcrypt.compareSync(password, stored);
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
  }
}

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: () => void) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!req.session.userRole || !roles.includes(req.session.userRole)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        createTableIfMissing: true,
      }),
      secret: (() => {
        const secret = process.env.SESSION_SECRET;
        if (!secret && process.env.NODE_ENV === "production") {
          throw new Error("SESSION_SECRET environment variable is required in production");
        }
        return secret || "emergency-alert-dev-secret";
      })(),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
    })
  );

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Username and password required" });
      }
      const { username, password } = parsed.data;
      const user = await storage.getUserByUsername(username);
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      const { password: _, ...safeUser } = user;
      return res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const { password: _, ...safeUser } = user;
      return res.json(safeUser);
    } catch (error) {
      console.error("Auth check error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/zones", requireAuth, async (_req: Request, res: Response) => {
    try {
      const allZones = await storage.getZones();
      return res.json(allZones);
    } catch (error) {
      console.error("Get zones error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/zones/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const zone = await storage.getZone(req.params.id);
      if (!zone) {
        return res.status(404).json({ message: "Zone not found" });
      }
      return res.json(zone);
    } catch (error) {
      console.error("Get zone error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/zones", requireRole("admin", "supervisor"), async (req: Request, res: Response) => {
    try {
      const parsed = insertZoneSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid zone data" });
      }
      const zone = await storage.createZone(parsed.data);
      return res.status(201).json(zone);
    } catch (error) {
      console.error("Create zone error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/zones/:id", requireRole("admin", "supervisor"), async (req: Request, res: Response) => {
    try {
      const parsed = insertZoneSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid zone data" });
      }
      const zone = await storage.updateZone(req.params.id, parsed.data);
      if (!zone) {
        return res.status(404).json({ message: "Zone not found" });
      }
      return res.json(zone);
    } catch (error) {
      console.error("Update zone error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/zones/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteZone(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Zone not found" });
      }
      return res.json({ message: "Zone deleted" });
    } catch (error) {
      console.error("Delete zone error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/locations", requireAuth, async (_req: Request, res: Response) => {
    try {
      const allLocations = await storage.getLocations();
      return res.json(allLocations);
    } catch (error) {
      console.error("Get locations error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/locations", requireRole("admin", "supervisor"), async (req: Request, res: Response) => {
    try {
      const parsed = insertLocationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid location data" });
      }
      const location = await storage.createLocation(parsed.data);
      return res.status(201).json(location);
    } catch (error) {
      console.error("Create location error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/locations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const location = await storage.getLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      return res.json(location);
    } catch (error) {
      console.error("Get location error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/locations/:id", requireRole("admin", "supervisor"), async (req: Request, res: Response) => {
    try {
      const parsed = insertLocationSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid location data" });
      }
      const location = await storage.updateLocation(req.params.id, parsed.data);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      return res.json(location);
    } catch (error) {
      console.error("Update location error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/locations/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteLocation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Location not found" });
      }
      return res.json({ message: "Location deleted" });
    } catch (error) {
      console.error("Delete location error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/alerts", requireAuth, async (_req: Request, res: Response) => {
    try {
      const allAlerts = await storage.getAlerts();
      return res.json(allAlerts);
    } catch (error) {
      console.error("Get alerts error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/alerts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const alert = await storage.getAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      return res.json(alert);
    } catch (error) {
      console.error("Get alert error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/alerts", requireRole("admin", "eco", "supervisor"), async (req: Request, res: Response) => {
    try {
      const parsed = insertAlertSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid alert data" });
      }
      const alert = await storage.createAlert({
        ...parsed.data,
        createdBy: req.session.userId,
      });
      return res.status(201).json(alert);
    } catch (error) {
      console.error("Create alert error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/alerts/:id", requireRole("admin", "eco", "supervisor"), async (req: Request, res: Response) => {
    try {
      const parsed = insertAlertSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid alert data" });
      }
      const alert = await storage.updateAlert(req.params.id, parsed.data);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      return res.json(alert);
    } catch (error) {
      console.error("Update alert error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/alerts/:id/clear", requireRole("admin", "eco", "supervisor"), async (req: Request, res: Response) => {
    try {
      const alert = await storage.clearAlert(req.params.id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      return res.json(alert);
    } catch (error) {
      console.error("Clear alert error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/alerts/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteAlert(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Alert not found" });
      }
      return res.json({ message: "Alert deleted" });
    } catch (error) {
      console.error("Delete alert error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
