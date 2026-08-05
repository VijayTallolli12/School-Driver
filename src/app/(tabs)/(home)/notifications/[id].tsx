import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { markNotificationRead } from "@/services/api";

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  attendance: { icon: "calendar-outline", color: "#3B82F6", label: "Attendance" },
  fees: { icon: "wallet-outline", color: "#F59E0B", label: "Fees" },
  result: { icon: "school-outline", color: "#8B5CF6", label: "Exam Result" },
  homework: { icon: "book-outline", color: "#F97316", label: "Homework" },
  general: { icon: "megaphone-outline", color: "#64748B", label: "General" },
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

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const [marked, setMarked] = useState(false);
  const [marking, setMarking] = useState(false);

  const id = params.id ? Number(params.id) : null;
  const title = params.title ?? "";
  const body = params.body ?? "";
  const type = (params.type ?? "general") as keyof typeof TYPE_META;
  const isRead = params.is_read === "true";
  const createdAt = params.created_at ?? "";

  const meta = TYPE_META[type] ?? TYPE_META.general;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/notifications" as any);
    }
  }, []);

  const handleMarkAsRead = useCallback(async () => {
    if (id === null || marked || isRead) return;
    setMarking(true);
    try {
      await markNotificationRead(id);
      setMarked(true);
    } catch {
      // silently fail - already read or network issue
    } finally {
      setMarking(false);
    }
  }, [id, marked, isRead]);

  if (!id) {
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
            <Text className="text-slate-900 text-lg font-bold tracking-tight">Notification</Text>
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="notifications-off-outline" size={28} color="#94A3B8" />
          </View>
          <Text className="text-slate-700 text-base font-semibold text-center">Notification Not Found</Text>
          <Text className="text-slate-400 text-sm text-center mt-1.5">This notification could not be loaded</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleBack}
            className="w-8 h-8 items-center justify-center -ml-1 mr-2"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#475569" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-bold tracking-tight">Notification</Text>
          </View>
          {!isRead && !marked && (
            <TouchableOpacity
              onPress={handleMarkAsRead}
              disabled={marking}
              className="flex-row items-center"
              activeOpacity={0.7}
            >
              {marking ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text className="text-primary-600 text-xs font-semibold">Mark Read</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Card padding="lg" className="mb-4">
          <View className="flex-row items-start">
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: meta.color + "15" }}
            >
              <Ionicons name={meta.icon as any} size={24} color={meta.color} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center flex-wrap gap-2 mb-1">
                <Badge label={meta.label} variant={
                  type === "attendance" ? "info" :
                  type === "fees" ? "warning" :
                  type === "result" ? "info" :
                  type === "homework" ? "warning" : "neutral"
                } />
                {!isRead && !marked && (
                  <Badge label="New" variant="info" />
                )}
                {(isRead || marked) && (
                  <Badge label="Read" variant="neutral" />
                )}
              </View>
              <Text className="text-slate-900 text-lg font-bold mt-2 leading-6">
                {title || "Untitled Notification"}
              </Text>
              <Text className="text-slate-400 text-xs mt-2">
                {createdAt ? formatDate(createdAt) : ""}
              </Text>
            </View>
          </View>
        </Card>

        <Card padding="lg" className="mb-6">
          <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">
            Message
          </Text>
          <Text className="text-slate-800 text-base leading-6">
            {body || "No additional details available for this notification."}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
