import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { useBrandingStore } from "@/store/branding.store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OfflineState } from "@/components/ui/OfflineState";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { fetchDashboard } from "@/services/api";
import type { DashboardData, NotificationItem } from "@/types";

const MODULES = [
  { icon: "calendar-outline" as const, label: "Attendance", color: "#3B82F6", route: "attendance" },
  { icon: "cash-outline" as const, label: "Fees", color: "#10B981", route: "fees" },
  { icon: "megaphone-outline" as const, label: "Circulars", color: "#EF4444", route: "circulars" },
  { icon: "time-outline" as const, label: "Timetable", color: "#8B5CF6", route: "timetable" },
  { icon: "trophy-outline" as const, label: "Results", color: "#EC4899", route: "results" },
  { icon: "book-outline" as const, label: "Homework", color: "#F59E0B", route: "homework" },
  { icon: "calendar-outline" as const, label: "Calendar", color: "#06B6D4", route: "calendar" },
  { icon: "folder-open-outline" as const, label: "Documents", color: "#6B7280", route: "documents" },
  { icon: "document-text-outline" as const, label: "Leave", color: "#06B6D4", route: "leave" },
  { icon: "bus-outline" as const, label: "Transport", color: "#14B8A6", route: "transport" },
];

const LEAVE_COLORS = {
  pending: { bg: "bg-amber-500" },
  approved: { bg: "bg-green-500" },
};

const NOTIF_TYPE_CONFIG: Record<string, { icon: string; bg: string; color: string }> = {
  fees: { icon: "wallet-outline", bg: "bg-amber-50", color: "#F59E0B" },
  attendance: { icon: "calendar-outline", bg: "bg-blue-50", color: "#3B82F6" },
  result: { icon: "school-outline", bg: "bg-purple-50", color: "#8B5CF6" },
  general: { icon: "megaphone-outline", bg: "bg-slate-50", color: "#64748B" },
  homework: { icon: "book-outline", bg: "bg-orange-50", color: "#F97316" },
};

