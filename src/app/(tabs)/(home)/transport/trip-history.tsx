import { useCallback, useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { fetchTripHistory, getErrorMessage } from "@/services/api";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import type { TripHistoryItem } from "@/types";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(started: string | null | undefined, ended: string | null | undefined): string {
  if (!started || !ended) return "—";
  const ms = new Date(ended).getTime() - new Date(started).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TripHistoryScreen() {
  const [trips, setTrips] = useState<TripHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchTripHistory();
      setTrips(result);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="w-8 h-8 items-center justify-center -ml-1 mr-2"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#475569" />
          </TouchableOpacity>
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Trip History</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" colors={["#6366F1"]} />}
      >
        {loading ? (
          <View className="items-center justify-center pt-24 pb-8">
            <ActivityIndicator size="large" color="#6366F1" />
            <Text className="text-slate-400 text-sm mt-3">Loading trip history...</Text>
          </View>
        ) : error ? (
          <ErrorState message={error} onRetry={onRefresh} />
        ) : trips.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No Trips Yet"
            description="Completed trips will appear here with their summary."
          />
        ) : (
          <View className="gap-3 mb-8">
            {trips.map((trip) => (
              <View
                key={trip.id}
                className="rounded-2xl border border-slate-100 bg-white p-4"
                accessible
                accessibilityLabel={`Trip ${trip.id}: ${trip.route_name ?? "route"}`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-slate-900 text-base font-semibold flex-1 mr-2" numberOfLines={1}>
                    {trip.route_name ?? `Trip #${trip.id}`}
                  </Text>
                  <Badge
                    label={trip.status === "completed" ? "Completed" : trip.status === "in_progress" ? "In Progress" : "Ended"}
                    variant={trip.status === "completed" ? "success" : "neutral"}
                  />
                </View>

                <Text className="text-slate-400 text-xs mt-1.5">{trip.vehicle_number ?? "Vehicle —"}</Text>

                <View className="h-px bg-slate-100 my-3" />

                <View className="flex-row flex-wrap">
                  <View className="w-1/2 mb-3">
                    <Text className="text-slate-400 text-[11px] uppercase">Started</Text>
                    <Text className="text-slate-800 text-sm font-semibold mt-0.5">{formatDateTime(trip.started_at)}</Text>
                  </View>
                  <View className="w-1/2 mb-3">
                    <Text className="text-slate-400 text-[11px] uppercase">Ended</Text>
                    <Text className="text-slate-800 text-sm font-semibold mt-0.5">{formatDateTime(trip.ended_at)}</Text>
                  </View>
                  <View className="w-1/3">
                    <Text className="text-slate-400 text-[11px] uppercase">Duration</Text>
                    <Text className="text-slate-800 text-sm font-semibold mt-0.5">{formatDuration(trip.started_at, trip.ended_at)}</Text>
                  </View>
                  <View className="w-1/3">
                    <Text className="text-slate-400 text-[11px] uppercase">Stops</Text>
                    <Text className="text-slate-800 text-sm font-semibold mt-0.5">{trip.completed_stops ?? 0}/{trip.total_stops ?? 0}</Text>
                  </View>
                  <View className="w-1/3">
                    <Text className="text-slate-400 text-[11px] uppercase">Picked</Text>
                    <Text className="text-slate-800 text-sm font-semibold mt-0.5">{trip.type === "drop" ? trip.dropped_students ?? 0 : trip.picked_students ?? 0}/{trip.total_students ?? 0}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}