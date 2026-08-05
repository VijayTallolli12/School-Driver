import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchCirculars } from "@/services/api";
import type { CircularItem } from "@/types";
import { OfflineState } from "@/components/ui/OfflineState";

const PRIORITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Urgent", color: "#DC2626", bg: "bg-red-50" },
  high: { label: "High", color: "#F59E0B", bg: "bg-amber-50" },
  normal: { label: "Normal", color: "#3B82F6", bg: "bg-blue-50" },
  low: { label: "Low", color: "#64748B", bg: "bg-slate-50" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export default function CircularsScreen() {
  const parentUuid = useAuthStore((s) => s.parentUuid);

  const [circulars, setCirculars] = useState<CircularItem[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCirculars = useCallback(async (page = 1, append = false) => {
    if (!parentUuid) {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }
    try {
      setError(null);
      const result = await fetchCirculars(parentUuid, page);
      if (append) {
        setCirculars((prev) => [...prev, ...result.data]);
      } else {
        setCirculars(result.data);
      }
      setMeta(result.meta);
    } catch (err: any) {
      console.error("[Circulars] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load circulars");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [parentUuid]);

  useEffect(() => {
    loadCirculars();
  }, [loadCirculars]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCirculars();
  }, [loadCirculars]);

  const handleLoadMore = useCallback(async () => {
    if (!meta || meta.current_page >= meta.last_page || loadingMore) return;
    setLoadingMore(true);
    await loadCirculars(meta.current_page + 1, true);
  }, [meta, loadingMore, loadCirculars]);

  const handleOpen = useCallback((item: CircularItem) => {
    router.push({
      pathname: "/circulars/[id]" as any,
      params: {
        id: String(item.id),
        title: item.title ?? "",
        body: item.body ?? item.message ?? "",
        priority: item.priority ?? "normal",
        is_read: String(!!item.is_read),
        created_at: item.created_at ?? "",
        created_by: JSON.stringify(item.created_by ?? {}),
      },
    });
  }, []);

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
            <Text className="text-slate-900 text-lg font-bold tracking-tight">Circulars</Text>
          </View>
          {meta && (
            <Text className="text-slate-400 text-xs font-medium">{meta.total}</Text>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 100) {
            handleLoadMore();
          }
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
      >
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-slate-400 text-sm mt-3">Loading circulars...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={onRefresh} />
        ) : circulars.length === 0 ? (
          <EmptyState
            icon="megaphone-outline"
            title="No Circulars"
            description="School circulars and announcements will appear here"
          />
        ) : (
          <View className="gap-3 mb-8">
            {circulars.map((item, index) => {
              const ps = PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.normal;
              return (
                <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => handleOpen(item)}>
                  <Card padding="none" className="overflow-hidden">
                    <View className="px-4 py-3.5">
                      <View className="flex-row items-start">
                        <View className="relative">
                          <View className={`w-9 h-9 ${ps.bg} rounded-xl items-center justify-center`}>
                            <Ionicons name="megaphone-outline" size={18} color={ps.color} />
                          </View>
                          {!item.is_read && (
                            <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-white" />
                          )}
                        </View>
                        <View className="flex-1 ml-3">
                          <View className="flex-row items-center justify-between">
                            <Text
                              className={`text-sm flex-1 mr-2 ${item.is_read ? "text-slate-600" : "text-slate-900 font-bold"}`}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            <Badge label={ps.label} variant={item.priority === "high" || item.priority === "urgent" ? "error" : "neutral"} />
                          </View>
                          <Text className="text-slate-400 text-xs mt-1.5 leading-4" numberOfLines={2}>
                            {item.body || item.message || ""}
                          </Text>
                          <View className="flex-row items-center mt-2 gap-3">
                            <Text className="text-slate-400 text-[11px]">{formatRelativeTime(item.created_at)}</Text>
                            {item.created_by && (
                              <Text className="text-slate-400 text-[11px]">by {item.created_by.name}</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}

            {loadingMore && (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text className="text-slate-400 text-xs mt-2">Loading more...</Text>
              </View>
            )}

            {meta && meta.current_page < meta.last_page && !loadingMore && (
              <TouchableOpacity
                className="py-4 items-center"
                activeOpacity={0.7}
                onPress={handleLoadMore}
              >
                <Text className="text-primary-600 text-sm font-semibold">Load More</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
