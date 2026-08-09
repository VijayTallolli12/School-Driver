const EARTH_RADIUS_M = 6371000;

const DEG2RAD = Math.PI / 180;

export function toRad(deg: number): number {
  return deg * DEG2RAD;
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export interface EtaEstimate {
  seconds: number;
  label: string;
}

export function estimateEta(distanceMeters: number, avgSpeedMs: number | null): EtaEstimate {
  const speed = avgSpeedMs && avgSpeedMs > 0.5 ? avgSpeedMs : 11.2; // ~40 km/h fallback
  const seconds = Math.max(0, Math.round(distanceMeters / speed));
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return { seconds, label: `${h}h ${m}m` };
  }
  if (seconds >= 60) {
    return { seconds, label: `${Math.round(seconds / 60)} min` };
  }
  return { seconds, label: `${seconds} sec` };
}

export function isValidCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}