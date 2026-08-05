import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { fetchTimetable } from "@/services/api";
import type { TimetableSlot, TimetableData } from "@/types";
import { OfflineState } from "@/components/ui/OfflineState";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3B82F6",
  Science: "#10B981",
  English: "#8B5CF6",
  Hindi: "#F59E0B",
  "Social Studies": "#EC4899",
  "Physical Education": "#06B6D4",
  "Computer Science": "#6366F1",
  Art: "#F97316",
  "General Knowledge": "#14B8A6",
};

function getColor(name: string): string {
  if (SUBJECT_COLORS[name]) return SUBJECT_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#6366F1", "#F97316", "#14B8A6"];
  return colors[Math.abs(hash) % colors.length];
}

function formatTime(timeStr: string): string {
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10);
  const m = parts[1] ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatTimeRange(start: string, end: string): string {
  const sHour = parseInt(start.split(":")[0], 10);
  const eHour = parseInt(end.split(":")[0], 10);
  const sAmPm = sHour >= 12 ? "PM" : "AM";
  const eAmPm = eHour >= 12 ? "PM" : "AM";

  const sFormatted = formatTime(start);
  const eFormatted = formatTime(end);

  if (sAmPm === eAmPm) {
    const sShort = sFormatted.replace(` ${sAmPm}`, "");
    return `${sShort} – ${eFormatted}`;
  }
  return `${sFormatted} – ${eFormatted}`;
}

function isCurrentSlot(slot: TimetableSlot): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startParts = slot.start_time.split(":");
  const endParts = slot.end_time.split(":");
  const startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1] ?? "0", 10);
  const endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1] ?? "0", 10);
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export default function TimetableScreen() {
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const students = useAuthStore((s) => s.students);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const childUuid = selectedStudentUuid ?? students?.[0]?.uuid;

  const [timetable, setTimetable] = useState<TimetableData>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayDow = new Date().getDay();
  const defaultDay = todayDow >= 1 && todayDow <= 7 ? DAY_NAMES[todayDow] : "Monday";
  const [selectedDay, setSelectedDay] = useState(defaultDay);

  const loadTimetable = useCallback(async () => {
    if (!parentUuid || !childUuid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchTimetable(parentUuid, childUuid);
      setTimetable(data.timetable ?? {});
    } catch (err: any) {
      console.error("[Timetable] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load timetable");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentUuid, childUuid]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTimetable();
  }, [loadTimetable]);

  const dayNumbers = useMemo(() => Object.keys(timetable).map(Number).sort(), [timetable]);
  const dayList = useMemo(
    () =>
      dayNumbers.map((d) => ({
        number: d,
        name: DAY_NAMES[d] ?? `Day ${d}`,
        abbr: DAY_ABBR[d] ?? `${d}`,
      })),
    [dayNumbers],
  );

  const dayKey = useMemo(
    () => String(dayNumbers.find((d) => DAY_NAMES[d] === selectedDay) ?? ""),
    [dayNumbers, selectedDay],
  );
  const daySlots = useMemo(() => {
    const slots = dayKey ? (timetable[dayKey] ?? []) : [];
    return [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [timetable, dayKey]);

  const currentSlotIds = useMemo(() => {
    const ids = new Set<number>();
    for (const slot of daySlots) {
      if (isCurrentSlot(slot)) ids.add(slot.id);
    }
    return ids;
  }, [daySlots]);

  const renderDayTabs = () => {
    if (dayList.length === 0) return null;
    return (
      <View className="mt-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {dayList.map((day) => {
            const isActive = selectedDay === day.name;
            return (
              <TouchableOpacity
                key={day.number}
                className={`px-4 py-2 rounded-xl ${isActive ? "bg-white border border-slate-200" : "bg-transparent"}`}
                style={
                  isActive
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 3,
                        elevation: 1,
                      }
                    : undefined
                }
                onPress={() => setSelectedDay(day.name)}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm font-semibold ${isActive ? "text-primary-600" : "text-slate-500"}`}
                >
                  {day.abbr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderSlotCard = (slot: TimetableSlot, index: number) => {
    const subjectName = slot.subject?.name ?? "—";
    const teacherName = slot.teacher?.name ?? "";
    const color = getColor(subjectName);
    const isCurrent = currentSlotIds.has(slot.id);

    return (
      <View key={slot.id ?? index} className="flex-row mb-3">
        <View className="w-[52px] pt-1 shrink-0">
          <Text className="text-slate-400 text-[11px] font-medium leading-tight">
            {formatTime(slot.start_time)}
          </Text>
        </View>

        <View className="items-center mx-[10px] shrink-0">
          <View
            className="w-[10px] h-[10px] rounded-full mt-[6px]"
            style={{ backgroundColor: isCurrent ? color : "#CBD5E1" }}
          />
          {index < daySlots.length - 1 && (
            <View
              className="w-px flex-1 mt-[5px]"
              style={{ backgroundColor: isCurrent ? color + "30" : "#F1F5F9" }}
            />
          )}
        </View>

        <TouchableOpacity className="flex-1 min-w-0" activeOpacity={0.7}>
          <View
            className="rounded-2xl bg-white border border-slate-100 px-3.5 py-2.5"
            style={{
              borderLeftColor: color,
              borderLeftWidth: isCurrent ? 4 : 3,
              ...(isCurrent
                ? {
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    elevation: 2,
                    backgroundColor: "#FAFBFF",
                  }
                : {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 0.5,
                  }),
            }}
          >
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-2">
                  <Text className="text-slate-800 text-sm font-bold leading-tight" numberOfLines={2}>
                    {subjectName}
                  </Text>
                  {isCurrent && (
                    <View className="bg-green-50 rounded-md px-1.5 py-0.5 shrink-0">
                      <Text className="text-green-700 text-[10px] font-bold">NOW</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center mt-1 flex-wrap gap-y-0.5">
                  {teacherName ? (
                    <View className="flex-row items-center">
                      <Ionicons name="person-outline" size={10} color="#94A3B8" />
                      <Text className="text-slate-500 text-[11px] ml-1 leading-tight">{teacherName}</Text>
                    </View>
                  ) : null}
                  {teacherName && slot.room ? (
                    <Text className="text-slate-300 mx-1.5 text-[11px]">•</Text>
                  ) : null}
                  {slot.room ? (
                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={10} color="#94A3B8" />
                      <Text className="text-slate-500 text-[11px] ml-1 leading-tight">{slot.room}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text className="text-slate-400 text-[11px] font-medium shrink-0 leading-tight mt-px">
                {formatTimeRange(slot.start_time, slot.end_time)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Timetable</Text>
        </View>

        {renderDayTabs()}
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={["#8B5CF6"]}
          />
        }
      >
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text className="text-slate-400 text-sm mt-3">Loading timetable...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={onRefresh} />
        ) : daySlots.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 bg-slate-50 rounded-full items-center justify-center mb-5 border border-slate-100">
              <Ionicons name="calendar-outline" size={36} color="#94A3B8" />
            </View>
            <Text className="text-slate-700 text-base font-bold">No Classes Scheduled</Text>
            <Text className="text-slate-400 text-sm mt-1.5 text-center max-w-[240px] leading-5">
              {dayList.length > 0
                ? "No timetable has been set up for this day"
                : "Your timetable hasn't been published yet"}
            </Text>
          </View>
        ) : (
          <View className="relative pl-1">
            {daySlots.map((slot, index) => renderSlotCard(slot, index))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
