import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchLeaveRequests } from "@/services/api";
import type { LeaveRequest } from "@/types";
import { OfflineState } from "@/components/ui/OfflineState";

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "Pending", color: "#F59E0B", bg: "bg-amber-50", icon: "time" },
  approved: { label: "Approved", color: "#16A34A", bg: "bg-green-50", icon: "checkmark-circle" },
  rejected: { label: "Rejected", color: "#DC2626", bg: "bg-red-50", icon: "close-circle" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function LeaveListScreen() {
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const students = useAuthStore((s) => s.students);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const childUuid = selectedStudentUuid ?? students?.[0]?.uuid;

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaveRequests = useCallback(async () => {
    if (!parentUuid || !childUuid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const result = await fetchLeaveRequests(parentUuid, childUuid);
      setRequests(result);
    } catch (err: any) {
      console.error("[Leave] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load leave requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentUuid, childUuid]);

  useEffect(() => {
    loadLeaveRequests();
  }, [loadLeaveRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaveRequests();
  }, [loadLeaveRequests]);

  const pending = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;

  const sorted = [...requests].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

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
            <Text className="text-slate-900 text-lg font-bold tracking-tight">Leave Requests</Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center bg-primary-600 px-3.5 py-2 rounded-xl"
            activeOpacity={0.7}
            onPress={() => router.push("/leave/apply" as any)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-white text-xs font-bold ml-1">Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06B6D4" colors={["#06B6D4"]} />
        }
      >
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#06B6D4" />
            <Text className="text-slate-400 text-sm mt-3">Loading leave requests...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={onRefresh} />
        ) : requests.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No Leave Requests"
            description="You haven't submitted any leave requests yet. Tap Apply to submit one."
            actionLabel="Apply for Leave"
            onAction={() => router.push("/leave/apply" as any)}
          />
        ) : (
          <>
            <View className="flex-row gap-2 mb-4">
              <Card padding="sm" className="flex-1 items-center">
                <Text className="text-amber-600 text-lg font-bold">{pending}</Text>
                <Text className="text-slate-400 text-xs mt-0.5">Pending</Text>
              </Card>
              <Card padding="sm" className="flex-1 items-center">
                <Text className="text-green-600 text-lg font-bold">{approved}</Text>
                <Text className="text-slate-400 text-xs mt-0.5">Approved</Text>
              </Card>
              <Card padding="sm" className="flex-1 items-center">
                <Text className="text-red-600 text-lg font-bold">{rejected}</Text>
                <Text className="text-slate-400 text-xs mt-0.5">Rejected</Text>
              </Card>
            </View>

            <View className="gap-3 mb-8">
              {sorted.map((req) => {
                const ss = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending;
                return (
                  <TouchableOpacity
                    key={req.id}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: "/leave/[id]" as any,
                        params: {
                          id: String(req.id),
                          status: req.status,
                          childUuid: childUuid ?? "",
                        },
                      })
                    }
                  >
                    <Card padding="none" className="overflow-hidden">
                      <View className="px-4 py-3.5">
                        <View className="flex-row items-start">
                          <View className={`w-9 h-9 ${ss.bg} rounded-xl items-center justify-center`}>
                            <Ionicons name={ss.icon as any} size={18} color={ss.color} />
                          </View>
                          <View className="flex-1 ml-3">
                            <View className="flex-row items-center justify-between">
                              <Text className="text-slate-900 text-sm font-bold flex-1 mr-2" numberOfLines={1}>
                                {req.leave_type} Leave
                              </Text>
                              <View className={`px-2.5 py-1 rounded-lg ${ss.bg} shrink-0`}>
                                <Text className="text-xs font-bold" style={{ color: ss.color }}>{ss.label}</Text>
                              </View>
                            </View>
                            {req.student_name && (
                              <View className="flex-row items-center mt-1">
                                <Ionicons name="person-outline" size={12} color="#64748B" />
                                <Text className="text-slate-500 text-xs ml-1">{req.student_name}</Text>
                              </View>
                            )}
                            <View className="flex-row items-center mt-1.5 gap-3">
                              <View className="flex-row items-center">
                                <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
                                <Text className="text-slate-400 text-xs ml-1">{formatDate(req.from_date)}</Text>
                              </View>
                              <Ionicons name="arrow-forward" size={12} color="#CBD5E1" />
                              <Text className="text-slate-400 text-xs">{formatDate(req.to_date)}</Text>
                            </View>
                            <Text className="text-slate-500 text-xs mt-1.5 leading-4" numberOfLines={1}>
                              {req.reason}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
