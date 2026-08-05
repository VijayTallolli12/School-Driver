import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchNotifications, markAllNotificationsRead } from "@/services/api";
import type { NotificationItem } from "@/types";
import { OfflineState } from "@/components/ui/OfflineState";

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
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const groupByDate = (notifications: NotificationItem[]) => {
  const groups: { label: string; data: NotificationItem[] }[] = [];
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const older: NotificationItem[] = [];

  notifications.forEach((n) => {
    const diffDays = Math.floor((Date.now() - new Date(n.created_at).getTime()) / 86400000);
    if (diffDays === 0) today.push(n);
    else if (diffDays === 1) yesterday.push(n);
    else older.push(n);
  });

  if (today.length) groups.push({ label: "Today", data: today });
  if (yesterday.length) groups.push({ label: "Yesterday", data: yesterday });
  if (older.length) groups.push({ label: "Earlier", data: older });
  return groups;
};

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchNotifications();
      setNotifications(result.data);
    } catch (err: any) {
      console.error("[Notifications] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  const handleOpen = useCallback((item: NotificationItem) => {
    if (!item || !item.id) return;
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
    });
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("[Notifications] mark all read error:", err);
    }
  };

  const filtered = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;
  const grouped = groupByDate(filtered);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-bold tracking-tight">Notifications</Text>
          </View>
          {unreadCount > 0 && (
            <>
              <TouchableOpacity onPress={handleMarkAllRead} className="mr-3">
                <Text className="text-primary-600 text-xs font-semibold">Mark all read</Text>
              </TouchableOpacity>
              <View className="bg-primary-50 px-2.5 py-1 rounded-full">
                <Text className="text-primary-600 text-xs font-bold">{unreadCount}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View className="flex-row px-5 pt-4 pb-3 gap-2">
        <TouchableOpacity
          className={`px-4 py-2 rounded-lg ${filter === "all" ? "bg-primary-600" : "bg-slate-100"}`}
          onPress={() => setFilter("all")}
        >
          <Text className={`text-sm font-semibold ${filter === "all" ? "text-white" : "text-slate-600"}`}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`px-4 py-2 rounded-lg ${filter === "unread" ? "bg-primary-600" : "bg-slate-100"}`}
          onPress={() => setFilter("unread")}
        >
          <Text className={`text-sm font-semibold ${filter === "unread" ? "text-white" : "text-slate-600"}`}>Unread</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
      >
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-slate-400 text-sm mt-3">Loading notifications...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={onRefresh} />
        ) : grouped.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No Notifications"
            description={filter === "unread" ? "You have no unread notifications" : "No notifications to show"}
          />
        ) : (
          grouped.map((group) => (
            <View key={group.label} className="mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">{group.label}</Text>
              <Card padding="none" className="overflow-hidden">
                {group.data.map((item, index) => {
                  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.general;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      className={`flex-row items-start px-4 py-3.5 ${index < group.data.length - 1 ? "border-b border-slate-50" : ""}`}
                      activeOpacity={0.7}
                      onPress={() => handleOpen(item)}
                    >
                      <View className="relative">
                        <View className={`w-9 h-9 ${config.bg} rounded-xl items-center justify-center`}>
                          <Ionicons name={config.icon as any} size={18} color={config.color} />
                        </View>
                        {!item.is_read && (
                          <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-white" />
                        )}
                      </View>
                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center">
                          <Text className={`text-sm flex-1 ${item.is_read ? "text-slate-600" : "text-slate-900 font-semibold"}`}>
                            {item.title}
                          </Text>
                          <Text className="text-slate-400 text-[11px] ml-2">{formatTime(item.created_at)}</Text>
                        </View>
                        <Text
                          className={`text-xs mt-1 leading-4 ${item.is_read ? "text-slate-400" : "text-slate-500"}`}
                          numberOfLines={2}
                        >
                          {item.body}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            </View>
          ))
        )}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
