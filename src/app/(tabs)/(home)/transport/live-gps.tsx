import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchTransportLive } from "@/services/api";
import { getDriverLocationSnapshot, requestDriverLocationPermission, watchDriverLocation } from "@/services/geolocation";
import { normalizeTransportDashboardFromLive } from "@/utils/transport";
import type { DriverLocationSnapshot, TransportDashboardData } from "@/types";

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function formatAccuracy(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value)} m`;
}

export default function LiveGpsScreen() {
  const user = useAuthStore((s) => s.user);
  const assignedVehicleId = useAuthStore((s) => s.assignedVehicleId);
  const assignedRouteId = useAuthStore((s) => s.assignedRouteId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [snapshot, setSnapshot] = useState<DriverLocationSnapshot | null>(null);
  const [data, setData] = useState<TransportDashboardData | null>(null);

  const transport = data?.transport;
  const nextDestination = useMemo(() => {
    const routeName = transport?.route_name ?? "";
    const endPoint = transport?.route_end ?? "";
    return encodeURIComponent([routeName, endPoint].filter(Boolean).join(" "));
  }, [transport?.route_end, transport?.route_name]);

  const loadLiveData = useCallback(async () => {
    try {
      setError(null);
      const live = await fetchTransportLive();
      setData(normalizeTransportDashboardFromLive(live));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load GPS data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLiveData();
  }, [loadLiveData]);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const startTracking = async () => {
      if (!assignedVehicleId) return;
      const granted = await requestDriverLocationPermission();
      if (!granted) {
        setError("Location permission is required to share live GPS data.");
        return;
      }
      try {
        const initial = await getDriverLocationSnapshot();
        setSnapshot(initial);
      } catch {
        // keep the screen usable even if the first fix fails
      }
      subscription = await watchDriverLocation(
        assignedVehicleId,
        async (nextSnapshot) => {
          setSnapshot(nextSnapshot);
          setTracking(true);
        },
        (message) => setError(message),
      );
      setTracking(true);
    };

    void startTracking();

    return () => {
      subscription?.remove();
    };
  }, [assignedVehicleId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadLiveData()]);
  }, [loadLiveData]);

  const openNavigation = useCallback(async () => {
    if (!transport?.route_end && !transport?.route_name) return;
    const query = nextDestination || encodeURIComponent(transport.route_name ?? "");
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    await Linking.openURL(url);
  }, [nextDestination, transport?.route_end, transport?.route_name]);

  const canTrack = Boolean(assignedVehicleId);

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-8 h-8 items-center justify-center -ml-1 mr-2"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#475569" />
          </TouchableOpacity>
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Live GPS</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={undefined}
      >
        {loading ? (
          <View className="items-center justify-center pt-24 pb-8">
            <ActivityIndicator size="large" color="#06B6D4" />
            <Text className="text-slate-400 text-sm mt-3">Loading GPS tracking...</Text>
          </View>
        ) : error ? (
          <ErrorState message={error} onRetry={handleRefresh} />
        ) : !canTrack ? (
          <EmptyState
            icon="locate-outline"
            title="No Vehicle Assigned"
            description="Live GPS tracking becomes available after a vehicle is assigned to the driver account."
          />
        ) : (
          <View className="gap-3 pb-8">
            <Card padding="lg">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Tracking</Text>
                  <Text className="text-slate-900 text-base font-bold mt-1">{tracking ? "Live and sharing" : "Waiting for GPS"}</Text>
                </View>
                <View className={`px-3 py-1.5 rounded-full ${tracking ? "bg-green-50" : "bg-amber-50"}`}>
                  <Text className={`text-xs font-bold ${tracking ? "text-green-700" : "text-amber-700"}`}>
                    {tracking ? "Active" : "Pending"}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-2.5">
                <View className="flex-1 bg-slate-50 rounded-2xl p-3">
                  <Text className="text-slate-400 text-[11px] font-semibold uppercase">Latitude</Text>
                  <Text className="text-slate-900 text-sm font-semibold mt-1">{snapshot ? formatCoordinate(snapshot.latitude) : "—"}</Text>
                </View>
                <View className="flex-1 bg-slate-50 rounded-2xl p-3">
                  <Text className="text-slate-400 text-[11px] font-semibold uppercase">Longitude</Text>
                  <Text className="text-slate-900 text-sm font-semibold mt-1">{snapshot ? formatCoordinate(snapshot.longitude) : "—"}</Text>
                </View>
              </View>

              <View className="flex-row gap-2.5 mt-2.5">
                <View className="flex-1 bg-slate-50 rounded-2xl p-3">
                  <Text className="text-slate-400 text-[11px] font-semibold uppercase">Accuracy</Text>
                  <Text className="text-slate-900 text-sm font-semibold mt-1">{formatAccuracy(snapshot?.accuracy ?? null)}</Text>
                </View>
                <View className="flex-1 bg-slate-50 rounded-2xl p-3">
                  <Text className="text-slate-400 text-[11px] font-semibold uppercase">Speed</Text>
                  <Text className="text-slate-900 text-sm font-semibold mt-1">{snapshot?.speed != null ? `${Math.round(snapshot.speed * 3.6)} km/h` : "—"}</Text>
                </View>
              </View>

              <View className="flex-row gap-2.5 mt-2.5">
                <View className="flex-1 bg-slate-50 rounded-2xl p-3">
                  <Text className="text-slate-400 text-[11px] font-semibold uppercase">Heading</Text>
                  <Text className="text-slate-900 text-sm font-semibold mt-1">{snapshot?.heading != null ? `${Math.round(snapshot.heading)}°` : "—"}</Text>
                </View>
                <View className="flex-1 bg-slate-50 rounded-2xl p-3">
                  <Text className="text-slate-400 text-[11px] font-semibold uppercase">Vehicle</Text>
                  <Text className="text-slate-900 text-sm font-semibold mt-1">{transport?.vehicle_number ?? "—"}</Text>
                </View>
              </View>
            </Card>

            <Card padding="lg">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Route Snapshot</Text>
              <Text className="text-slate-900 text-base font-bold">{transport?.route_name ?? "Route not loaded"}</Text>
              <Text className="text-slate-500 text-sm mt-1">
                {transport?.route_start ?? "—"} → {transport?.route_end ?? "—"}
              </Text>
              <View className="flex-row gap-2 mt-4">
                <Button title="Google Navigation" onPress={openNavigation} size="sm" />
                <Button title="Refresh" onPress={handleRefresh} size="sm" variant="outline" />
              </View>
            </Card>

            <Card padding="lg">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Last Sync</Text>
              <Text className="text-slate-900 text-sm font-semibold">
                {snapshot?.timestamp ?? "No GPS update yet"}
              </Text>
              <Text className="text-slate-500 text-sm mt-1">
                Driver: {user?.name ?? "—"} • Route ID: {assignedRouteId ?? "—"}
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}