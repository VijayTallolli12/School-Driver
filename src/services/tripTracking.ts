import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Linking, Platform } from "react-native";
import { useTrackingStore } from "@/store/tracking.store";
import {
  enqueueLocation,
  flushLocationQueue,
  getLocationQueue,
} from "@/services/locationQueue";
import { clearTrackingContext, setTrackingContext } from "@/utils/trackingContext";
import type { DriverLocationSnapshot, TripLocationPoint } from "@/types";

export const TRIP_LOCATION_TASK = "driver-trip-location-task";

// Fixes worse than this (tunnel / indoor reflections) are dropped before they
// reach the queue so the route line and dashboard don't get garbage pings.
export const MIN_USABLE_ACCURACY_METERS = 250;

export type AccuracyQuality = "high" | "ok" | "poor" | "none";

export function accuracyQuality(accuracy: number | null | undefined): AccuracyQuality {
  if (accuracy === null || accuracy === undefined) return "none";
  if (accuracy <= 15) return "high";
  if (accuracy <= 50) return "ok";
  return "poor";
}

// null means the platform couldn't report it — keep the point rather than lose
// valid route data; UI shows "none" quality.
export function isUsableFix(accuracy: number | null | undefined): boolean {
  return accuracy === null || accuracy === undefined || accuracy <= MIN_USABLE_ACCURACY_METERS;
}

// Foreground updates every ~4s or on 5m movement: high accuracy without a
// battery drain spike (distance gating + batching).
const FOREGROUND_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 4000,
  distanceInterval: 5,
};

const BACKGROUND_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,
  distanceInterval: 0,
  pausesUpdatesAutomatically: false,
  deferredUpdatesInterval: 10000,
  deferredUpdatesDistance: 50,
  activityType: Location.ActivityType.AutomotiveNavigation,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: "Live trip tracking",
    notificationBody: "Sharing your location for the active trip.",
    notificationColor: "#10B981",
    killServiceOnDestroy: true,
  },
};

// Anti-spoofing: reject mocked fixes in production builds. The emulator
// (Expo Go / dev builds) reports mocked=true, so we still allow it locally.
export function allowMockedLocation(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function isBackgroundAvailable(): boolean {
  return Platform.OS !== "web";
}

let activeWatch: Location.LocationSubscription | null = null;

function toSnapshot(position: Location.LocationObject): DriverLocationSnapshot {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    speed: position.coords.speed ?? null,
    heading: position.coords.heading ?? null,
    accuracy: position.coords.accuracy ?? null,
    timestamp: new Date(position.timestamp).toISOString(),
  };
}

export function locationObjectToSnapshot(position: Location.LocationObject): DriverLocationSnapshot {
  return toSnapshot(position);
}

function toPoint(snapshot: DriverLocationSnapshot): TripLocationPoint {
  return {
    lat: snapshot.latitude,
    lng: snapshot.longitude,
    speed: snapshot.speed,
    heading: snapshot.heading,
    accuracy: snapshot.accuracy,
    timestamp: snapshot.timestamp,
  };
}

export function snapshotToPoint(snapshot: DriverLocationSnapshot): TripLocationPoint {
  return toPoint(snapshot);
}

function updateQueueState(result: { pending: number; synced: number; offline: boolean }): void {
  const store = useTrackingStore.getState();
  store.setQueuedCount(result.pending);
  store.setStatus(result.offline ? "offline" : "tracking");
  if (result.synced > 0) {
    store.setLastSyncedAt(new Date().toISOString());
  }
}

async function refreshQueueCount(): Promise<void> {
  const queue = await getLocationQueue();
  useTrackingStore.getState().setQueuedCount(queue.length);
}

// ─── Permissions ───────────────────────────────────────────────

export async function getTrackingPermissionState(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = await Location.getBackgroundPermissionsAsync();
  return { foreground: fg.status === "granted", background: bg.status === "granted" };
}

export async function requestTrackingPermissions(): Promise<{
  permitted: boolean;
  background: boolean;
}> {
  const { PermissionStatus } = Location;
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== PermissionStatus.GRANTED) {
    useTrackingStore.getState().setPermission(fg.status === PermissionStatus.DENIED ? "denied" : "undetermined");
    return { permitted: false, background: false };
  }
  useTrackingStore.getState().setPermission("granted");

  let background = false;
  if (isBackgroundAvailable()) {
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      background = bg.status === PermissionStatus.GRANTED;
    } catch {
      background = false;
    }
  }
  useTrackingStore.getState().setBackgroundEnabled(background);
  return { permitted: true, background };
}

