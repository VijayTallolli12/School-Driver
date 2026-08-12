# Background Tracking Report — Driver App

Status: **Implemented** via `expo-task-manager` + `expo-location` background location + `expo-background-fetch`

## Packages (installed with `npx expo install`)

- `expo-task-manager@~14.0.9`
- `expo-background-fetch@~14.0.9`
- `expo-location@~19.0.8`
- `react-native-maps@1.20.1`

## Background location task

- **Task name:** `driver-trip-location-task` (`TRIP_LOCATION_TASK`).
- **Defined at module import** in `src/services/locationTask.ts` — the definition is evaluated at app startup so it survives cold background launches.
- **Registered** (task registration occurs in `tripTracking.ts` → `Location.startLocationUpdatesAsync`) only while a trip is active.
- **Options** (`src/services/tripTracking.ts` `BACKGROUND_OPTIONS`):
  - accuracy `High`, `timeInterval` 5000 ms, no distance gate
  - `deferredUpdatesInterval` 10 000 ms, `deferredUpdatesDistance` 50 m (batches fixes on Android)
  - `activityType: AutomotiveNavigation`
  - `showsBackgroundLocationIndicator: true` (iOS blue pill)
  - **Foreground service** (`Android`): notification "Live trip tracking" / "Sharing your location for the active trip." with `killServiceOnDestroy: true`.

## Foreground-service config (app.json)

The `expo-location` config plugin is enabled:

```json
["expo-location", {
  "locationWhenInUsePermission": "...",
  "locationAlwaysAndWhenInUsePermission": "...",
  "isIosBackgroundLocationEnabled": true,
  "isAndroidBackgroundLocationEnabled": true,
  "isAndroidForegroundServiceEnabled": true
}]
```

iOS `UIBackgroundModes: ["location", "fetch"]` is set in `app.json → ios.infoPlist`.

## Background-fetch flush task

- **Task name:** `driver-location-flush-fetch` (`LOCATION_FLUSH_FETCH_TASK`).
- Registered once in the root layout `useEffect` (`src/app/_layout.tsx` → `registerBackgroundFetch()`).
- `minimumInterval: 15` min, `stopOnTerminate: false`, `startOnBoot: true`.
- Every invocation reads the persisted trip context (`getTrackingContext`); if a trip is active it flushes the location queue and returns `BackgroundFetchResult`:
  - `Failed` → network offline (so iOS reschedules more eagerly)
  - `NewData` → points remain
  - `NoData` → queue empty or no active trip.

## Active-trip context

- `src/utils/trackingContext.ts` persists `{ tripId, startedAt }` to AsyncStorage.
- Background tasks read it to know **which** trip to enqueue into — no data leaks across trips.
- Cleared by `stopTripTracking()` (trip end, or logout — `src/app/(tabs)/profile/index.tsx` calls `stopTripTracking()` before clearing auth).

## Lifecycle summary

| Event | Foreground watch | BG location task | BG fetch task | Queue |
|---|---|---|---|---|
| Trip start | start | start | registered (once) | flushed |
| Fix arrives | enqueue + throttled flush | enqueue + flush | — | grows/shrinks |
| App backgrounded | stops delivering | continues (fg service) | flushes every ~15 min | bounded by LRU 500/trip |
| App terminated | — | OS restarts service (fg service + startOnBoot) | runs at boot | persisted |
| Trip end / logout | stop + flush | stop + unregister | stays registered | drained |

## Platform caveats

- **iOS:** background location + background fetch require a **development/production build**; they do not work in the iOS Expo Go client.
- **Android:** background location works in Expo Go for some SDKs but is unreliable — use a dev build. The foreground service notification keeps the process alive during active trips.
- **Battery:** AutomotiveNavigation activity + deferred updates keep power draw reasonable; recommend excluding the driver app from Android battery optimization.
- `expo-background-fetch` is deprecated in SDK 54 in favor of `expo-background-task` (same API). Kept as spec requires; migration is a drop-in swap.
