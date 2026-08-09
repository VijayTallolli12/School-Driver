import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as BackgroundTask from "expo-background-task";
import {
  TRIP_LOCATION_TASK,
  allowMockedLocation,
  isUsableFix,
  locationObjectToSnapshot,
  snapshotToPoint,
} from "@/services/tripTracking";
import { getTrackingContext } from "@/utils/trackingContext";
import { enqueueLocation, flushLocationQueue } from "@/services/locationQueue";
import { useTrackingStore } from "@/store/tracking.store";

/**
 * Background idle-sync task. Runs periodically (~15 min minimum) so buffered
 * location samples are retried even while the app is backgrounded. Uses
 * expo-background-task (SDK 54); expo-background-fetch is deprecated.
 */
export const LOCATION_FLUSH_TASK = "driver-location-flush";

// ─── Background location task ──────────────────────────────────
// Registered at the top level so it survives when the app is launched in the
// background. Every fix is enqueued and flushed to the trip-scoped endpoint.
TaskManager.defineTask(TRIP_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const context = await getTrackingContext();
  if (!context) return;

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  const store = useTrackingStore.getState();
  for (const location of locations) {
    const snapshot = locationObjectToSnapshot(location);
    if (location.mocked === true && !allowMockedLocation()) continue;
    if (!isUsableFix(snapshot.accuracy)) continue;
    store.setPosition(snapshot);
    await enqueueLocation(context.tripId, snapshotToPoint(snapshot));
  }

  const result = await flushLocationQueue();
  store.setQueuedCount(result.pending);
  store.setStatus(result.offline ? "offline" : "tracking");
  if (result.synced > 0) {
    store.setLastSyncedAt(new Date().toISOString());
  }
});

// ─── Background idle task ──────────────────────────────────────
TaskManager.defineTask(LOCATION_FLUSH_TASK, async () => {
  const context = await getTrackingContext();
  if (!context) {
    return BackgroundTask.BackgroundTaskResult.Success;
  }
  const result = await flushLocationQueue();
  if (result.offline) {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
  useTrackingStore.getState().setQueuedCount(result.pending);
  return BackgroundTask.BackgroundTaskResult.Success;
});

export async function registerBackgroundTasks(): Promise<void> {
  try {
    await BackgroundTask.registerTaskAsync(LOCATION_FLUSH_TASK, {
      minimumInterval: 15,
    });
  } catch (err) {
    // Registration may fail in Expo Go / when background task is unavailable.
    if (__DEV__) {
      console.warn("[BackgroundTask] registration failed:", err);
    }
  }
}