export function openSystemSettings(): void {
  Linking.openURL("app-settings:").catch(() => {
    Linking.openURL("app-settings://mobile/").catch(() => {});
  });
}

export async function isLocationServicesEnabled(): Promise<boolean> {
  try {
    const status = await Location.getProviderStatusAsync();
    return status.locationServicesEnabled === true;
  } catch {
    return true;
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────

export async function startTripTracking(tripId: number): Promise<{ ok: boolean }> {
  const permissions = await getTrackingPermissionState();
  if (!permissions.foreground) {
    const requested = await requestTrackingPermissions();
    if (!requested.permitted) {
      useTrackingStore.getState().setStatus("denied");
      useTrackingStore.getState().setError("Location permission is required to track the trip.");
      return { ok: false };
    }
  } else {
    useTrackingStore.getState().setPermission("granted");
    useTrackingStore.getState().setBackgroundEnabled(permissions.background);
  }

  const servicesEnabled = await isLocationServicesEnabled();
  if (!servicesEnabled) {
    useTrackingStore.getState().setStatus("gps_off");
    useTrackingStore.getState().setError("Location services are turned off.");
    return { ok: false };
  }

  await setTrackingContext({ tripId, startedAt: new Date().toISOString() });
  useTrackingStore.getState().setTripTracking(tripId);
  useTrackingStore.getState().setStatus("tracking");
  useTrackingStore.getState().setError(null);

  void startForegroundWatch(tripId);

  if (isBackgroundAvailable() && TaskManager.isAvailableAsync) {
    try {
      if (await TaskManager.isAvailableAsync()) {
        await Location.startLocationUpdatesAsync(TRIP_LOCATION_TASK, BACKGROUND_OPTIONS);
        useTrackingStore.getState().setBackgroundEnabled(true);
      } else {
        useTrackingStore.getState().setBackgroundEnabled(false);
      }
    } catch {
      useTrackingStore.getState().setBackgroundEnabled(false);
    }
  } else {
    useTrackingStore.getState().setBackgroundEnabled(false);
  }

  void refreshQueueCount();
  return { ok: true };
}

export async function stopTripTracking(): Promise<void> {
  activeWatch?.remove();
  activeWatch = null;
  try {
    await Location.stopLocationUpdatesAsync(TRIP_LOCATION_TASK);
  } catch {
    // task may not be started; ignore
  }
  try {
    await TaskManager.unregisterTaskAsync(TRIP_LOCATION_TASK);
  } catch {
    // ignore
  }
  await clearTrackingContext();
  useTrackingStore.getState().clearTripTracking();
  void flushLocationQueue().then(updateQueueState);
}

async function startForegroundWatch(tripId: number): Promise<void> {
  activeWatch?.remove();
  try {
    activeWatch = await Location.watchPositionAsync(FOREGROUND_OPTIONS, async (position) => {
      if (position.mocked === true && !allowMockedLocation()) return;
      const snapshot = toSnapshot(position);
      if (!isUsableFix(snapshot.accuracy)) return;
      useTrackingStore.getState().setPosition(snapshot);
      await handleSample(tripId, snapshot);
    });
  } catch {
    // Non-fatal: the background location task still covers tracking.
  }
}

// ─── Sample handling (shared with the background task) ─────────

export async function handleTripSample(tripId: number, snapshot: DriverLocationSnapshot): Promise<void> {
  if (!isUsableFix(snapshot.accuracy)) return;
  await enqueueLocation(tripId, toPoint(snapshot));
  useTrackingStore.getState().setPosition(snapshot);
  await flushUseful();
}

async function handleSample(tripId: number, snapshot: DriverLocationSnapshot): Promise<void> {
  await enqueueLocation(tripId, toPoint(snapshot));
  await flushOfflineThrottled();
}

let lastFlushAt = 0;
async function flushOfflineThrottled(): Promise<void> {
  const now = Date.now();
  if (now - lastFlushAt < 5000) return;
  lastFlushAt = now;
  await flushLocationQueue().then(updateQueueState);
}

async function flushUseful(): Promise<void> {
  await flushLocationQueue().then(updateQueueState);
}
