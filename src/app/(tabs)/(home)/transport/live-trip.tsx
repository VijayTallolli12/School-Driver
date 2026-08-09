import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { endDriverTrip, fetchDriverTrip, fetchDriverTripState, getErrorMessage, leaveStop } from "@/services/api";
import { flushAttendanceQueue, getAttendanceQueue } from "@/services/driverTripQueue";
import { flushLocationQueue, getLocationQueue } from "@/services/locationQueue";
import {
  accuracyQuality,
  openSystemSettings,
  startTripTracking,
  stopTripTracking,
} from "@/services/tripTracking";
import { useTrackingStore } from "@/store/tracking.store";
import TripMapView from "@/components/TripMapView";
import { estimateEta, formatDistanceMeters, haversineMeters, isValidCoord } from "@/utils/geo";
import { allowForceEnd } from "@/utils/environment";
import type { DriverTripSummary } from "@/types";

function toElapsedLabel(startedAt: string | null): string {
  if (!startedAt) return "00:00:00";
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function getCurrentStopIndex(trip: DriverTripSummary): number {
  if (trip.current_stop_id != null) {
    const explicitIndex = trip.stops.findIndex((s) => s.id === trip.current_stop_id);
    if (explicitIndex >= 0) return explicitIndex;
  }

  const fallback = Math.max(0, Math.min(trip.completed_stops, Math.max(0, trip.stops.length - 1)));
  return fallback;
}

function trackingPill(status: ReturnType<typeof useTrackingStore.getState>["status"]) {
  switch (status) {
    case "tracking":
      return { label: "Live", color: "text-emerald-300", bg: "bg-emerald-500/20", dot: "bg-emerald-400" };
    case "offline":
      return { label: "Offline — syncing", color: "text-amber-300", bg: "bg-amber-500/20", dot: "bg-amber-400" };
    case "denied":
      return { label: "Permission needed", color: "text-red-300", bg: "bg-red-500/20", dot: "bg-red-400" };
    case "gps_off":
      return { label: "GPS off", color: "text-red-300", bg: "bg-red-500/20", dot: "bg-red-400" };
    case "error":
      return { label: "Tracking error", color: "text-red-300", bg: "bg-red-500/20", dot: "bg-red-400" };
    default:
      return { label: "Starting…", color: "text-slate-300", bg: "bg-slate-700", dot: "bg-slate-400" };
  }
}

export default function LiveTripScreen() {
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = params.tripId ? Number(params.tripId) : null;

  const [trip, setTrip] = useState<DriverTripSummary | null>(null);
  const [timerLabel, setTimerLabel] = useState("00:00:00");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"arrive" | "attendance" | "next" | "end" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const endGuardRef = useRef(false);

  const position = useTrackingStore((s) => s.position);
  const trackingStatus = useTrackingStore((s) => s.status);
  const locQueued = useTrackingStore((s) => s.queuedCount);
  const setLocQueued = useTrackingStore((s) => s.setQueuedCount);
  const setLastSyncedAt = useTrackingStore((s) => s.setLastSyncedAt);

  const load = useCallback(async () => {
    try {
      setError(null);

      let loadedTrip: DriverTripSummary | null = null;
      if (tripId) {
        loadedTrip = await fetchDriverTrip(tripId);
      } else {
        const state = await fetchDriverTripState();
        loadedTrip = state.trip;
      }

      if (!loadedTrip) {
        router.replace("/(tabs)/(home)/transport" as any);
        return;
      }

      setTrip(loadedTrip);
      setTimerLabel(toElapsedLabel(loadedTrip.started_at));
      const [attQueue, locQueue] = await Promise.all([getAttendanceQueue(), getLocationQueue()]);
      setQueueCount(attQueue.length);
      setLocQueued(locQueue.length);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [setLocQueued, tripId]);

  // Reload on focus (mount + returning from stop attendance) so trip progress
  // reflects the latest backend state every time the driver is here.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Start tracking when the trip is IN_PROGRESS, stop when COMPLETED.
  useEffect(() => {
    if (trip?.status === "in_progress") {
      void startTripTracking(trip.id);
    } else if (trip?.status === "completed") {
      void stopTripTracking();
    }
  }, [trip?.status, trip?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerLabel((prev) => {
        if (!trip?.started_at) return prev;
        return toElapsedLabel(trip.started_at);
      });
      void flushAttendanceQueue().then((result) => setQueueCount(result.pending));
    }, 15000);

    return () => clearInterval(interval);
  }, [trip?.started_at]);

  const currentIndex = useMemo(() => (trip ? getCurrentStopIndex(trip) : -1), [trip]);
  const currentStop = trip && currentIndex >= 0 ? trip.stops[currentIndex] : null;
  const nextStop = trip && currentIndex >= 0 ? trip.stops[currentIndex + 1] ?? null : null;

  const progressPercent = useMemo(() => {
    if (!trip || trip.total_stops === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((trip.completed_stops / trip.total_stops) * 100)));
  }, [trip]);

  const atLastStop = Boolean(trip && currentIndex === trip.stops.length - 1);

  const distanceToNext = useMemo(() => {
    if (!position || !nextStop) return null;
    if (!isValidCoord(nextStop.latitude, nextStop.longitude)) return null;
    return haversineMeters(position.latitude, position.longitude, nextStop.latitude as number, nextStop.longitude as number);
  }, [nextStop, position]);

  const eta = useMemo(() => {
    if (distanceToNext == null) return null;
    return estimateEta(distanceToNext, position?.speed ?? null);
  }, [distanceToNext, position?.speed]);

  const pill = trackingPill(trackingStatus);

  const gpsChip = (() => {
    if (!position) return null;
    const quality = accuracyQuality(position.accuracy);
    if (quality === "high") {
      return { label: "GPS High", dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/20" };
    }
    if (quality === "ok") {
      return { label: "GPS OK", dot: "bg-sky-400", text: "text-sky-300", bg: "bg-sky-500/20" };
    }
    if (quality === "poor") {
      return { label: "GPS Poor", dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-500/20" };
    }
    return null;
  })();

  const openAttendance = useCallback(async () => {
    if (!trip || !currentStop) return;
    setBusyAction("arrive");
    try {
      await fetchDriverTrip(trip.id);
      router.push({
        pathname: "/transport/stop-attendance",
        params: {
          tripId: String(trip.id),
          stopId: String(currentStop.id),
        },
      } as any);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  }, [currentStop, trip]);

  const handleNextStop = useCallback(async () => {
    if (!trip || !currentStop) return;
    setBusyAction("next");
    try {
      const updated = await leaveStop(trip.id, currentStop.id);
      setTrip(updated);
      setTimerLabel(toElapsedLabel(updated.started_at));
      if (updated.status === "completed") {
        await stopTripTracking();
        router.replace({ pathname: "/transport/trip-success", params: { tripId: String(updated.id) } } as any);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  }, [currentStop, trip]);

  const handleEndTrip = useCallback(async () => {
    if (!trip || endGuardRef.current) return;

    const performEnd = async () => {
      // Guard against duplicate END TRIP: once completed (e.g. auto-complete on
      // the last stop) the route leads to the success screen, never re-POSTs.
      endGuardRef.current = true;
      if (trip.status === "completed") {
        await stopTripTracking();
        router.replace({ pathname: "/transport/trip-success", params: { tripId: String(trip.id) } } as any);
        return;
      }
      setBusyAction("end");
      try {
        const ended = await endDriverTrip(trip.id);
        await stopTripTracking();
        router.replace({ pathname: "/transport/trip-success", params: { tripId: String(ended.id) } } as any);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        endGuardRef.current = false;
        setBusyAction(null);
      }
    };

    // Dev/testing convenience: allow ending before the last stop, but ask for
    // explicit confirmation since it leaves the remaining stops unhandled.
    if (!atLastStop && allowForceEnd()) {
      const remaining = Math.max(0, trip.stops.length - 1 - currentIndex);
      Alert.alert(
        "End trip early?",
        `You still have ${remaining} stop${remaining === 1 ? "" : "s"} ahead. Ending now will finish the trip here.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "End Trip", style: "destructive", onPress: () => void performEnd() },
        ],
      );
      return;
    }

    await performEnd();
  }, [atLastStop, currentIndex, trip]);

  const handleRetryTracking = useCallback(async () => {
    if (!trip) return;
    if (trackingStatus === "gps_off") {
      openSystemSettings();
      return;
    }
    if (trackingStatus === "denied") {
      openSystemSettings();
      return;
    }
    void startTripTracking(trip.id);
  }, [trip, trackingStatus]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const [att, loc] = await Promise.all([flushAttendanceQueue(), flushLocationQueue()]);
      setQueueCount(att.pending);
      setLocQueued(loc.pending);
      if (loc.synced > 0 || att.synced > 0) {
        setLastSyncedAt(new Date().toISOString());
      }
    } finally {
      setSyncing(false);
    }
  }, [setLastSyncedAt, setLocQueued]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#34D399" />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center px-6">
        <Text className="text-slate-200 text-base">No active trip.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-5 py-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-slate-400 text-xs uppercase tracking-[1.4px]">Current Status</Text>
          <View className="flex-row items-center gap-2 mt-1">
            <Text className="text-emerald-300 text-lg font-bold">{trip.status === "in_progress" ? "In Progress" : "Ready"}</Text>
            <View className={`flex-row items-center px-2.5 py-1 rounded-full ${pill.bg}`}>
              <View className={`w-2 h-2 rounded-full ${pill.dot} mr-1.5`} />
              <Text className={`text-xs font-bold ${pill.color}`}>{pill.label}</Text>
            </View>
            {gpsChip ? (
              <View className={`flex-row items-center px-2.5 py-1 rounded-full ${gpsChip.bg}`}>
                <View className={`w-2 h-2 rounded-full ${gpsChip.dot} mr-1.5`} />
                <Text className={`text-xs font-bold ${gpsChip.text}`}>{gpsChip.label}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          accessibilityLabel="Emergency"
          accessibilityHint="Opens the emergency screen"
          className="w-12 h-12 rounded-2xl bg-red-600 items-center justify-center"
          activeOpacity={0.8}
          onPress={() => router.push("/transport/emergency" as any)}
        >
          <Ionicons name="alert" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 mt-3" showsVerticalScrollIndicator={false}>
        <TripMapView
          stops={trip.stops}
          currentStopId={currentStop?.id ?? null}
          nextStopId={nextStop?.id ?? null}
          position={position}
        />

        {(trackingStatus === "denied" || trackingStatus === "gps_off") && (
          <TouchableOpacity
            className="mt-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex-row items-center justify-between"
            activeOpacity={0.85}
            onPress={handleRetryTracking}
            accessibilityLabel={trackingStatus === "denied" ? "Fix location permission" : "Fix location services"}
          >
            <Text className="text-red-200 text-sm flex-1">
              {trackingStatus === "denied"
                ? "Location permission is off. Tracking cannot start."
                : "Location services are off. Turn them on to track the trip."}
            </Text>
            <Text className="text-red-300 text-sm font-bold ml-2">Fix</Text>
          </TouchableOpacity>
        )}

        {position && accuracyQuality(position.accuracy) === "poor" && (
          <View className="mt-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex-row items-center">
            <Ionicons name="navigate-circle-outline" size={18} color="#FCD34D" />
            <Text className="text-amber-200 text-sm ml-3 flex-1">
              Weak GPS signal. Route position may be inaccurate — make sure you have a clear view of the sky.
            </Text>
          </View>
        )}

        <View className="mt-3 rounded-3xl border border-slate-700 bg-slate-900 p-4">
          <Text className="text-slate-400 text-xs uppercase">Current Stop</Text>
          <Text className="text-white text-2xl font-bold mt-1">{currentStop?.name ?? "Route Complete"}</Text>

          <Text className="text-slate-400 text-xs uppercase mt-4">Next Stop</Text>
          <Text className="text-slate-200 text-lg font-semibold mt-1">{nextStop?.name ?? "No further stops"}</Text>

          <View className="mt-3 flex-row gap-2">
            <View className="flex-1 rounded-2xl bg-slate-800 px-3 py-2">
              <Text className="text-slate-400 text-[11px] uppercase">Distance</Text>
              <Text className="text-white text-lg font-bold mt-0.5">
                {distanceToNext != null ? formatDistanceMeters(distanceToNext) : "—"}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-slate-800 px-3 py-2">
              <Text className="text-slate-400 text-[11px] uppercase">ETA</Text>
              <Text className="text-white text-lg font-bold mt-0.5">{eta?.label ?? "—"}</Text>
            </View>
          </View>

          <View className="mt-4 flex-row">
            <View className="flex-1">
              <Text className="text-slate-400 text-xs uppercase">Picked</Text>
              <Text className="text-white text-xl font-bold mt-1">{trip.picked_students}/{trip.total_students}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-slate-400 text-xs uppercase">Timer</Text>
              <Text className="text-white text-xl font-bold mt-1">{timerLabel}</Text>
            </View>
          </View>

          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-slate-400 text-xs uppercase">Route Progress</Text>
              <Text className="text-slate-300 text-xs">{progressPercent}%</Text>
            </View>
            <View className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <View className="h-3 bg-emerald-500" style={{ width: `${progressPercent}%` }} />
            </View>
          </View>
        </View>

        <View className="mt-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 flex-row items-center justify-between">
          <Text className="text-slate-200 text-sm">
            Queue: {queueCount + locQueued > 0 ? `${queueCount + locQueued} pending` : "All synced"}
          </Text>
          <TouchableOpacity
            className="px-3 py-2 rounded-xl bg-slate-800"
            onPress={handleSync}
            disabled={syncing}
            activeOpacity={0.8}
          >
            {syncing ? <ActivityIndicator size="small" color="#E2E8F0" /> : <Text className="text-slate-100 font-semibold">Sync</Text>}
          </TouchableOpacity>
        </View>

        {error ? <Text className="text-red-300 text-sm mt-2">{error}</Text> : null}
        <View className="h-2" />
      </ScrollView>

      <View className="pt-2 pb-2 gap-2">
        <TouchableOpacity
          accessibilityLabel="Arrive at current stop and open attendance"
          className="min-h-[56px] rounded-2xl bg-blue-500 items-center justify-center"
          activeOpacity={0.85}
          onPress={openAttendance}
          disabled={busyAction !== null || !currentStop}
        >
          {busyAction === "arrive" ? <ActivityIndicator color="#EFF6FF" /> : <Text className="text-blue-950 text-lg font-bold">ARRIVE AT STOP</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Mark attendance at current stop"
          className="min-h-[56px] rounded-2xl bg-cyan-400 items-center justify-center"
          activeOpacity={0.85}
          onPress={openAttendance}
          disabled={busyAction !== null || !currentStop}
        >
          <Text className="text-cyan-950 text-lg font-bold">MARK ATTENDANCE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Leave this stop and move to the next one"
          className="min-h-[56px] rounded-2xl bg-amber-400 items-center justify-center"
          activeOpacity={0.85}
          onPress={handleNextStop}
          disabled={busyAction !== null || !currentStop}
        >
          {busyAction === "next" ? <ActivityIndicator color="#451A03" /> : <Text className="text-amber-950 text-lg font-bold">NEXT STOP</Text>}
        </TouchableOpacity>

        {(() => {
          const canEnd = atLastStop && trip.status !== "completed";
          const canEndEarly = !atLastStop && trip.status !== "completed" && allowForceEnd();
          return (
            <TouchableOpacity
              accessibilityLabel={canEnd ? "End this trip" : canEndEarly ? "End trip early" : "End trip is only available at the last stop"}
              accessibilityHint={canEndEarly ? "Ends the trip now and finishes early, leaving remaining stops unhandled" : undefined}
              className={`min-h-[56px] rounded-2xl items-center justify-center ${trip.status === "completed" ? "bg-slate-800" : canEnd ? "bg-red-500" : canEndEarly ? "bg-amber-400" : "bg-red-300"}`}
              activeOpacity={0.85}
              onPress={handleEndTrip}
              disabled={busyAction !== null || trip.status === "completed" || !(canEnd || canEndEarly)}
            >
              {busyAction === "end" ? (
                <ActivityIndicator color="#FEE2E2" />
              ) : (
                <Text className={`text-lg font-bold ${canEndEarly ? "text-amber-950" : trip.status === "completed" ? "text-slate-300" : "text-red-950"}`}>
                  {canEndEarly ? "END TRIP (EARLY)" : "END TRIP"}
                </Text>
              )}
            </TouchableOpacity>
          );
        })()}
      </View>
    </SafeAreaView>
  );
}
