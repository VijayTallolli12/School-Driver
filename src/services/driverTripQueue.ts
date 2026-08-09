import { storage } from "@/utils/storage";
import { isNetworkError, markDriverTripAction } from "@/services/api";
import { withFlushMutex } from "@/utils/flushMutex";
import { parseDriverActionPayload } from "@/utils/driverValidation";
import type { DriverTripActionPayload, QueuedDriverAction } from "@/types";

const DRIVER_ACTION_QUEUE_KEY = "driver_trip_action_queue";

export async function getAttendanceQueue(): Promise<QueuedDriverAction[]> {
  const queue = await storage.get<QueuedDriverAction[]>(DRIVER_ACTION_QUEUE_KEY);
  if (!Array.isArray(queue)) return [];
  return queue;
}

async function saveQueue(queue: QueuedDriverAction[]): Promise<void> {
  await storage.set(DRIVER_ACTION_QUEUE_KEY, queue);
}

export async function enqueueAttendance(payload: DriverTripActionPayload): Promise<QueuedDriverAction[]> {
  const queue = await getAttendanceQueue();

  const cleanPayload = parseDriverActionPayload(payload);
  if (!cleanPayload) return queue;

  const existingIndex = queue.findIndex((item) => item.action_id === cleanPayload.action_id);

  const queuedItem: QueuedDriverAction = {
    ...cleanPayload,
    queued_at: new Date().toISOString(),
    retries: 0,
  };

  if (existingIndex >= 0) {
    queue[existingIndex] = { ...queue[existingIndex], ...queuedItem };
  } else {
    queue.push(queuedItem);
  }

  await saveQueue(queue);
  return queue;
}

export async function flushAttendanceQueue(): Promise<{
  pending: number;
  synced: number;
  failed: number;
  offline: boolean;
}> {
  return withFlushMutex("attendance-queue", async () => {
    const queue = await getAttendanceQueue();
    if (queue.length === 0) {
      return { pending: 0, synced: 0, failed: 0, offline: false };
    }

    let synced = 0;
    let failed = 0;
    let offline = false;
    const nextQueue: QueuedDriverAction[] = [];

    for (const action of queue) {
      try {
        await markDriverTripAction(action);
        synced += 1;
      } catch (error: unknown) {
        if (isNetworkError(error)) {
          offline = true;
        }

        failed += 1;
        nextQueue.push({
          ...action,
          retries: action.retries + 1,
          last_error: error instanceof Error ? error.message : "Trip action sync failed",
        });

        // When network is down, keep processing short by retaining the rest unsent.
        if (offline) {
          const rest = queue.slice(queue.indexOf(action) + 1);
          nextQueue.push(...rest);
          break;
        }
      }
    }

    await saveQueue(nextQueue);

    return {
      pending: nextQueue.length,
      synced,
      failed,
      offline,
    };
  });
}

export async function clearAttendanceQueue(): Promise<void> {
  await storage.remove(DRIVER_ACTION_QUEUE_KEY);
}