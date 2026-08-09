import * as Location from "expo-location";
import type { DriverLocationSnapshot } from "@/types";
import { updateVehicleLocation } from "@/services/api";

export async function requestDriverLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === Location.PermissionStatus.GRANTED) {
    return true;
  }
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status === Location.PermissionStatus.GRANTED;
}

export async function getDriverLocationSnapshot(): Promise<DriverLocationSnapshot> {
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    speed: position.coords.speed ?? null,
    heading: position.coords.heading ?? null,
    accuracy: position.coords.accuracy ?? null,
    timestamp: new Date(position.timestamp).toISOString(),
  };
}

export async function uploadDriverLocation(vehicleId: number, snapshot: DriverLocationSnapshot): Promise<void> {
  await updateVehicleLocation({
    vehicle_id: vehicleId,
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
    speed: snapshot.speed ?? undefined,
    heading: snapshot.heading ?? undefined,
    accuracy: snapshot.accuracy ?? undefined,
    recorded_at: snapshot.timestamp,
  });
}

export async function watchDriverLocation(
  vehicleId: number,
  onUpdate: (snapshot: DriverLocationSnapshot) => Promise<void> | void,
  onError?: (message: string) => void,
): Promise<Location.LocationSubscription | null> {
  const granted = await requestDriverLocationPermission();
  if (!granted) {
    onError?.("Location permission is required to share live GPS data.");
    return null;
  }

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 15000,
      distanceInterval: 10,
    },
    async (position) => {
      const snapshot: DriverLocationSnapshot = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speed: position.coords.speed ?? null,
        heading: position.coords.heading ?? null,
        accuracy: position.coords.accuracy ?? null,
        timestamp: new Date(position.timestamp).toISOString(),
      };
      try {
        await uploadDriverLocation(vehicleId, snapshot);
        await onUpdate(snapshot);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload live GPS data.";
        onError?.(message);
      }
    },
  );

  return subscription;
}