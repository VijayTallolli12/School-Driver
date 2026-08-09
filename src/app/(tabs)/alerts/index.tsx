import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { normalizeUserRole } from "@/utils/roles";
import { Card } from "@/components/ui/Card";
import { OfflineState } from "@/components/ui/OfflineState";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchDriverTripState, fetchNotifications, getErrorMessage } from "@/services/api";
import { flushAttendanceQueue, getAttendanceQueue } from "@/services/driverTripQueue";
import { flushLocationQueue, getLocationQueue } from "@/services/locationQueue";
import { flushSosQueue, getSosQueue } from "@/services/sosQueue";
import type { DriverTripSummary, NotificationItem } from "@/types";

const TYPE_CONFIG: Record<string, { icon: string; bg: string; color: string }> = {
  fees: { icon: "wallet-outline", bg: "bg-amber-50", color: "#F59E0B" },
  attendance: { icon: "calendar-outline", bg: "bg-blue-50", color: "#3B82F6" },
  result: { icon: "school-outline", bg: "bg-purple-50", color: "#8B5CF6" },
  general: { icon: "megaphone-outline", bg: "bg-slate-50", color: "#64748B" },
  homework: { icon: "book-outline", bg: "bg-orange-50", color: "#F97316" },
};

const formatTime = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function AlertsScreen() {
  const user = useAuthStore((s) => s.user);
  const isDriver = normalizeUserRole(user) === "driver";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queued, setQueued] = useState(0);
  const [locQueued, setLocQueued] = useState(0);
  const [sosQueued, setSosQueued] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [trip, setTrip] = useState<DriverTripSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [queue, locQueue, sosQueue, state, notifs] = await Promise.all([
        getAttendanceQueue(),
        getLocationQueue(),
        getSosQueue(),
        isDriver ? fetchDriverTripState() : Promise.resolve(null),
        fetchNotifications(),
      ]);
      setQueued(queue.length);
      setLocQueued(locQueue.length);
      setSosQueued(sosQueue.length);
      setTrip(state?.trip ?? null);
      setNotifications(notifs.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDriver]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const [result, locResult, sosResult] = await Promise.all([
        flushAttendanceQueue(),
        flushLocationQueue(),
        flushSosQueue(),
      ]);
      setQueued(result.pending);
      setLocQueued(locResult.pending);
      setSosQueued(sosResult.pending);
    } finally {
      setSyncing(false);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Alerts</Text>
          <View className="flex-row items-center">
            {unreadCount > 0 && (
              <View className="bg-red-50 px-2.5 py-1 rounded-full">
                <Text className="text-red-600 text-xs font-bold">{unreadCount} unread</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
      >
        {loading ? (
          <View className="items-center justify-center pt-24 pb-8">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-slate-400 text-sm mt-3">Loading alerts...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={onRefresh} />
        ) : (
          <>
            {isDriver && (
              <>
                <TouchableOpacity
                  className="w-full rounded-3xl bg-red-600 p-5 items-center mb-4"
                  activeOpacity={0.85}
                  onPress={() => router.push("/transport/emergency" as any)}
                >
                  <Ionicons name="warning" size={32} color="#FFFFFF" />
                  <Text className="text-white text-xl font-black tracking-wide mt-2">EMERGENCY</Text>
                  <Text className="text-white/80 text-sm mt-1">Call dispatch immediately</Text>
                </TouchableOpacity>

                <View className="flex-row gap-2.5 mb-4">
                  <Card padding="md" className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Ionicons name="bus-outline" size={16} color="#6366F1" />
                      <Text className="text-slate-400 text-[11px] font-semibold uppercase">Status</Text>
                    </View>
                    <Text className="text-slate-900 text-xl font-bold" numberOfLines={1}>
                      {trip?.status === "in_progress" ? "In Progress" : trip?.status === "completed" ? "Completed" : "Ready"}
                    </Text>
                    {trip?.status === "in_progress" && (
                      <TouchableOpacity
                        className="mt-3 rounded-xl bg-indigo-50 px-3 py-2"
                        activeOpacity={0.8}
                        onPress={() => router.replace({ pathname: "/transport/live-trip", params: { tripId: String(trip.id) } } as any)}
                      >
                        <Text className="text-indigo-700 text-xs font-bold text-center">Open Live Trip</Text>
                      </TouchableOpacity>
                    )}
                  </Card>

                  <Card padding="md" className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Ionicons name={queued + locQueued + sosQueued > 0 ? "sync-outline" : "checkmark-done-circle-outline"} size={16} color={queued + locQueued + sosQueued > 0 ? "#F59E0B" : "#22C55E"} />
                      <Text className="text-slate-400 text-[11px] font-semibold uppercase">Sync</Text>
                    </View>
                    <Text className="text-slate-900 text-xl font-bold" numberOfLines={1}>
                      {queued + locQueued + sosQueued > 0 ? `${queued + locQueued + sosQueued} pending` : "All Synced"}
                    </Text>
                    {sosQueued > 0 ? (
                      <View className="mt-2 flex-row items-center gap-1.5">
                        <Ionicons name="notifications" size={14} color="#DC2626" />
                        <Text className="text-red-600 text-[11px] font-bold">{sosQueued} unsent alert{sosQueued > 1 ? "s" : ""} – press Sync Now to send</Text>
                      </View>
                    ) : null}
                    {queued + locQueued + sosQueued > 0 ? (
                      <TouchableOpacity
                        className="mt-3 rounded-xl bg-slate-800 px-3 py-2 items-center"
                        activeOpacity={0.8}
                        onPress={handleSync}
                        disabled={syncing}
                      >
                        {syncing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text className="text-white text-xs font-bold">Sync Now</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </Card>
                </View>
              </>
            )}

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Notifications</Text>
              <TouchableOpacity onPress={() => router.push("/notifications" as any)}>
                <Text className="text-primary-600 text-xs font-semibold">View All</Text>
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <EmptyState
                icon="notifications-off-outline"
                title="No Notifications"
                description="New notifications will appear here."
              />
            ) : (
              <Card padding="none" className="overflow-hidden mb-8">
                {notifications.slice(0, 3).map((item, index) => {
                  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.general;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      className={`flex-row items-center px-4 py-3.5 ${index < Math.min(notifications.length, 3) - 1 ? "border-b border-slate-50" : ""}`}
                      activeOpacity={0.7}
                      onPress={() =>
                        router.push({
                          pathname: "/notifications/[id]",
                          params: {
                            id: String(item.id),
                            title: item.title ?? "",
                            body: item.body ?? "",
                            type: item.type ?? "general",
                            is_read: String(!!item.is_read),
                            created_at: item.created_at ?? "",
                          },
                        } as any)
                      }
                    >
                      <View className="relative">
                        <View className={`w-9 h-9 ${config.bg} rounded-xl items-center justify-center`}>
                          <Ionicons name={config.icon as any} size={18} color={config.color} />
                        </View>
                        {!item.is_read && <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-white" />}
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className="text-slate-800 text-sm font-semibold" numberOfLines={1}>{item.title}</Text>
                        <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>{item.body}</Text>
                      </View>
                      <Text className="text-slate-400 text-[11px] ml-2 shrink-0">{formatTime(item.created_at)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}