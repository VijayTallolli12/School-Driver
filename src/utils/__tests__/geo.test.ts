import { estimateEta, formatDistanceMeters, haversineMeters, isValidCoord, toRad } from "@/utils/geo";

describe("geo utils", () => {
  test("toRad converts degrees to radians", () => {
    expect(toRad(180)).toBeCloseTo(Math.PI);
    expect(toRad(0)).toBe(0);
  });

  test("haversineMeters same point is zero", () => {
    expect(haversineMeters(12.34, 56.78, 12.34, 56.78)).toBe(0);
  });

  test("haversineMeters ~1 degree of latitude is ~111 km", () => {
    const meters = haversineMeters(0, 0, 1, 0);
    expect(meters).toBeGreaterThan(110_000);
    expect(meters).toBeLessThan(112_000);
  });

  test("formatDistanceMeters", () => {
    expect(formatDistanceMeters(450)).toBe("450 m");
    expect(formatDistanceMeters(7400)).toBe("7.4 km");
    expect(formatDistanceMeters(Number.NaN)).toBe("—");
  });

  test("estimateEta uses 40 km/h fallback when speed is unavailable", () => {
    const eta = estimateEta(11200, null);
    expect(eta.seconds).toBe(1000);
    expect(eta.label).toContain("min");
  });

  test("estimateEta honors a provided speed", () => {
    // 10 km at 20 m/s = 500 s ≈ 8 min
    const eta = estimateEta(10000, 20);
    expect(eta.seconds).toBe(500);
    expect(eta.label).toBe("8 min");
  });

  test("estimateEta formats hours", () => {
    const eta = estimateEta(100000, 11.2);
    expect(eta.seconds).toBeGreaterThanOrEqual(3600);
    expect(eta.label).toContain("h");
  });

  test("isValidCoord rejects out-of-range and non-numeric values", () => {
    expect(isValidCoord(12.3, 77.2)).toBe(true);
    expect(isValidCoord(120, 0)).toBe(false);
    expect(isValidCoord(0, 190)).toBe(false);
    expect(isValidCoord("12.3", 77.2)).toBe(false);
    expect(isValidCoord(12.3, Number.NaN)).toBe(false);
  });
});