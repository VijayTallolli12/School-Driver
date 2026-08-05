import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `₹${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    const thousands = amount / 1000;
    return `₹${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return `₹${amount}`;
}

export default function TransportScreen() {
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
      console.error("[Transport] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load transport");
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
  const hasTransport = transport != null;

  const handleCallDriver = () => {
    if (transport?.driver_mobile) {
      Linking.openURL(`tel:${transport.driver_mobile}`);
    }
  };

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Transport</Text>
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
            <Text className="text-slate-400 text-sm mt-3">Loading transport...</Text>
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
        ) : !hasTransport ? (
          <EmptyState
            icon="bus-outline"
            title="No Transport Assigned"
            description="Your child does not have an active transport assignment. Please contact the school administration."
          />
        ) : (
          <View className="gap-3 mb-8">
            {/* ── Vehicle & Driver Card ── */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/transport/driver" as any)}
            >
              <Card padding="lg">
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Vehicle & Driver</Text>
                <View className="flex-row items-center gap-4">
                  <View className="w-14 h-14 bg-cyan-50 rounded-2xl items-center justify-center shrink-0">
                    <Ionicons name="bus-outline" size={28} color="#06B6D4" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-900 text-base font-bold">{transport.vehicle_number ?? "—"}</Text>
                    <Text className="text-slate-500 text-sm">{transport.vehicle_name ?? ""}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </View>
                <View className="mt-4 pt-4 border-t border-slate-50">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-cyan-50 rounded-full items-center justify-center">
                      <Ionicons name="person-outline" size={18} color="#06B6D4" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-900 text-sm font-semibold">{transport.driver_name ?? "—"}</Text>
                      <Text className="text-slate-500 text-xs">{transport.driver_mobile ?? ""}</Text>
                    </View>
                    {transport.driver_mobile ? (
                      <TouchableOpacity
                        className="flex-row items-center bg-cyan-50 px-3 py-2 rounded-lg"
                        activeOpacity={0.7}
                        onPress={handleCallDriver}
                      >
                        <Ionicons name="call-outline" size={16} color="#06B6D4" />
                        <Text className="text-cyan-700 text-xs font-semibold ml-1">Call</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>

            {/* ── Route Card ── */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/transport/route" as any)}
            >
              <Card padding="lg">
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Route</Text>
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-teal-50 rounded-xl items-center justify-center">
                    <Ionicons name="map-outline" size={20} color="#14B8A6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-900 text-sm font-semibold">{transport.route_name ?? "—"}</Text>
                    <Text className="text-slate-500 text-xs">{transport.route_start ?? ""} → {transport.route_end ?? ""}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </View>
              </Card>
            </TouchableOpacity>

            {/* ── Pickup & Drop Card ── */}
            <Card padding="lg">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Pickup & Drop</Text>
              <View className="flex-row items-start gap-4">
                <View className="items-center">
                  <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center">
                    <Ionicons name="arrow-up-outline" size={16} color="#16A34A" />
                  </View>
                  <View className="w-0.5 h-8 bg-slate-200 mt-1" />
                  <View className="w-8 h-8 bg-red-50 rounded-full items-center justify-center">
                    <Ionicons name="arrow-down-outline" size={16} color="#DC2626" />
                  </View>
                </View>
                <View className="flex-1 gap-3">
                  <View>
                    <Text className="text-slate-400 text-xs">Pickup</Text>
                    <Text className="text-slate-900 text-sm font-semibold">{transport.pickup_stop ?? "—"}</Text>
                    <Text className="text-slate-500 text-xs">{formatTime(transport.pickup_time)}</Text>
                  </View>
                  <View>
                    <Text className="text-slate-400 text-xs">Drop</Text>
                    <Text className="text-slate-900 text-sm font-semibold">{transport.drop_stop ?? "—"}</Text>
                    <Text className="text-slate-500 text-xs">{formatTime(transport.drop_time)}</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* ── Stop Sequence ── */}
            {stops.length > 0 ? (
              <Card padding="lg">
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Stop Sequence</Text>
                <View className="gap-2">
                  {stops.map((stop, index) => (
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

            {/* ── Status Card ── */}
            <Card padding="lg">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Status</Text>
                <View className={`px-3 py-1 rounded-full ${transport.status === "active" ? "bg-green-50" : "bg-slate-100"}`}>
                  <Text className={`text-xs font-bold ${transport.status === "active" ? "text-green-700" : "text-slate-500"}`}>
                    {transport.status}
                  </Text>
                </View>
              </View>
              {transport.monthly_fee != null ? (
                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-50">
                  <Text className="text-slate-400 text-xs">Monthly Fee</Text>
                  <Text className="text-slate-900 text-sm font-semibold">{formatCurrency(transport.monthly_fee)}</Text>
                </View>
              ) : null}
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}