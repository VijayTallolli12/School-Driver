import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { fetchTransportDashboard } from "@/services/api";
import type { TransportDashboardData } from "@/types";

export default function TransportDriverScreen() {
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
      console.error("[TransportDriver] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load driver details");
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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Driver Details</Text>
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
            <Text className="text-slate-400 text-sm mt-3">Loading driver details...</Text>
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
            <View className="w-16 h-16 bg-cyan-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="person-outline" size={32} color="#06B6D4" />
            </View>
            <Text className="text-slate-800 text-base font-semibold mb-2">No Driver Assigned</Text>
            <Text className="text-slate-400 text-sm text-center">Driver details will appear once transport is assigned.</Text>
          </View>
        ) : (
          <View className="gap-3 mb-8">
            <Card padding="lg">
              <View className="items-center py-4">
                <View className="w-20 h-20 bg-cyan-50 rounded-full items-center justify-center mb-4">
                  <Ionicons name="person-circle-outline" size={40} color="#06B6D4" />
                </View>
                <Text className="text-slate-900 text-xl font-bold">{transport.driver_name ?? "—"}</Text>
                <Text className="text-slate-500 text-sm mt-1">Driver</Text>
              </View>
            </Card>

            <Card padding="lg">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Contact Information</Text>
              <View className="gap-4">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-green-50 rounded-xl items-center justify-center">
                    <Ionicons name="call-outline" size={18} color="#16A34A" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-400 text-xs">Mobile</Text>
                    <Text className="text-slate-900 text-sm font-semibold">{transport.driver_mobile ?? "—"}</Text>
                  </View>
                  {transport.driver_mobile ? (
                    <TouchableOpacity
                      className="flex-row items-center bg-green-50 px-3 py-2 rounded-lg"
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL(`tel:${transport.driver_mobile}`)}
                    >
                      <Ionicons name="call-outline" size={16} color="#16A34A" />
                      <Text className="text-green-700 text-xs font-semibold ml-1">Call</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {transport.driver_license ? (
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center">
                      <Ionicons name="document-text-outline" size={18} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-400 text-xs">License Number</Text>
                      <Text className="text-slate-900 text-sm font-semibold">{transport.driver_license}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </Card>

            <Card padding="lg">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Vehicle</Text>
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-cyan-50 rounded-xl items-center justify-center">
                  <Ionicons name="bus-outline" size={20} color="#06B6D4" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-xs">Vehicle Number</Text>
                  <Text className="text-slate-900 text-sm font-semibold">{transport.vehicle_number ?? "—"}</Text>
                  {transport.vehicle_name ? (
                    <Text className="text-slate-500 text-xs">{transport.vehicle_name}</Text>
                  ) : null}
                </View>
              </View>
            </Card>

            <Card padding="lg">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Route</Text>
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 bg-teal-50 rounded-xl items-center justify-center">
                  <Ionicons name="map-outline" size={20} color="#14B8A6" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-xs">Route Name</Text>
                  <Text className="text-slate-900 text-sm font-semibold">{transport.route_name ?? "—"}</Text>
                  <Text className="text-slate-500 text-xs">{transport.route_start ?? ""} → {transport.route_end ?? ""}</Text>
                </View>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}