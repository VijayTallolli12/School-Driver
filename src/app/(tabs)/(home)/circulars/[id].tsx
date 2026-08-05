import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/store/auth.store";
import { fetchCircularDetail, markCircularRead } from "@/services/api";

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Urgent", color: "#DC2626", bg: "bg-red-50" },
  high: { label: "High", color: "#F59E0B", bg: "bg-amber-50" },
  normal: { label: "Normal", color: "#3B82F6", bg: "bg-blue-50" },
  low: { label: "Low", color: "#64748B", bg: "bg-slate-50" },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }) + " • " + d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CircularDetailScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);

  const id = params.id ? Number(params.id) : null;
  const title = params.title ?? "";
  const body = params.body ?? "";
  const priority = (params.priority ?? "normal") as keyof typeof PRIORITY_META;
  const createdAt = params.created_at ?? "";
  const createdBy = params.created_by ? JSON.parse(params.created_by) : null;
  const isRead = params.is_read === "true";

  const pm = PRIORITY_META[priority] ?? PRIORITY_META.normal;

  useEffect(() => {
    const loadDetail = async () => {
      if (!parentUuid || !id) {
        setLoading(false);
        return;
      }
      try {
        const data = await fetchCircularDetail(parentUuid, id);
        setDetail(data);
      } catch {
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [parentUuid, id]);

  const handleMarkRead = useCallback(async () => {
    if (!parentUuid || !id || isRead) return;
    try {
      await markCircularRead(parentUuid, id);
    } catch {
      // silently fail
    }
  }, [parentUuid, id, isRead]);

  useEffect(() => {
    handleMarkRead();
  }, [handleMarkRead]);

  const handleOpenAttachment = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {
      console.warn("[Circular] Failed to open attachment");
    }
  };

  const circTitle = detail?.title ?? title;
  const circBody = detail?.body ?? detail?.message ?? body;

  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center -ml-1 mr-2" activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color="#475569" />
            </TouchableOpacity>
            <Text className="text-slate-900 text-lg font-bold tracking-tight">Circular</Text>
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="megaphone-outline" size={28} color="#94A3B8" />
          </View>
          <Text className="text-slate-700 text-base font-semibold text-center">Circular Not Found</Text>
          <Text className="text-slate-400 text-sm text-center mt-1.5">This circular could not be loaded</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center -ml-1 mr-2" activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#475569" />
          </TouchableOpacity>
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Circular</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-slate-400 text-sm mt-3">Loading...</Text>
          </View>
        ) : (
          <>
            <Card padding="lg" className="mb-4">
              <View className="flex-row items-start mb-4">
                <View className={`w-12 h-12 ${pm.bg} rounded-xl items-center justify-center mr-4`}>
                  <Ionicons name="megaphone-outline" size={24} color={pm.color} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Badge label={pm.label} variant={priority === "high" || priority === "urgent" ? "error" : "neutral"} />
                    {!isRead && <Badge label="New" variant="info" />}
                  </View>
                  <Text className="text-slate-900 text-lg font-bold mt-2 leading-6">{circTitle}</Text>
                  <Text className="text-slate-400 text-xs mt-2">{formatDate(createdAt)}</Text>
                </View>
              </View>
            </Card>

            <Card padding="lg" className="mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Message</Text>
              <Text className="text-slate-800 text-base leading-6">
                {circBody || "No additional details available."}
              </Text>
            </Card>

            {createdBy && (
              <Card padding="sm" className="mb-4">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-slate-100 rounded-lg items-center justify-center mr-2.5">
                    <Ionicons name="person-outline" size={16} color="#64748B" />
                  </View>
                  <Text className="text-slate-600 text-sm">Posted by <Text className="font-semibold">{createdBy.name}</Text></Text>
                </View>
              </Card>
            )}
          </>
        )}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
