import { vi } from "vitest";

// Mock connect-pg-simple to return a memory session store (avoids real DB)
vi.mock("connect-pg-simple", () => {
  return {
    default: () => {
      const session = require("express-session");
      return session.MemoryStore;
    },
  };
});

// Mock the pg pool used by session store
vi.mock("../../server/db", () => ({
  pool: { query: vi.fn(), on: vi.fn() },
  db: {},
}));
