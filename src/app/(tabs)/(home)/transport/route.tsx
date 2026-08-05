import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { fetchTransportDashboard } from "@/services/api";
import type { TransportDashboardData, TransportStop } from "@/types";

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function TransportRouteScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<TransportDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parentUuid = useAuthStore((s) => s.parentUuid);
  const students = useAuthStore((s) => s.students);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const childUuid = selectedStudentUuid ?? students?.[0]?.uuid;

  const loadTransport = useCallback(async () => {
    if (!parentUuid || !childUuid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const result = await fetchTransportDashboard(parentUuid, childUuid);
      setData(result);
    } catch (err: any) {
      console.error("[TransportRoute] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load route details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentUuid, childUuid]);

  useEffect(() => {
    loadTransport();
  }, [loadTransport]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransport();
  }, [loadTransport]);

  const transport = data?.transport;
  const stops = data?.stops ?? [];

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Route Details</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06B6D4" colors={["#06B6D4"]} />}
      >
        {loading ? (
          <View className="items-center justify-center pt-24 pb-8">
            <ActivityIndicator size="large" color="#06B6D4" />
            <Text className="text-slate-400 text-sm mt-3">Loading route details...</Text>
          </View>
        ) : error ? (
          <View className="items-center justify-center pt-20 pb-8">
            <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
            </View>
            <Text className="text-slate-800 text-base font-semibold mb-2">Connection Error</Text>
            <Text className="text-slate-400 text-sm text-center mb-6">{error}</Text>
            <TouchableOpacity
              className="flex-row items-center bg-primary-600 px-6 py-3 rounded-xl"
              activeOpacity={0.7}
              onPress={onRefresh}
            >
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text className="text-white font-semibold text-sm ml-2">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !transport ? (
          <View className="items-center justify-center pt-20 pb-8">
            <View className="w-16 h-16 bg-teal-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="map-outline" size={32} color="#14B8A6" />
            </View>
            <Text className="text-slate-800 text-base font-semibold mb-2">No Route Assigned</Text>
            <Text className="text-slate-400 text-sm text-center">Route details will appear once transport is assigned.</Text>
          </View>
        ) : (
          <View className="gap-3 mb-8">
            <Card padding="lg">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Route Information</Text>
              <View className="gap-4">
                <View>
                  <Text className="text-slate-400 text-xs">Route Name</Text>
                  <Text className="text-slate-900 text-sm font-semibold">{transport.route_name ?? "—"}</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <Text className="text-green-600 text-xs font-medium">Start Point</Text>
                    <Text className="text-slate-900 text-sm">{transport.route_start ?? "—"}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
                  <View className="flex-1">
                    <Text className="text-red-600 text-xs font-medium">End Point</Text>
                    <Text className="text-slate-900 text-sm">{transport.route_end ?? "—"}</Text>
                  </View>
                </View>
              </View>
            </Card>

            <Card padding="lg">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Vehicle</Text>
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-cyan-50 rounded-xl items-center justify-center">
                  <Ionicons name="bus-outline" size={20} color="#06B6D4" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 text-sm font-semibold">{transport.vehicle_number ?? "—"}</Text>
                  {transport.vehicle_name ? (
                    <Text className="text-slate-500 text-xs">{transport.vehicle_name}</Text>
                  ) : null}
                  {transport.vehicle_type ? (
                    <Text className="text-slate-400 text-xs">{transport.vehicle_type.replace("_", " ")}</Text>
                  ) : null}
                </View>
              </View>
            </Card>

            <Card padding="lg">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Driver</Text>
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-purple-50 rounded-xl items-center justify-center">
                  <Ionicons name="person-outline" size={20} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 text-sm font-semibold">{transport.driver_name ?? "—"}</Text>
                  {transport.driver_mobile ? (
                    <Text className="text-slate-500 text-xs">{transport.driver_mobile}</Text>
                  ) : null}
                </View>
              </View>
            </Card>

            {stops.length > 0 ? (
              <Card padding="lg">
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Stop Sequence</Text>
                <View className="gap-2">
                  {stops.map((stop: TransportStop, index: number) => (
                    <View key={stop.id} className="flex-row items-center gap-3">
                      <View className={`w-6 h-6 rounded-full items-center justify-center ${stop.is_student_stop ? "bg-cyan-500" : "bg-slate-200"}`}>
                        <Text className={`text-xs font-bold ${stop.is_student_stop ? "text-white" : "text-slate-500"}`}>
                          {index + 1}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className={`text-sm ${stop.is_student_stop ? "text-slate-900 font-semibold" : "text-slate-600"}`}>
                          {stop.stop_name}
                        </Text>
                      </View>
                      <Text className="text-slate-400 text-xs">{formatTime(stop.pickup_time)}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            <Card padding="lg">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Pickup & Drop</Text>
              <View className="gap-4">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center">
                    <Ionicons name="arrow-up-outline" size={14} color="#16A34A" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-400 text-xs">Pickup</Text>
                    <Text className="text-slate-900 text-sm font-semibold">{transport.pickup_stop ?? "—"}</Text>
                    <Text className="text-slate-500 text-xs">{formatTime(transport.pickup_time)}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 bg-red-50 rounded-full items-center justify-center">
                    <Ionicons name="arrow-down-outline" size={14} color="#DC2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-400 text-xs">Drop</Text>
                    <Text className="text-slate-900 text-sm font-semibold">{transport.drop_stop ?? "—"}</Text>
                    <Text className="text-slate-500 text-xs">{formatTime(transport.drop_time)}</Text>
                  </View>
                </View>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}