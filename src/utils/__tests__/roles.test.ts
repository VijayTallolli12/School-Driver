import { isDriverPayload, normalizeUserRole } from "@/utils/roles";

describe("normalizeUserRole", () => {
  it("reads a plain string role", () => {
    expect(normalizeUserRole({ role: "driver" })).toBe("driver");
    expect(normalizeUserRole({ role: "parent" })).toBe("parent");
  });

  it("is case-insensitive", () => {
    expect(normalizeUserRole({ role: "Driver" })).toBe("driver");
    expect(normalizeUserRole({ role: "PARENT" })).toBe("parent");
  });

  it("recognizes suffixed driver role names", () => {
    expect(normalizeUserRole({ role: "school-driver" })).toBe("driver");
    expect(normalizeUserRole({ role: "transport_driver" })).toBe("driver");
  });

  it("reads string roles arrays", () => {
    expect(normalizeUserRole({ roles: ["admin", "driver"] })).toBe("driver");
    expect(normalizeUserRole({ roles: ["parent"] })).toBe("parent");
  });

  it("reads object roles arrays (spatie shape)", () => {
    expect(normalizeUserRole({ roles: [{ id: 1, name: "driver" }] })).toBe("driver");
    expect(normalizeUserRole({ roles: [{ id: 2, name: "parent" }] })).toBe("parent");
  });

  it("returns null when role is unknown and never guesses", () => {
    expect(normalizeUserRole({ role: "staff" })).toBeNull();
    expect(normalizeUserRole({ roles: ["admin"] })).toBeNull();
    expect(normalizeUserRole(null)).toBeNull();
    expect(normalizeUserRole(undefined)).toBeNull();
  });

  it("prefers driver when both role and roles hint driver", () => {
    expect(normalizeUserRole({ role: "parent", roles: [{ name: "driver" }] })).toBe("driver");
  });
});

describe("isDriverPayload", () => {
  it("detects a driver via driver_uuid", () => {
    expect(isDriverPayload({ driver_uuid: "abc" })).toBe(true);
    expect(isDriverPayload({ driver_uuid: "" })).toBe(false);
  });

  it("detects a driver via assigned ids", () => {
    expect(isDriverPayload({ vehicle_id: 12 })).toBe(true);
    expect(isDriverPayload({ route_id: 34 })).toBe(true);
  });

  it("returns false for empty payloads", () => {
    expect(isDriverPayload(null)).toBe(false);
    expect(isDriverPayload({})).toBe(false);
  });
});