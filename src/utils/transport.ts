import type { TransportDashboardData, TransportData, TransportLiveData, TransportStop } from "@/types";

type RecordLike = Record<string, unknown>;

function asRecord(value: unknown): RecordLike | null {
  return value && typeof value === "object" ? (value as RecordLike) : null;
}

function readString(source: RecordLike | null, keys: string[]): string | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function readNumber(source: RecordLike | null, keys: string[]): number | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function readBoolean(source: RecordLike | null, keys: string[]): boolean {
  if (!source) return false;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
      if (normalized === "false" || normalized === "0" || normalized === "no") return false;
    }
  }
  return false;
}

function normalizeTransportRecord(source: RecordLike | null): TransportData | null {
  if (!source) return null;

  return {
    vehicle_number: readString(source, ["vehicle_number", "vehicleNo", "vehicle_no", "plate_number", "registration_number"]),
    vehicle_name: readString(source, ["vehicle_name", "name", "vehicle"]),
    vehicle_type: readString(source, ["vehicle_type", "type"]),
    driver_name: readString(source, ["driver_name", "driverName", "driver"]),
    driver_mobile: readString(source, ["driver_mobile", "driverPhone", "driver_phone", "mobile", "phone"]),
    driver_license: readString(source, ["driver_license", "license_number", "license"]),
    route_name: readString(source, ["route_name", "routeName"]),
    route_start: readString(source, ["route_start", "start_point", "startPoint"]),
    route_end: readString(source, ["route_end", "end_point", "endPoint"]),
    pickup_stop: readString(source, ["pickup_stop", "pickup_point", "pickupPoint"]),
    drop_stop: readString(source, ["drop_stop", "drop_point", "dropPoint"]),
    pickup_time: readString(source, ["pickup_time", "pickupTime"]),
    drop_time: readString(source, ["drop_time", "dropTime"]),
    status: readString(source, ["status", "live_status", "transport_status"]) ?? "unknown",
    monthly_fee: readNumber(source, ["monthly_fee", "fee", "transport_fee"]),
  };
}

function normalizeStops(source: RecordLike | null): TransportStop[] {
  if (!source) return [];
  const nestedData = asRecord(source.data);
  const rawStops = source.stops ?? source.route_stops ?? source.locations ?? nestedData?.stops;
  if (!Array.isArray(rawStops)) return [];

  return rawStops
    .map((stop, index) => {
      const record = asRecord(stop);
      if (!record) return null;

      const stopName = readString(record, ["stop_name", "name", "title"]) ?? `Stop ${index + 1}`;
      const sequence = readNumber(record, ["sequence", "order", "position"]) ?? index + 1;

      return {
        id: readNumber(record, ["id"]) ?? sequence,
        stop_name: stopName,
        pickup_time: readString(record, ["pickup_time", "pickupTime"]),
        drop_time: readString(record, ["drop_time", "dropTime"]),
        sequence,
        is_student_stop: readBoolean(record, ["is_student_stop", "student_stop", "isStudentStop", "is_student"]),
      } satisfies TransportStop;
    })
    .filter((stop): stop is TransportStop => stop !== null)
    .sort((left, right) => left.sequence - right.sequence);
}

export function normalizeTransportDashboardFromLive(live: TransportLiveData | null): TransportDashboardData {
  const root = asRecord(live);
  const candidate = asRecord(root?.transport) ?? asRecord(root?.vehicle) ?? asRecord(root?.assignment) ?? asRecord(root?.data) ?? root;

  return {
    transport: normalizeTransportRecord(candidate),
    stops: normalizeStops(root ?? candidate),
  };
}