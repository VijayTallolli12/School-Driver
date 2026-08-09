import { z } from "zod";
import type { DriverTripActionPayload, TripLocationPoint } from "@/types";

const isoDateTime = z.string().min(1);

export const driverActionPayloadSchema = z.object({
  trip_id: z.number().int().positive(),
  trip_student_id: z.number().int().positive(),
  action: z.enum(["pickup", "drop", "missed"]),
  action_id: z.string().min(1),
  triggered_at: isoDateTime,
});

export const queuedDriverActionSchema = driverActionPayloadSchema.extend({
  queued_at: isoDateTime,
  retries: z.number().int().min(0),
  last_error: z.string().optional(),
});

export const tripLocationPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().nullable(),
  heading: z.number().nullable(),
  accuracy: z.number().nullable().optional(),
  timestamp: isoDateTime,
});

export const queuedTripLocationSchema = tripLocationPointSchema.extend({
  trip_id: z.number().int().positive(),
  queued_at: isoDateTime,
  retries: z.number().int().min(0),
  last_error: z.string().optional(),
});

export function parseDriverActionPayload(input: unknown): DriverTripActionPayload | null {
  const result = driverActionPayloadSchema.safeParse(input);
  if (result.success) return result.data;
  if (__DEV__) {
    console.warn("[driverValidation] dropped invalid trip action payload", result.error.issues);
  }
  return null;
}

export function parseTripLocationPoint(input: unknown): TripLocationPoint | null {
  const result = tripLocationPointSchema.safeParse(input);
  if (result.success) return result.data;
  if (__DEV__) {
    console.warn("[driverValidation] dropped invalid location point", result.error.issues);
  }
  return null;
}