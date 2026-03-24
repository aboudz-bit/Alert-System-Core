# Test Coverage Analysis

## Current State

**The codebase has zero test coverage.** There are no test files, no test runner (Jest, Vitest, etc.), no coverage configuration, and no CI test step. For a safety-critical emergency alert system, this represents significant risk.

## Priority Areas for Test Coverage

### Priority 1: Critical — Pure Logic & Security

#### `pointInPolygon` (server/routes.ts:46-67)
Determines whether regular users see zone-scoped alerts. A bug means users **miss emergency alerts** or receive irrelevant ones.

- **Why**: Pure function, high impact, trivially testable
- **Test cases**:
  - Point clearly inside a convex polygon
  - Point clearly outside a polygon
  - Point on the edge of a polygon
  - Concave polygon (point in concavity)
  - Degenerate inputs: fewer than 3 points, empty array, null/undefined
  - Very small polygon (precision edge cases)
  - Polygon crossing the antimeridian (±180° longitude)

#### Auth Middleware: `requireAuth`, `requireRole` (server/routes.ts:27-44)
Guards every API endpoint. A bug here is a **privilege escalation** vulnerability.

- **Why**: Security boundary, simple to test
- **Test cases**:
  - Unauthenticated request → 401
  - Authenticated but wrong role → 403
  - Authenticated with correct role → passes through
  - Multiple allowed roles (e.g., `requireRole("admin", "eco", "supervisor")`)
  - Missing `userRole` on session → 403

### Priority 2: High — API Route Handlers

#### Alert Filtering Logic (server/routes.ts:276-331)
The `GET /api/alerts` endpoint has complex role-based + geolocation-based filtering.

- **Test cases**:
  - Admin/eco/supervisor see all alerts
  - Regular user sees non-zone alerts
  - Regular user with location inside zone sees zone alerts
  - Regular user with location outside zone does NOT see zone alerts
  - Regular user with no location set sees only non-zone alerts
  - Zone with invalid/missing polygon data

#### Emergency Mode Lifecycle (server/routes.ts:426-459)
Activation atomically clears previous active modes. Receipt confirmation and response status tracking.

- **Test cases**:
  - Activate emergency mode clears previous active mode
  - Clear emergency mode by ID
  - Confirm receipt (idempotent — duplicate calls return existing)
  - Set response status ("safe" / "need_help")
  - Response on non-active emergency → 400
  - Receipt summary: confirmed vs. not-confirmed users

#### User Assignment Validation (server/routes.ts:583-635)
Business rule: cannot assign a location without a zone; location must belong to the assigned zone.

- **Test cases**:
  - Valid zone + location assignment
  - Location without zone → 400
  - Nonexistent zone → 400
  - Location not belonging to zone → 400
  - Nonexistent user → 404
  - Clear assignment (null zone, null location)

#### CRUD Endpoints (zones, locations, alerts, wind)
Standard create/read/update/delete with Zod validation.

- **Test cases per resource**:
  - Create with valid data → 201
  - Create with invalid data → 400
  - Get by ID → 200 / 404
  - Update existing → 200, Update nonexistent → 404
  - Delete existing → 200, Delete nonexistent → 404
  - Role restrictions (e.g., only admin can delete)

### Priority 3: Medium — Validation Schemas & State Management

#### Zod Schemas (shared/schema.ts)
First line of defense against bad data.

- **Test cases**:
  - `loginSchema`: rejects empty username/password
  - `updateWindSchema`: direction 0-360, speed 0-300, rejects out-of-bounds
  - `updateUserLocationSchema`: latitude ±90, longitude ±180
  - `insertAlertSchema`: required `title`, valid severity enum
  - `activateEmergencySchema`: valid type enum only

#### Zustand Store (lib/store.ts)
Client-side state with defensive logic.

- **Test cases**:
  - `setWindData`: rejects NaN, Infinity, out-of-bounds values; skips no-op updates
  - `setEmergencyMode`: skip when same ID + status; handles null
  - `addZone` / `removeZone` / `updateZone`: immutable updates
  - `selectActiveAlerts`: filters by status === "active"
  - Defensive array handling (non-array input → empty array)

#### Custom Fetch (lib/api-client-react/src/custom-fetch.ts)
HTTP client with complex error handling.

- **Test cases**:
  - Base URL prepending for relative paths
  - Auth token injection via getter
  - JSON content-type auto-detection
  - Error parsing: JSON error bodies, text error bodies, empty bodies
  - BOM stripping
  - `ApiError` and `ResponseParseError` construction
  - GET/HEAD with body → TypeError

### Priority 4: Lower — Harder to Test

#### `DatabaseStorage` (server/storage.ts)
Requires either a test database or mocked Drizzle ORM.

- **Key methods to test**:
  - `activateEmergencyMode`: transactional (clears existing + inserts new)
  - `confirmReceipt`: ON CONFLICT DO NOTHING + fallback to existing
  - `setResponseStatus`: conditional upsert behavior
  - `updateWindCondition`: insert vs. update logic

#### React Hooks (hooks/useEmergencyAlarm.ts, hooks/useLocationTracker.ts)
Need React Testing Library + mocks for `expo-av`, `expo-location`.

- **Key behaviors**:
  - `useEmergencyAlarm`: plays on active + unconfirmed, stops on confirm, 30s interval, cleanup
  - `useLocationTracker`: permission check, deduplication (0.00001° threshold), 30s interval, cleanup on logout

## Recommended Test Infrastructure

| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner — fast, TypeScript-native, ESM support |
| **Supertest** | HTTP-level Express route testing |
| **React Testing Library** | Hook and component tests |
| **@testing-library/react-hooks** | Isolated hook testing |

### Suggested File Structure

```
__tests__/
  server/
    pointInPolygon.test.ts       # Pure logic tests
    auth-middleware.test.ts       # requireAuth, requireRole
    routes.test.ts               # API integration tests (with supertest)
    storage.test.ts              # DatabaseStorage (integration or mocked)
  shared/
    schema-validation.test.ts    # Zod schema tests
  lib/
    store.test.ts                # Zustand store tests
    custom-fetch.test.ts         # HTTP client tests
  hooks/
    useEmergencyAlarm.test.ts    # Alarm hook
    useLocationTracker.test.ts   # Location tracker hook
```

## Estimated Coverage Impact

| Area | Files | Estimated Lines | Effort |
|------|-------|----------------|--------|
| `pointInPolygon` + auth middleware | 1 | ~40 | Low |
| Zod schemas | 1 | ~100 | Low |
| Zustand store | 1 | ~120 | Low |
| API routes (supertest) | 1 | ~700 | Medium |
| Custom fetch | 1 | ~370 | Medium |
| DatabaseStorage | 1 | ~300 | High |
| React hooks | 2 | ~250 | High |

Starting with Priority 1 and 2 would cover the highest-risk code with the least effort.
