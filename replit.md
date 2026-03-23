# Emergency Alert System - Phase 1

## Overview

Emergency alert system mobile app built with Expo/React Native frontend and Express/PostgreSQL backend. Phase 1 implements authentication, role-based access, safe map rendering, zone/location management, and basic alert operations. Stability is the top priority.

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
    index.tsx             # Map screen (safe rendering)
    zones.tsx             # Zones list
    locations.tsx         # Locations list
    alerts.tsx            # Alerts list with clear action
    settings.tsx          # User info + logout
components/
  ErrorBoundary.tsx       # Class-based error boundary
  ErrorFallback.tsx       # Error UI with restart
  NativeMap.tsx           # Native map with polygon rendering
  NativeMap.web.tsx       # Web fallback (no react-native-maps)
constants/
  colors.ts              # Color constants
lib/
  auth-context.tsx        # Auth provider + useAuth hook
  store.ts                # Zustand store (zones, locations, alerts)
  query-client.ts         # React Query client + API helpers
server/
  index.ts                # Express server setup
  routes.ts               # API routes (auth, zones, locations, alerts)
  storage.ts              # DatabaseStorage with drizzle-orm CRUD
  db.ts                   # PostgreSQL connection pool
  seed.ts                 # Seed script for default users
shared/
  schema.ts               # Drizzle schema + Zod validators
```

## Database Schema

- **users**: id, username, password, name, role (admin/eco/supervisor/user)
- **zones**: id, name, description, polygon (jsonb), color
- **locations**: id, name, latitude, longitude, zoneId (FK zones)
- **alerts**: id, title, description, severity, status, zoneId (FK zones), createdBy (FK users)

## Roles

| Role       | Tabs                                   | Can Create Alerts |
|------------|----------------------------------------|-------------------|
| Admin      | Map, Zones, Locations, Alerts, Settings | Yes              |
| Supervisor | Map, Zones, Alerts, Settings           | Yes               |
| ECO        | Map, Alerts, Settings                  | Yes               |
| User       | Map, Alerts, Settings                  | No (read-only)    |

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
- Maps use coordinate validation before rendering
- Polygons validated (min 3 points, valid lat/lng)
- No non-null assertions anywhere
- Error boundaries wrap all screen content
- Platform.OS checks for web vs native map rendering
