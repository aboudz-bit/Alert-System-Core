# Emergency Alert System - Phase 1 + Phase 2 Complete

## Overview

Emergency alert system mobile app built with Expo/React Native frontend and Express/PostgreSQL backend. Phase 1 implements authentication, role-based access, safe map rendering, zone/location management, and basic alert operations. Phase 2: Shelter In/Blackout emergency modes, ECO+Admin alert monitor map, receipt confirmation system, alarm sound, wind/hazard overlays, People monitoring tab, Dashboard operations view, Users operations monitor. Stability is the top priority.

## Stack

- **Frontend**: Expo SDK 54, React Native, React Navigation (expo-router)
- **Backend**: Express 5 on port 5000
- **Database**: PostgreSQL + Drizzle ORM
- **State Management**: Zustand (crash-safe stores with safe defaults)
- **Auth**: Session-based with express-session + connect-pg-simple
- **Validation**: Zod + drizzle-zod
- **Maps**: react-native-maps (1.18.0) with web fallback

## Structure

```text
app/                      # Expo Router screens
  _layout.tsx             # Root layout with auth guard, providers
  login.tsx               # Login screen
  create-zone.tsx         # Modal: create zone
  create-location.tsx     # Modal: create location
  create-alert.tsx        # Modal: create alert
  (tabs)/
    _layout.tsx           # Role-based tab navigation
    index.tsx             # Map screen with alert monitor (zones, locations, alerts, emergency overlay)
    zones.tsx             # Zones list
    locations.tsx         # Locations list
    alerts.tsx            # Alerts list with clear action + EmergencyPanel
    settings.tsx          # User info + logout
components/
  ErrorBoundary.tsx       # Class-based error boundary
  ErrorFallback.tsx       # Error UI with restart
  EmergencyPanel.tsx      # Shelter In / Blackout activate + clear UI + receipt confirmation
  NativeMap.tsx           # Native map with polygons, location markers, alert zone highlighting
hooks/
  useEmergencyAlarm.ts    # Alarm sound: plays on emergency, repeats 30s until receipt confirmed
  WindIndicator.tsx       # Wind direction arrow + speed display overlay
  NativeMap.web.tsx       # Web fallback with zone/location/alert/wind counts
constants/
  colors.ts              # Color constants
lib/
  auth-context.tsx        # Auth provider + useAuth hook
  store.ts                # Zustand store (zones, locations, alerts, emergencyMode)
  query-client.ts         # React Query client + API helpers
server/
  index.ts                # Express server setup
  routes.ts               # API routes (auth, zones, locations, alerts, emergency)
  storage.ts              # DatabaseStorage with drizzle-orm CRUD
  db.ts                   # PostgreSQL connection pool
  seed.ts                 # Seed script for default users
shared/
  schema.ts               # Drizzle schema + Zod validators
```

## Database Schema

- **users**: id, username, password, name, role (admin/eco/supervisor/user), badgeNumber (text, nullable), zoneId (FK zones, nullable), locationId (FK locations, nullable)
- **zones**: id, name, description, polygon (jsonb), color
- **locations**: id, name, latitude, longitude, zoneId (FK zones)
- **alerts**: id, title, description, severity, status, zoneId (FK zones), createdBy (FK users)
- **emergency_modes**: id, type (shelter_in/blackout), status (active/cleared), activatedBy (FK users), activatedAt, clearedAt, clearedBy (FK users)
- **emergency_receipts**: id, emergencyModeId (FK emergency_modes), userId (FK users), confirmedAt (unique per mode+user)
- **wind_conditions**: id, direction (0-360°), speed (km/h), updatedAt, updatedBy (FK users) — single row, upserted

## Roles

| Role       | Main Tabs                                       | Can Create Alerts | Can Activate Emergency |
|------------|------------------------------------------------|-------------------|----------------------|
| Admin      | Dashboard, Alert, Users, Zone Map, More         | Yes              | Yes                  |
| Supervisor | Dashboard, Alert, Users, Zone Map, More         | Yes               | Yes                  |
| ECO        | Dashboard, Alert, Users, Zone Map, More         | Yes               | Yes                  |
| User       | Dashboard, Alert, Zone Map, More                | No (read-only)    | No (view only)       |

### More Menu (sub-pages)
People, Zones, Locations, Permissions, ECO, Supervisor, Settings — visibility filtered by role

## API Routes

- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `POST /api/auth/logout` - Logout
- `GET/POST /api/zones` - List/Create zones
- `PUT/DELETE /api/zones/:id` - Update/Delete zone
- `GET/POST /api/locations` - List/Create locations
- `DELETE /api/locations/:id` - Delete location
- `GET/POST /api/alerts` - List/Create alerts
- `PATCH /api/alerts/:id/clear` - Clear an alert
- `GET /api/emergency/active` - Get current active emergency mode (all authenticated)
- `GET /api/emergency/history` - Get all emergency modes history (all authenticated)
- `POST /api/emergency/activate` - Activate shelter_in or blackout (admin/eco/supervisor)
- `PATCH /api/emergency/:id/clear` - Clear active emergency mode (admin/eco/supervisor)
- `POST /api/emergency/:id/receipt` - Confirm receipt of emergency (all authenticated)
- `GET /api/emergency/:id/receipt/me` - Get current user's receipt (all authenticated)
- `GET /api/emergency/:id/receipts` - Get all receipts for emergency (admin/eco/supervisor)
- `GET /api/emergency/:id/receipts/summary` - Get receipt summary with confirmed/not confirmed users (admin/eco/supervisor)
- `GET /api/wind` - Get current wind conditions (all authenticated)
- `POST /api/wind` - Update wind direction/speed (admin/eco/supervisor)
- `PATCH /api/users/:id/assignment` - Assign user to zone/location (admin only)
- `GET /api/people` - Get all users grouped with zone/location/receipt data (admin/eco/supervisor)

## Seed Users

- admin / admin123 (Administrator)
- eco1 / eco123 (ECO Officer)
- supervisor1 / super123 (Supervisor)
- user1 / user123 (Staff)

## Scripts

- `npm run server:dev` - Start backend (port 5000)
- `npm run expo:dev` - Start frontend (port 8081)
- `npm run db:push` - Push schema to database
- `npx tsx server/seed.ts` - Seed users

## Safety Rules

- All Zustand arrays default to []
- All selectors guard with || []
- emergencyMode defaults to null, setter coerces falsy to null
- Maps use coordinate validation before rendering
- Polygons validated (min 3 points, valid lat/lng)
- No non-null assertions anywhere
- Error boundaries wrap all screen content
- Platform.OS checks for web vs native map rendering
- activateEmergencyMode auto-clears any existing active mode before creating new one
