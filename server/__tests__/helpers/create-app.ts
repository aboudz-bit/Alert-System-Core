import express from "express";
import { registerRoutes } from "../../routes";

/**
 * Creates a test Express app with routes registered.
 * Storage must be mocked before calling this.
 */
export async function createTestApp() {
  const app = express();
  app.use(express.json());
  const server = await registerRoutes(app);
  return { app, server };
}
