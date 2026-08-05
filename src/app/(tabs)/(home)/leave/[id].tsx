import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/store/auth.store";
import { fetchLeaveRequestDetail } from "@/services/api";
import type { LeaveRequest } from "@/types";
import { OfflineState } from "@/components/ui/OfflineState";

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "Pending", color: "#F59E0B", bg: "bg-amber-50", icon: "time" },
  approved: { label: "Approved", color: "#16A34A", bg: "bg-green-50", icon: "checkmark-circle" },
  rejected: { label: "Rejected", color: "#DC2626", bg: "bg-red-50", icon: "close-circle" },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function LeaveDetailScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<LeaveRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const id = params.id ? Number(params.id) : null;
  const childUuid = params.childUuid ?? selectedStudentUuid ?? "";

  const loadDetail = useCallback(async () => {
    if (!parentUuid || !childUuid || !id) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchLeaveRequestDetail(parentUuid, childUuid, id);
      setDetail(data);
    } catch (err: any) {
      console.error("[Leave Detail] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load leave details");
    } finally {
      setLoading(false);
    }
  }, [parentUuid, childUuid, id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center -ml-1 mr-2" activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color="#475569" />
            </TouchableOpacity>
            <Text className="text-slate-900 text-lg font-bold tracking-tight">Leave Details</Text>
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="document-text-outline" size={28} color="#94A3B8" />
          </View>
          <Text className="text-slate-700 text-base font-semibold text-center">Not Found</Text>
          <Text className="text-slate-400 text-sm text-center mt-1.5">This leave request could not be loaded</Text>
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
          <View className="flex-1">
            <Text className="text-slate-900 text-lg font-bold tracking-tight">Leave Details</Text>
          </View>
          {detail?.status === "pending" && (
            <TouchableOpacity
              className="flex-row items-center bg-primary-600 px-3.5 py-2 rounded-xl"
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/leave/apply" as any,
                  params: {
                    editId: String(detail.id),
                    leaveType: detail.leave_type,
                    fromDate: detail.from_date?.split("T")[0],
                    toDate: detail.to_date?.split("T")[0],
                    reason: detail.reason,
                    childUuid: childUuid ?? "",
                  },
                })
              }
            >
              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
              <Text className="text-white text-xs font-bold ml-1">Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#06B6D4" />
            <Text className="text-slate-400 text-sm mt-3">Loading details...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={loadDetail} />
        ) : detail ? (
          <>
            <Card padding="lg" className="mb-4">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-slate-500 text-xs font-medium uppercase tracking-wider">Status</Text>
                  <View className="mt-1.5">
                    <Badge
                      label={STATUS_META[detail.status]?.label ?? detail.status}
                      variant={detail.status === "approved" ? "success" : detail.status === "rejected" ? "error" : "warning"}
                    />
                  </View>
                </View>
                <View className="w-14 h-14 bg-cyan-50 rounded-2xl items-center justify-center">
                  <Ionicons name="document-text-outline" size={24} color="#06B6D4" />
                </View>
              </View>
              <Text className="text-slate-900 text-lg font-bold">{detail.leave_type} Leave</Text>
            </Card>

            <Card padding="none" className="overflow-hidden mb-4">
              {[
                {
                  icon: "person-outline",
                  label: "Student",
                  value: detail.student_name || "—",
                },
                {
                  icon: "calendar-outline",
                  label: "From Date",
                  value: formatDateShort(detail.from_date),
                },
                {
                  icon: "calendar-outline",
                  label: "To Date",
                  value: formatDateShort(detail.to_date),
                },
                {
                  icon: "file-tray-outline",
                  label: "Leave Type",
                  value: detail.leave_type,
                },
                {
                  icon: "calendar-outline",
                  label: "Request Date",
                  value: formatDate(detail.created_at),
                },
              ].map((item, index, arr) => (
                <View
                  key={item.label}
                  className={`flex-row items-center px-4 py-3.5 ${index < arr.length - 1 ? "border-b border-slate-50" : ""}`}
                >
                  <View className="w-8 h-8 bg-slate-50 rounded-lg items-center justify-center mr-3">
                    <Ionicons name={item.icon as any} size={16} color="#64748B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-400 text-xs">{item.label}</Text>
                    <Text className="text-slate-700 text-sm font-medium mt-0.5">{item.value}</Text>
                  </View>
                </View>
              ))}
            </Card>

            {/* Reason */}
            <Card padding="lg" className="mb-4">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Reason</Text>
              <Text className="text-slate-800 text-base leading-6">{detail.reason || "No reason provided"}</Text>
            </Card>

            {/* Approved By + Remarks  */}
            {(detail.status === "approved" || detail.status === "rejected") && (
              <Card padding="none" className="overflow-hidden mb-6">
                {detail.approved_by && (
                  <View className="flex-row items-center px-4 py-3.5 border-b border-slate-50">
                    <View className="w-8 h-8 bg-slate-50 rounded-lg items-center justify-center mr-3">
                      <Ionicons name="person-outline" size={16} color="#64748B" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-400 text-xs">Approved By</Text>
                      <Text className="text-slate-700 text-sm font-medium mt-0.5">{detail.approved_by}</Text>
                    </View>
                  </View>
                )}
                {detail.remarks && (
                  <View className="px-4 py-3.5">
                    <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Remarks</Text>
                    <Text className="text-slate-700 text-sm leading-5">{detail.remarks}</Text>
                  </View>
                )}
              </Card>
            )}
          </>
        ) : (
          <View className="items-center justify-center pt-20">
            <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="document-text-outline" size={28} color="#94A3B8" />
            </View>
            <Text className="text-slate-600 text-base font-semibold">Leave Request Not Found</Text>
          </View>
        )}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
