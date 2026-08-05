import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchCalendar } from "@/services/api";
import type { CalendarEvent } from "@/types";
import { OfflineState } from "@/components/ui/OfflineState";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EVENT_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string; bg: string }> = {
  holiday: { icon: "umbrella-outline", color: "#16A34A", label: "Holiday", bg: "bg-green-50" },
  exam: { icon: "school-outline", color: "#8B5CF6", label: "Exam", bg: "bg-purple-50" },
  ptm: { icon: "people-outline", color: "#3B82F6", label: "PTM", bg: "bg-blue-50" },
  sports_day: { icon: "football-outline", color: "#F59E0B", label: "Sports Day", bg: "bg-amber-50" },
  annual_day: { icon: "star-outline", color: "#EC4899", label: "Annual Day", bg: "bg-pink-50" },
  school_event: { icon: "calendar-outline", color: "#06B6D4", label: "School Event", bg: "bg-cyan-50" },
  field_trip: { icon: "bus-outline", color: "#8B5CF6", label: "Field Trip", bg: "bg-purple-50" },
  workshop: { icon: "build-outline", color: "#F97316", label: "Workshop", bg: "bg-orange-50" },
  other: { icon: "ellipsis-horizontal-outline", color: "#64748B", label: "Other", bg: "bg-slate-100" },
};

const EVENT_TYPES = ["", "holiday", "exam", "ptm", "sports_day", "annual_day", "school_event", "field_trip", "workshop"];
const EVENT_TYPE_LABELS: Record<string, string> = {
  "": "All Types",
  holiday: "Holidays",
  exam: "Exams",
  ptm: "PTM",
  sports_day: "Sports Day",
  annual_day: "Annual Day",
  school_event: "School Events",
  field_trip: "Field Trips",
  workshop: "Workshops",
};

function formatEventDate(startDate: string, endDate?: string | null): string {
  const d = new Date(startDate);
  const dateStr = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  if (endDate && endDate !== startDate) {
    const e = new Date(endDate);
    const endStr = e.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return `${dateStr} - ${endStr}`;
  }
  return dateStr;
}

export default function CalendarScreen() {
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const students = useAuthStore((s) => s.students);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const childUuid = selectedStudentUuid ?? students?.[0]?.uuid;

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [eventType, setEventType] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCalendar = useCallback(async () => {
    if (!parentUuid || !childUuid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const result = await fetchCalendar(parentUuid, childUuid, selectedMonth, selectedYear, eventType || undefined);
      setEvents(result);
    } catch (err: any) {
      console.error("[Calendar] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load calendar");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentUuid, childUuid, selectedMonth, selectedYear, eventType]);

  useEffect(() => {
    setLoading(true);
    loadCalendar();
  }, [loadCalendar]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCalendar();
  }, [loadCalendar]);

  const prevMonth = () => {
    setSelectedMonth((m) => {
      if (m === 1) {
        setSelectedYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  };
  const nextMonth = () => {
    setSelectedMonth((m) => {
      if (m === 12) {
        setSelectedYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  };

  const groupedByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    const key = ev.start_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Academic Calendar</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
      >
        <Card padding="md" className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity className="w-8 h-8 bg-slate-100 rounded-lg items-center justify-center" onPress={prevMonth}>
              <Ionicons name="chevron-back" size={18} color="#64748B" />
            </TouchableOpacity>
            <Text className="text-slate-900 text-base font-bold">{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
            <TouchableOpacity className="w-8 h-8 bg-slate-100 rounded-lg items-center justify-center" onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {EVENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  className={`px-3 py-2 rounded-lg ${eventType === type ? "bg-primary-600" : "bg-slate-100"}`}
                  onPress={() => setEventType(type)}
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs font-semibold ${eventType === type ? "text-white" : "text-slate-600"}`}>
                    {EVENT_TYPE_LABELS[type] ?? type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Card>

        {loading ? (
          <View className="items-center justify-center pt-16">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-slate-400 text-sm mt-3">Loading calendar...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={onRefresh} />
        ) : events.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No Events"
            description="No events found for this month and filter selection"
          />
        ) : (
          <View className="mb-8">
            {sortedDates.map((date) => {
              const dayEvents = groupedByDate[date];
              return (
                <View key={date} className="mb-4">
                  <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">
                    {new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                  </Text>
                  <View className="gap-2">
                    {dayEvents.map((ev) => {
                      const config = EVENT_TYPE_CONFIG[ev.event_type] ?? EVENT_TYPE_CONFIG.other;
                      return (
                        <Card key={ev.id} padding="none" className="overflow-hidden">
                          <View className="flex-row">
                            <View className="w-1" style={{ backgroundColor: config.color }} />
                            <View className="flex-1 px-4 py-3">
                              <View className="flex-row items-center gap-2 mb-1">
                                <View className={`w-8 h-8 ${config.bg} rounded-lg items-center justify-center`}>
                                  <Ionicons name={config.icon as any} size={16} color={config.color} />
                                </View>
                                <View className="flex-1">
                                  <Text className="text-slate-900 text-sm font-bold">{ev.title}</Text>
                                  <Text className="text-slate-500 text-xs mt-0.5">
                                    {formatEventDate(ev.start_date, ev.end_date)}
                                  </Text>
                                </View>
                                <Badge label={config.label} variant="info" />
                              </View>
                              {ev.description && (
                                <Text className="text-slate-600 text-sm mt-2 leading-5" numberOfLines={2}>
                                  {ev.description}
                                </Text>
                              )}
                              {ev.location && (
                                <View className="flex-row items-center mt-2">
                                  <Ionicons name="location-outline" size={14} color="#64748B" />
                                  <Text className="text-slate-500 text-xs ml-1">{ev.location}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </Card>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
