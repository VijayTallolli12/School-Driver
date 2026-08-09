import { create } from "zustand";
import type { DriverLocationSnapshot, TripTrackingStatus } from "@/types";

export type TrackingPermissionState = "granted" | "denied" | "undetermined";

interface TrackingState {
  tripId: number | null;
  status: TripTrackingStatus;
  position: DriverLocationSnapshot | null;
  queuedCount: number;
  lastSyncedAt: string | null;
  permission: TrackingPermissionState;
  backgroundEnabled: boolean;
  error: string | null;
}

interface TrackingActions {
  setTripTracking: (tripId: number) => void;
  clearTripTracking: () => void;
  setStatus: (status: TripTrackingStatus) => void;
  setPosition: (position: DriverLocationSnapshot) => void;
  setQueuedCount: (queuedCount: number) => void;
  setLastSyncedAt: (lastSyncedAt: string) => void;
  setPermission: (permission: TrackingPermissionState) => void;
  setBackgroundEnabled: (backgroundEnabled: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type TrackingStore = TrackingState & TrackingActions;

const initialState: TrackingState = {
  tripId: null,
  status: "idle",
  position: null,
  queuedCount: 0,
  lastSyncedAt: null,
  permission: "undetermined",
  backgroundEnabled: false,
  error: null,
};

export const useTrackingStore = create<TrackingStore>((set) => ({
  ...initialState,

  setTripTracking: (tripId) =>
    set({
      tripId,
      status: "idle",
      position: null,
      queuedCount: 0,
      error: null,
    }),

  clearTripTracking: () => set({ ...initialState }),

  setStatus: (status) => set({ status }),

  setPosition: (position) => set({ position }),

  setQueuedCount: (queuedCount) => set({ queuedCount }),

  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

  setPermission: (permission) => set({ permission }),

  setBackgroundEnabled: (backgroundEnabled) => set({ backgroundEnabled }),

  setError: (error) => set({ error }),

  reset: () => set({ ...initialState }),
}));
