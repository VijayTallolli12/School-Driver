import { storage } from "@/utils/storage";

const TRACKING_CONTEXT_KEY = "driver_trip_tracking_context";

export interface TrackingContext {
  tripId: number;
  startedAt: string;
}

export async function getTrackingContext(): Promise<TrackingContext | null> {
  const value = await storage.get<TrackingContext>(TRACKING_CONTEXT_KEY);
  if (!value || typeof value.tripId !== "number") return null;
  return value;
}

export async function setTrackingContext(context: TrackingContext): Promise<void> {
  await storage.set(TRACKING_CONTEXT_KEY, context);
}

export async function clearTrackingContext(): Promise<void> {
  await storage.remove(TRACKING_CONTEXT_KEY);
}