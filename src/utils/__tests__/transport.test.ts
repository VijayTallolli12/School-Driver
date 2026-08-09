import { normalizeTransportDashboardFromLive } from "@/utils/transport";
import type { TransportLiveData } from "@/types";

describe("normalizeTransportDashboardFromLive", () => {
  it("normalizes a nested transport payload", () => {
    const result = normalizeTransportDashboardFromLive({
      transport: {
        vehicle_number: "KA-01-MN-1234",
        route_name: "Route A",
        monthly_fee: "1200",
        status: "1",
      },
      stops: [
        { stop_name: "Park Stop", is_student_stop: true, sequence: 2 },
        { stop_name: "School", is_student_stop: "yes", position: 1 },
      ],
    } as unknown as TransportLiveData);

    expect(result.transport?.vehicle_number).toBe("KA-01-MN-1234");
    expect(result.transport?.route_name).toBe("Route A");
    expect(result.transport?.monthly_fee).toBe(1200);
    expect(result.transport?.status).toBe("1");
    // sorted by sequence
    expect(result.stops.map((s) => s.stop_name)).toEqual(["School", "Park Stop"]);
    expect(result.stops[0].is_student_stop).toBe(true);
  });

  it("assigns an id and sequence fallback when missing", () => {
    const result = normalizeTransportDashboardFromLive({
      stops: [{ stop_name: "Only Stop" }],
    } as unknown as TransportLiveData);

    expect(result.stops).toHaveLength(1);
    expect(result.stops[0].id).toBe(1);
    expect(result.stops[0].stop_name).toBe("Only Stop");
  });

  it("handles null and empty payloads gracefully", () => {
    const empty = normalizeTransportDashboardFromLive(null);
    expect(empty.transport).toBeNull();
    expect(empty.stops).toEqual([]);
  });

  it("ignores non-array stops", () => {
    const result = normalizeTransportDashboardFromLive({
      transport: { route_name: "R" },
      stops: { not: "an array" },
    } as unknown as TransportLiveData);
    expect(result.stops).toEqual([]);
    expect(result.transport?.route_name).toBe("R");
  });
});