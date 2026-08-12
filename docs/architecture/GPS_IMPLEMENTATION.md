# GPS Implementation Report — Driver App

Status: **Implemented** (SDK 54, Expo)
Scope: Trip-scoped live location tracking with foreground + background GPS acquisition.

## Overview

The driver app acquires high-accuracy GPS fixes while a trip is `in_progress` and streams them to the backend on a per-trip endpoint. Tracking is started/stopped by the Live Trip screen (`src/app/(tabs)/(home)/transport/live-trip.tsx`) and torn down on logout.

## Architecture

```
Live Trip screen ── startTripTracking(tripId) / stopTripTracking()
      │
      ▼
src/services/tripTracking.ts          ← lifecycle, permissions, watch, throttling
      ├── Foreground watch (Location.watchPositionAsync)
      │      accuracy: High · timeInterval 4000ms · distanceInterval 5m
      └── Background task (TaskManager + Location.startLocationUpdatesAsync)
             accuracy: High · timeInterval 5000ms · deferred 10s/50m
             activityType: AutomotiveNavigation · foreground service notification

      ▼
src/services/locationQueue.ts         ← offline AsyncStorage queue + batch sync
      │        enqueueLocation(tripId, point)  ·  flushLocationQueue()
      ▼
src/services/api.ts ── uploadTripLocations(tripId, points) → POST /driver/trips/{tripId}/location
```

## Permissions (Android + iOS)

| Level | Required for | Requested via |
|---|---|---|
| `ACCESS_FINE_LOCATION` | foreground fixes | `Location.requestForegroundPermissionsAsync()` |
| `ACCESS_BACKGROUND_LOCATION` / `locationAlways` | background fixes | `Location.requestBackgroundPermissionsAsync()` |

- `src/services/tripTracking.ts` → `requestTrackingPermissions()` requests foreground first; background is requested only when `isBackgroundAvailable()` (non-web). On iOS the background prompt is shown the first time the foreground prompt appears.
- If the user denies, `tracking.store.permission` is set to `"denied"`, tracking never starts, and the Live Trip screen shows a "Location permission required" banner with a **Fix permissions** button (`openSystemSettings()` → `app-settings:`).

## Location services gate

Before starting, `isLocationServicesEnabled()` checks `Location.getProviderStatusAsync()`. If GPS/GNSS is off, status is set to `"gps_off"` and the screen shows a "Location services are turned off" banner.

## Accuracy / cadence

| Setting | Foreground | Background |
|---|---|---|
| accuracy | `High` | `High` |
| timeInterval | 4 000 ms | 5 000 ms |
| distanceInterval | 5 m | 0 (no gating — deferral handles it) |
| deferral | — | 10 s / 50 m |
| activityType | — | `AutomotiveNavigation` |
| background indicator | — | on (`showsBackgroundLocationIndicator`) |

Values chosen to keep battery impact low while still producing a smooth route polyline at bus speed (≈ every 4–5 s ≈ 50–100 m per fix at 40–70 km/h).

## Anti-spoofing

- `location.mocked === true` fixes are **discarded in production** (`allowMockedLocation()` returns `NODE_ENV !== "production"`).
- Dev/Expo Go/emulators report `mocked=true`, so mocked fixes are allowed locally to keep development workflow usable.
- Applied in **both** the foreground watch (`tripTracking.ts`) and the background task (`locationTask.ts`).

## Sample payload

Each fix becomes a `TripLocationPoint`:

```ts
{ lat: number, lng: number, speed: number | null, heading: number | null, timestamp: ISO8601 }
```

## GPS state surfaced to the UI

`tracking.store` exposes `permission` (`undetermined | granted | denied`), `status` (`idle | tracking | offline | denied | gps_off`), `position`, `error`. The Live Trip screen renders a status pill and actionable banners.

## Known limitations

- Background location requires a **development/production build** (not Expo Go on iOS; Expo Go on Android supports background location only for some SDKs — use a dev build).
- Android background accuracy can be reduced by OS battery optimizations; recommend excluding the app from battery optimization for school-vehicle use.
