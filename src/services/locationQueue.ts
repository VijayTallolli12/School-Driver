import { storage } from "@/utils/storage";
import { isNetworkError, uploadTripLocations } from "@/services/api";
import { withFlushMutex } from "@/utils/flushMutex";
import { parseTripLocationPoint } from "@/utils/driverValidation";
import type { QueuedTripLocation, TripLocationPoint } from "@/types";

const LRU_CAP = 500;
const BATCH_SIZE = 20;
const TRIP_LOCATION_QUEUE_KEY = "driver_trip_location_queue";

export async function getLocationQueue(): Promise<QueuedTripLocation[]> {
  const queue = await storage.get<QueuedTripLocation[]>(TRIP_LOCATION_QUEUE_KEY);
  return Array.isArray(queue) ? queue : [];
}

async function saveQueue(queue: QueuedTripLocation[]): Promise<void> {
  await storage.set(TRIP_LOCATION_QUEUE_KEY, queue);
}

export async function enqueueLocation(
  tripId: number,
  point: TripLocationPoint,
  { resend }: { resend?: boolean } = {},
): Promise<QueuedTripLocation[]> {
  const queue = await getLocationQueue();

  const cleanPoint = parseTripLocationPoint(point);
  if (!cleanPoint) return queue;

  const existingIndex = queue.findIndex(
    (item) => item.trip_id === tripId && item.timestamp === cleanPoint.timestamp,
  );

  const queuedItem: QueuedTripLocation = {
    ...cleanPoint,
    trip_id: tripId,
    queued_at: new Date().toISOString(),
    retries: resend ? 1 : 0,
    ...(resend ? { last_error: "Retrying queued sample" } : {}),
  };

  if (existingIndex >= 0) {
    queue[existingIndex] = queuedItem;
  } else {
    queue.push(queuedItem);
  }

  // Trim oldest samples per unique trip to bound memory usage.
  const byTrip = new Map<number, QueuedTripLocation[]>();
  for (const item of queue) {
    const list = byTrip.get(item.trip_id) ?? [];
    list.push(item);
    byTrip.set(item.trip_id, list);
  }
  const trimmed: QueuedTripLocation[] = [];
  for (const [tripId, list] of byTrip) {
    const sorted = list.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
    trimmed.push(...(sorted.length > LRU_CAP ? sorted.slice(-LRU_CAP) : sorted));
  }
  trimmed.sort((a, b) => (a.queued_at < b.queued_at ? -1 : 1));

  await saveQueue(trimmed);
  return trimmed;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function flushLocationQueue(): Promise<{
  pending: number;
  synced: number;
  failed: number;
  offline: boolean;
}> {
  return withFlushMutex("location-queue", async () => {
    const queue = await getLocationQueue();
    if (queue.length === 0) {
      return { pending: 0, synced: 0, failed: 0, offline: false };
    }

    const sorted = queue.slice().sort((a, b) => (a.queued_at < b.queued_at ? -1 : 1));

    // Group into contiguous per-trip runs so a batch never mixes trips.
    const runs: QueuedTripLocation[][] = [];
    for (const item of sorted) {
      const last = runs[runs.length - 1];
      if (last && last[0].trip_id === item.trip_id) {
        last.push(item);
      } else {
        runs.push([item]);
      }
    }

    const batches = runs.flatMap((run) => chunk(run, BATCH_SIZE));

    let synced = 0;
    let failed = 0;
    let offline = false;
    const nextQueue: QueuedTripLocation[] = [];

    for (const batch of batches) {
      const tripId = batch[0].trip_id;
      const points: TripLocationPoint[] = batch.map((item) => ({
        lat: item.lat,
        lng: item.lng,
        speed: item.speed,
        heading: item.heading,
        accuracy: item.accuracy ?? null,
        timestamp: item.timestamp,
      }));

      try {
        await uploadTripLocations(tripId, points);
        synced += batch.length;
      } catch (error: unknown) {
        failed += batch.length;
        if (isNetworkError(error)) {
          offline = true;
        }
        // Keep this batch and everything after it (same or later queued) unsent
        // so nothing is lost when the network drops mid-flush.
        const failedIndex = sorted.indexOf(batch[0]);
        const rest = sorted.slice(failedIndex);
        for (const item of rest) {
          nextQueue.push({
            ...item,
            retries: item.retries + 1,
            last_error: error instanceof Error ? error.message : "Location sync failed",
          });
        }
        break;
      }
    }

    await saveQueue(nextQueue);

    return { pending: nextQueue.length, synced, failed, offline };
  });
}

export async function clearLocationQueue(): Promise<void> {
  await storage.remove(TRIP_LOCATION_QUEUE_KEY);
}