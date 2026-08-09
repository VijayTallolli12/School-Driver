export type AppRole = "driver" | "parent";

type RoleSource =
  | { role?: unknown; roles?: unknown }
  | null
  | undefined;

function isDriverRoleName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return normalized === "driver" || normalized.endsWith("driver");
}

function isParentRoleName(name: string): boolean {
  return name.trim().toLowerCase() === "parent";
}

/**
 * Extracts the canonical app role from a user object, tolerating the shape
 * differences the Laravel backend can return:
 *   - `user.role` as a string ("driver", "Driver", "school-driver")
 *   - `user.roles` as an array of strings
 *   - `user.roles` as an array of objects `{ id, name }`
 *
 * Returns null when the role cannot be determined (never guesses "parent").
 */
export function normalizeUserRole(user: RoleSource): AppRole | null {
  if (!user) return null;
  let parentCandidate = false;

  if (typeof user.role === "string") {
    if (isDriverRoleName(user.role)) return "driver";
    if (isParentRoleName(user.role)) parentCandidate = true;
  }

  if (Array.isArray(user.roles)) {
    for (const entry of user.roles) {
      const name = typeof entry === "string" ? entry : (entry as { name?: unknown } | null)?.name;
      if (typeof name !== "string" || name.trim() === "") continue;
      if (isDriverRoleName(name)) return "driver";
      if (isParentRoleName(name)) parentCandidate = true;
    }
  }

  return parentCandidate ? "parent" : null;
}

/**
 * Signals that a LoginResponse belongs to a driver. A non-null `driver_uuid`
 * (or assigned vehicle/route) is a strong hint even when the role field shape
 * is unexpected.
 */
export function isDriverPayload(payload: {
  driver_uuid?: unknown;
  vehicle_id?: unknown;
  route_id?: unknown;
} | null): boolean {
  if (!payload) return false;
  return (
    typeof payload.driver_uuid === "string" && payload.driver_uuid.length > 0
  ) || typeof payload.vehicle_id === "number" || typeof payload.route_id === "number";
}