function formatCompactCurrency(amount: number): string {
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

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffHrs = Math.floor(diffMs / 3600000);
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const students = useAuthStore((s) => s.students) ?? [];
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const setSelectedStudentUuid = useAuthStore((s) => s.setSelectedStudentUuid);
  const hasStudents = students.length > 0;
  const branding = useBrandingStore((s) => s.branding);
  const refreshBranding = useBrandingStore((s) => s.refreshBranding);

  const loadDashboard = useCallback(async () => {
    if (!parentUuid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const result = await fetchDashboard(parentUuid, selectedStudentUuid ?? undefined);
      setData(result);
    } catch (err: any) {
      console.error("[Dashboard] load error:", err);
      setError(err?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [parentUuid, selectedStudentUuid]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), refreshBranding()]);
    setRefreshing(false);
  }, [loadDashboard, refreshBranding]);

  const notificationCount = data?.notifications?.filter((n) => !n.is_read).length ?? 0;
  const attSummary = data?.attendance_summary;
  const feesSummary = data?.fees_summary;
  const notifs = data?.notifications ?? [];
  const examsSummary = data?.exam_results_summary;
  const leaveSummary = data?.leave_summary;

  const handleOpenNotification = useCallback((item: NotificationItem) => {
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

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {branding.schoolLogo ? (
              <View className="w-9 h-9 rounded-xl items-center justify-center mr-2.5 overflow-hidden bg-white border border-slate-100">
                <Image
                  source={{ uri: branding.schoolLogo as string }}
                  className="w-8 h-8"
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View
                className="w-9 h-9 rounded-xl items-center justify-center mr-2.5"
                style={{ backgroundColor: `${branding.primaryColor}14` }}
              >
                <Ionicons name="school-outline" size={18} color={branding.primaryColor} />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-slate-500 text-xs font-medium">{branding.schoolName || "School ERP"}</Text>
              <Text className="text-slate-900 text-lg font-bold mt-0.5">
                {user?.name ?? "Parent"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            className="w-9 h-9 bg-slate-100 rounded-full items-center justify-center relative"
            activeOpacity={0.7}
            onPress={() => router.push("/notifications" as any)}
          >
            <Ionicons name="notifications-outline" size={20} color="#64748B" />
            {notificationCount > 0 && (
              <View className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-status-error rounded-full items-center justify-center">
                <Text className="text-white text-[9px] font-bold">{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View className="mt-3">
          <ChildSwitcher
            selectedUuid={selectedStudentUuid}
            onSelect={(uuid) => setSelectedStudentUuid(uuid)}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />
        }
      >
        {loading ? (
          <View className="items-center justify-center pt-24 pb-8">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-slate-400 text-sm mt-3">Loading dashboard...</Text>
          </View>
        ) : error ? (
          <OfflineState
            message={error}
            onRetry={onRefresh}
          />
        ) : !hasStudents ? (
          <View className="items-center justify-center pt-20 pb-8">
            <View className="w-24 h-24 bg-primary-50 rounded-full items-center justify-center mb-6">
              <Ionicons name="people-outline" size={48} color="#3B82F6" />
            </View>
            <Text className="text-slate-800 text-lg font-bold text-center mb-2">No Students Linked</Text>
            <Text className="text-slate-400 text-sm text-center leading-5 max-w-[260px] mb-6">
              Your account doesn't have any students linked yet. Please contact the school administrator.
            </Text>
            <TouchableOpacity
              className="flex-row items-center bg-primary-600 px-6 py-3 rounded-xl"
              activeOpacity={0.7}
              onPress={onRefresh}
            >
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text className="text-white font-semibold text-sm ml-2">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Section: Overview ── */}
            <View className="pt-5 pb-1">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Overview
              </Text>
            </View>

            {/* Metric Cards — value FIRST (dominates), label below, overflow-safe */}
            <View className="flex-row gap-2.5 mt-3 mb-6">
              <Card padding="md" className="flex-1">
                <View className="items-center">
                  <Text
                    className="text-slate-900 text-2xl font-bold"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ lineHeight: 30 }}
                  >
                    {attSummary ? `${Math.round(attSummary.percentage)}%` : "—"}
                  </Text>
                  <View className="flex-row items-center gap-1 mt-1.5">
                    <View className="w-5 h-5 bg-green-50 rounded-md items-center justify-center">
                      <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                    </View>
                    <Text
                      className="text-slate-500 text-[11px] font-medium"
                      numberOfLines={1}
                    >
                      Attendance
                    </Text>
                  </View>
                </View>
              </Card>
              <Card padding="md" className="flex-1">
                <View className="items-center">
                  <Text
                    className="text-slate-900 text-2xl font-bold"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ lineHeight: 30 }}
                  >
                    {feesSummary ? formatCompactCurrency(feesSummary.pending) : "—"}
                  </Text>
                  <View className="flex-row items-center gap-1 mt-1.5">
                    <View className="w-5 h-5 bg-amber-50 rounded-md items-center justify-center">
                      <Ionicons name="wallet-outline" size={12} color="#F59E0B" />
                    </View>
                    <Text
                      className="text-slate-500 text-[11px] font-medium"
                      numberOfLines={1}
                    >
                      Due Fees
                    </Text>
                  </View>
                </View>
              </Card>
              <Card padding="md" className="flex-1">
                <View className="items-center">
                  <Text
                    className="text-slate-900 text-2xl font-bold"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ lineHeight: 30 }}
                  >
                    {examsSummary ? `${examsSummary.subjects}` : "—"}
                  </Text>
                  <View className="flex-row items-center gap-1 mt-1.5">
                    <View className="w-5 h-5 bg-purple-50 rounded-md items-center justify-center">
                      <Ionicons name="book-outline" size={12} color="#8B5CF6" />
                    </View>
                    <Text
                      className="text-slate-500 text-[11px] font-medium"
                      numberOfLines={1}
                    >
                      Subjects
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            {/* ── Section: Quick Actions ── */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Quick Actions
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2.5 mb-6">
              {MODULES.map((module) => {
                const isLeave = module.label === "Leave";
                return (
                  <TouchableOpacity
                    key={module.label}
                    className="w-[48%] bg-white rounded-2xl px-3.5 py-3 border border-slate-100 flex-row items-center gap-2.5"
                    activeOpacity={0.7}
                    onPress={() => {
                      if (module.route) {
                        router.push(`/${module.route}` as any);
                      }
                    }}
                  >
                    <View
                      className="w-9 h-9 rounded-xl items-center justify-center shrink-0"
                      style={{ backgroundColor: module.color + "12" }}
                    >
                      <Ionicons name={module.icon} size={18} color={module.color} />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-slate-800 font-semibold text-sm" numberOfLines={1}>
                        {module.label}
                      </Text>
                      {isLeave && leaveSummary && (
                        <View className="flex-row items-center gap-1.5 mt-1">
                          <View className="flex-row items-center">
                            <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />
                            <Text className="text-slate-400 text-[10px]">{leaveSummary.pending}</Text>
                          </View>
                          <View className="flex-row items-center">
                            <View className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />
                            <Text className="text-slate-400 text-[10px]">{leaveSummary.approved}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Section: Recent Notifications ── */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Recent Notifications
              </Text>
              <TouchableOpacity onPress={() => router.push("/notifications" as any)}>
                <Text className="text-primary-600 text-xs font-semibold">See All</Text>
              </TouchableOpacity>
            </View>
            <Card padding="none" className="overflow-hidden mb-6">
              {notifs.length === 0 ? (
                <View className="px-4 py-6 items-center">
                  <Ionicons name="notifications-off-outline" size={24} color="#CBD5E1" />
                  <Text className="text-slate-400 text-sm mt-2">No notifications</Text>
                </View>
              ) : (
                notifs.slice(0, 3).map((item, index) => {
                  const config = NOTIF_TYPE_CONFIG[item.type] ?? NOTIF_TYPE_CONFIG.general;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      className={`flex-row items-center px-4 py-3.5 ${index < Math.min(notifs.length, 3) - 1 ? "border-b border-slate-50" : ""}`}
                      activeOpacity={0.7}
                      onPress={() => handleOpenNotification(item)}
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
                        <Text className="text-slate-800 text-sm font-semibold" numberOfLines={1}>{item.title}</Text>
                        <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>{item.body}</Text>
                      </View>
                      <Text className="text-slate-400 text-[11px] ml-2 shrink-0">{formatRelativeTime(item.created_at)}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </Card>

            {/* ── Section: Academic Performance ── */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                Academic Performance
              </Text>
              <TouchableOpacity onPress={() => router.push("/results" as any)}>
                <Text className="text-primary-600 text-xs font-semibold">View All</Text>
              </TouchableOpacity>
            </View>
            <Card padding="lg" className="mb-8">
              {examsSummary ? (
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text className="text-slate-500 text-xs font-medium uppercase tracking-wider">Average Score</Text>
                    <Text className="text-slate-900 text-3xl font-bold mt-1" numberOfLines={1}>
                      {examsSummary.average}%
                    </Text>
                    <Text className="text-slate-400 text-xs mt-1" numberOfLines={1}>
                      {examsSummary.subjects} subjects • {examsSummary.obtained_marks}/{examsSummary.total_marks} marks
                    </Text>
                  </View>
                  <View className="w-14 h-14 bg-primary-50 rounded-2xl items-center justify-center shrink-0">
                    <Text className="text-primary-600 text-xl font-bold">
                      {examsSummary.average >= 90 ? "A+" : examsSummary.average >= 80 ? "A" : examsSummary.average >= 70 ? "B+" : examsSummary.average >= 60 ? "B" : "C"}
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="items-center py-2">
                  <Ionicons name="hourglass-outline" size={24} color="#CBD5E1" />
                  <Text className="text-slate-400 text-sm mt-2">No performance data yet</Text>
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
