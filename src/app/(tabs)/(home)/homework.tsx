import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchHomework } from "@/services/api";
import type { HomeworkItem } from "@/types";
import { OfflineState } from "@/components/ui/OfflineState";

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#16A34A", bg: "bg-green-50" },
  inactive: { label: "Inactive", color: "#94A3B8", bg: "bg-slate-100" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

export default function HomeworkScreen() {
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const students = useAuthStore((s) => s.students);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const childUuid = selectedStudentUuid ?? students?.[0]?.uuid;

  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadHomework = useCallback(async () => {
    if (!parentUuid || !childUuid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const result = await fetchHomework(parentUuid, childUuid);
      setHomework(result);
    } catch (err: any) {
      console.error("[Homework] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load homework");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentUuid, childUuid]);

  useEffect(() => {
    loadHomework();
  }, [loadHomework]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHomework();
  }, [loadHomework]);

  const handleOpenAttachment = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {
      console.warn("[Homework] Failed to open attachment");
    }
  };

  const sorted = [...homework].sort((a, b) => new Date(b.assigned_date).getTime() - new Date(a.assigned_date).getTime());

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Homework</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" colors={["#F59E0B"]} />}
      >
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text className="text-slate-400 text-sm mt-3">Loading homework...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={onRefresh} />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No Homework Assigned"
            description="Homework assignments will appear here once published by your teachers"
          />
        ) : (
          <View className="gap-3 mb-8">
            {sorted.map((hw) => {
              const isExpanded = expandedId === hw.id;
              const overdue = isOverdue(hw.due_date);
              const effectiveStatus = overdue ? "overdue" : "active";
              const statusStyle = STATUS_STYLES[hw.status] ?? { label: effectiveStatus === "overdue" ? "Overdue" : "Active", color: effectiveStatus === "overdue" ? "#DC2626" : "#16A34A", bg: effectiveStatus === "overdue" ? "bg-red-50" : "bg-green-50" };

              return (
                <Card key={hw.id} padding="none" className="overflow-hidden">
                  <TouchableOpacity
                    onPress={() => setExpandedId(isExpanded ? null : hw.id)}
                    activeOpacity={0.7}
                  >
                    <View className="px-4 pt-4 pb-3">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-3">
                          <Text className="text-slate-900 text-sm font-bold" numberOfLines={isExpanded ? undefined : 1}>
                            {hw.title || "Homework"}
                          </Text>
                          {hw.subject_name && (
                            <View className="flex-row items-center mt-1.5">
                              <Ionicons name="book-outline" size={12} color="#64748B" />
                              <Text className="text-slate-500 text-xs ml-1">{hw.subject_name}</Text>
                            </View>
                          )}
                        </View>
                        <View className="items-end shrink-0">
                          <View className={`px-2.5 py-1 rounded-lg ${statusStyle.bg}`}>
                            <Text className="text-xs font-bold" style={{ color: statusStyle.color }}>
                              {statusStyle.label}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="flex-row items-center mt-3">
                        <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                        <Text className="text-slate-500 text-xs ml-1.5">Due: {formatDate(hw.due_date)}</Text>
                      </View>

                      {isExpanded && (
                        <>
                          {hw.description ? (
                            <View className="mt-3 pt-3 border-t border-slate-50">
                              <Text className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Description</Text>
                              <Text className="text-slate-700 text-sm leading-5">{hw.description}</Text>
                            </View>
                          ) : null}

                          {hw.attachment_url && (
                            <View className="mt-3 pt-3 border-t border-slate-50">
                              <Text className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Attachment</Text>
                              <TouchableOpacity
                                className="flex-row items-center bg-slate-50 rounded-xl px-3 py-2.5"
                                activeOpacity={0.7}
                                onPress={() => handleOpenAttachment(hw.attachment_url!)}
                              >
                                <View className="w-8 h-8 bg-primary-50 rounded-lg items-center justify-center mr-2.5">
                                  <Ionicons name="document-outline" size={16} color="#3B82F6" />
                                </View>
                                <Text className="text-slate-700 text-sm font-medium flex-1" numberOfLines={1}>View Attachment</Text>
                                <Ionicons name="download-outline" size={18} color="#64748B" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </>
                      )}
                    </View>

                    <View className="bg-slate-50/50 px-4 py-2.5 flex-row items-center justify-between">
                      <Text className="text-slate-400 text-xs">
                        Assigned {formatDate(hw.assigned_date)}
                      </Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#94A3B8"
                      />
                    </View>
                  </TouchableOpacity>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
