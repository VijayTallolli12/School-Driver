import { storage } from "@/utils/storage";
import { isNetworkError, sendSosAlert } from "@/services/api";
import { withFlushMutex } from "@/utils/flushMutex";
import type { SosAlertPayload } from "@/types";

const SOS_QUEUE_KEY = "driver_sos_queue";

export async function getSosQueue(): Promise<SosAlertPayload[]> {
  const queue = await storage.get<SosAlertPayload[]>(SOS_QUEUE_KEY);
  return Array.isArray(queue) ? queue : [];
}

async function saveQueue(queue: SosAlertPayload[]): Promise<void> {
  await storage.set(SOS_QUEUE_KEY, queue);
}

export async function enqueueSos(payload: SosAlertPayload): Promise<SosAlertPayload[]> {
  const queue = await getSosQueue();

  const existingIndex = queue.findIndex(
    (item) =>
      item.driver_uuid === payload.driver_uuid &&
      item.trip_id === payload.trip_id &&
      item.recorded_at === payload.recorded_at,
  );

  if (existingIndex >= 0) {
    queue[existingIndex] = payload;
  } else {
    queue.push(payload);
  }

  await saveQueue(queue);
  return queue;
}

/**
 * Best-effort flush of buffered SOS alerts. Returns the number still queued.
 * Serialized with the location/attendance queues so background + foreground +
 * manual flushes never interleave.
 */
export async function flushSosQueue(): Promise<{ pending: number; sent: number }> {
  return withFlushMutex("sos-queue", async () => {
    const queue = await getSosQueue();
    if (queue.length === 0) {
      return { pending: 0, sent: 0 };
    }

    let sent = 0;
    const nextQueue: SosAlertPayload[] = [];

    for (const item of queue) {
      try {
        await sendSosAlert(item);
        sent += 1;
      } catch (error: unknown) {
        if (isNetworkError(error)) {
          // Keep the failed entry for a later flush, but keep trying the
          // remaining entries too — a transient failure must not strand them.
          nextQueue.push(item);
          continue;
        }
        // Non-network error (e.g. rejected by backend): drop once so it never
        // loops forever, but keep later entries for the next attempt.
      }
    }

    await saveQueue(nextQueue);
    return { pending: nextQueue.length, sent };
  });
}