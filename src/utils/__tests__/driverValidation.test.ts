import { parseDriverActionPayload, parseTripLocationPoint, tripLocationPointSchema } from "@/utils/driverValidation";

describe("driver validation schemas", () => {
  it("accepts a valid pickup action payload", () => {
    const parsed = parseDriverActionPayload({
      trip_id: 1,
      trip_student_id: 3,
      action: "pickup",
      action_id: "1-3-pickup-abc",
      triggered_at: "2026-08-10T10:00:00.000Z",
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.action).toBe("pickup");
  });

  it("accepts valid drop and missed actions", () => {
    expect(parseDriverActionPayload({
      trip_id: 1,
      trip_student_id: 3,
      action: "drop",
      action_id: "x",
      triggered_at: "2026-08-10T10:00:00.000Z",
    })?.action).toBe("drop");
    expect(parseDriverActionPayload({
      trip_id: 1,
      trip_student_id: 3,
      action: "missed",
      action_id: "y",
      triggered_at: "2026-08-10T10:00:00.000Z",
    })?.action).toBe("missed");
  });

  it("rejects an invalid action payload", () => {
    const parsed = parseDriverActionPayload({
      trip_id: 0,
      trip_student_id: 3,
      action: "maybe",
      action_id: "",
      triggered_at: "",
    });
    expect(parsed).toBeNull();
  });

  it("accepts a valid location point", () => {
    const parsed = parseTripLocationPoint({
      lat: 12.9716,
      lng: 77.5946,
      speed: 9.5,
      heading: 180,
      accuracy: 12,
      timestamp: "2026-08-10T10:00:00.000Z",
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.lat).toBe(12.9716);
  });

  it("accepts null speed/heading and missing accuracy", () => {
    const parsed = parseTripLocationPoint({
      lat: 12.9716,
      lng: 77.5946,
      speed: null,
      heading: null,
      timestamp: "2026-08-10T10:00:00.000Z",
    });
    expect(parsed).not.toBeNull();
  });

  it("rejects out-of-range coordinates", () => {
    const result = tripLocationPointSchema.safeParse({
      lat: 95,
      lng: 77.5946,
      speed: null,
      heading: null,
      timestamp: "2026-08-10T10:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});