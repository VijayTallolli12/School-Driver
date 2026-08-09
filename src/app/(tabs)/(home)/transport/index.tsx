import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { normalizeUserRole } from "@/utils/roles";
import { fetchDriverTripState, getErrorMessage, startDriverTrip } from "@/services/api";
import { flushAttendanceQueue, getAttendanceQueue } from "@/services/driverTripQueue";
import type { DriverTripSummary } from "@/types";

function formatTimeLabel(value: string | null): string {
  if (!value) return "Not started";
  const dt = new Date(value);
  return dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function DriverTripControlScreen() {
  const user = useAuthStore((s) => s.user);
  const isDriver = normalizeUserRole(user) === "driver";

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [trip, setTrip] = useState<DriverTripSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);

  const loadTripState = useCallback(async () => {
    if (!isDriver) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [state, queue] = await Promise.all([fetchDriverTripState(), getAttendanceQueue()]);
      setQueuedCount(queue.length);
      setTrip(state.trip);

      if (state.trip?.status === "in_progress") {
        router.replace({ pathname: "/transport/live-trip", params: { tripId: String(state.trip.id) } } as any);
        return;
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isDriver]);

  useEffect(() => {
    void loadTripState();
  }, [loadTripState]);

  const summary = useMemo(() => {
    if (!trip) {
      return {
        routeName: "No trip assigned",
        vehicleNumber: "—",
        startTime: "Not started",
        totalStops: "0",
        totalStudents: "0",
      };
    }

    return {
      routeName: trip.route_name || "Assigned Route",
      vehicleNumber: trip.vehicle_number || "Assigned Vehicle",
      startTime: formatTimeLabel(trip.start_time),
      totalStops: String(trip.total_stops),
      totalStudents: String(trip.total_students),
    };
  }, [trip]);

  const handleStartTrip = useCallback(async () => {
    if (!trip?.id) {
      setError("No scheduled trip to start. Please check with transport admin.");
      return;
    }
    try {
      setStarting(true);
      setError(null);
      const started = await startDriverTrip(trip.id);
      router.replace({ pathname: "/transport/live-trip", params: { tripId: String(started.id) } } as any);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }, [trip?.id]);

  const handleSyncQueue = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await flushAttendanceQueue();
      setQueuedCount(result.pending);
      if (result.synced > 0) {
        Alert.alert("Synced", `${result.synced} attendance updates synced.`);
      }
      if (result.offline) {
        Alert.alert("Offline", "Still offline. Pending attendance is safe and will sync later.");
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  if (!isDriver) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center px-6">
        <Text className="text-red-300 text-base font-semibold">Driver mode only</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-5">
      <View className="pt-2 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-slate-300 text-xs uppercase tracking-[1.5px]">Trip Control</Text>
          <Text className="text-white text-2xl font-bold mt-1">Ready to Drive</Text>
        </View>
        <TouchableOpacity
          className="w-12 h-12 rounded-2xl bg-red-600 items-center justify-center"
          activeOpacity={0.8}
          onPress={() => router.push("/transport/emergency" as any)}
        >
          <Ionicons name="call" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View className="bg-slate-900 border border-slate-700 rounded-3xl p-5">
        <Text className="text-slate-400 text-xs uppercase tracking-[1.2px]">Route Name</Text>
        <Text className="text-white text-2xl font-bold mt-1">{summary.routeName}</Text>

        <View className="h-px bg-slate-800 my-4" />

        <Text className="text-slate-400 text-xs uppercase tracking-[1.2px]">Vehicle Number</Text>
        <Text className="text-white text-xl font-semibold mt-1">{summary.vehicleNumber}</Text>

        <View className="h-px bg-slate-800 my-4" />

        <View className="flex-row">
          <View className="flex-1">
            <Text className="text-slate-400 text-xs uppercase tracking-[1.2px]">Start Time</Text>
            <Text className="text-white text-lg font-semibold mt-1">{summary.startTime}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-slate-400 text-xs uppercase tracking-[1.2px]">Stops</Text>
            <Text className="text-white text-lg font-semibold mt-1">{summary.totalStops}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-slate-400 text-xs uppercase tracking-[1.2px]">Students</Text>
            <Text className="text-white text-lg font-semibold mt-1">{summary.totalStudents}</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name={queuedCount > 0 ? "sync-outline" : "checkmark-circle-outline"} size={18} color={queuedCount > 0 ? "#F59E0B" : "#22C55E"} />
          <Text className="text-slate-200 text-sm ml-2">
            {queuedCount > 0 ? `${queuedCount} pending attendance` : "All attendance synced"}
          </Text>
        </View>
        <TouchableOpacity
          className="px-3 py-2 rounded-xl bg-slate-800"
          activeOpacity={0.8}
          onPress={handleSyncQueue}
          disabled={syncing || queuedCount === 0}
        >
          {syncing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-white font-semibold">Sync</Text>}
        </TouchableOpacity>
      </View>

      {error ? (
        <Text className="text-red-300 text-sm mt-3">{error}</Text>
      ) : null}

      <View className="mt-auto pb-5">
        <TouchableOpacity
          className="min-h-[56px] rounded-2xl bg-emerald-500 items-center justify-center"
          activeOpacity={0.85}
          onPress={handleStartTrip}
          disabled={loading || starting || !trip}
        >
          {loading || starting ? (
            <ActivityIndicator size="small" color="#022C22" />
          ) : !trip ? (
            <Text className="text-emerald-200 text-lg font-bold tracking-wide">NO TRIP TODAY</Text>
          ) : (
            <Text className="text-emerald-950 text-lg font-bold tracking-wide">START TRIP</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
