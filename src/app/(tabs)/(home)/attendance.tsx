import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OfflineState } from "@/components/ui/OfflineState";
import { fetchAttendance } from "@/services/api";
import type { AttendanceRecord } from "@/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceScreen() {
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const students = useAuthStore((s) => s.students);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const childUuid = selectedStudentUuid ?? students?.[0]?.uuid;

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<{ total_days: number; counts: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    if (!parentUuid || !childUuid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchAttendance(parentUuid, childUuid, selectedMonth, selectedYear);
      setRecords(data.records ?? []);
      setSummary(data.summary);
     } catch (err: any) {
       console.error("[Attendance] load error:", err);
       setError(err?.message ?? "Failed to load attendance");
     } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentUuid, childUuid, selectedMonth, selectedYear]);

  useEffect(() => {
    setLoading(true);
    loadAttendance();
  }, [loadAttendance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAttendance();
  }, [loadAttendance]);

  const recordMap = new Map<string, AttendanceRecord>();
  records.forEach((r) => {
    const day = new Date(r.attendance_date).getDate();
    recordMap.set(String(day), r);
  });

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();

  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const rec = recordMap.get(String(dayNum));
    const isFuture = dayNum > now.getDate() && selectedMonth >= now.getMonth() + 1 && selectedYear >= now.getFullYear();
    return { date: dayNum, record: rec ?? null, isFuture };
  });

  const present = summary?.counts?.present ?? 0;
  const absent = summary?.counts?.absent ?? 0;
  const late = summary?.counts?.late ?? 0;
  const halfDay = summary?.counts?.half_day ?? 0;
  const total = summary?.total_days ?? 0;
  const percentage = total > 0 ? Math.round(((present + late + halfDay) / total) * 100) : 0;

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "present": return "bg-green-500";
      case "absent": return "bg-red-500";
      case "late": return "bg-amber-500";
      case "half_day": return "bg-blue-500";
      default: return "bg-slate-100";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "present": return "checkmark-circle";
      case "absent": return "close-circle";
      case "late": return "time";
      case "half_day": return "remove-circle";
      default: return "ellipse-outline";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "present": return "Present";
      case "absent": return "Absent";
      case "late": return "Late";
      case "half_day": return "Half Day";
      default: return "";
    }
  };

  const selectedRecord = selectedDay ? recordMap.get(String(selectedDay)) : null;

  const prevMonth = () => {
    setSelectedMonth((m) => {
      if (m === 1) {
        setSelectedYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setSelectedMonth((m) => {
      if (m === 12) {
        setSelectedYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
    setSelectedDay(null);
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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Attendance</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" colors={["#3B82F6"]} />}
      >
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-slate-400 text-sm mt-3">Loading attendance...</Text>
          </View>
        ) : error ? (
          <View className="items-center justify-center pt-20 pb-8">
            <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
              <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
            </View>
            <Text className="text-slate-800 text-base font-semibold mb-2">Connection Error</Text>
            <Text className="text-slate-400 text-sm text-center mb-6">{error}</Text>
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
            <View className="flex-row gap-3 mb-4">
              <Card padding="md" className="flex-1 items-center">
                <Text className="text-green-600 text-xl font-bold">{present + late + halfDay}</Text>
                <Text className="text-slate-400 text-xs mt-1">Present</Text>
              </Card>
              <Card padding="md" className="flex-1 items-center">
                <Text className="text-red-600 text-xl font-bold">{absent}</Text>
                <Text className="text-slate-400 text-xs mt-1">Absent</Text>
              </Card>
              <Card padding="md" className="flex-1 items-center">
                <Text className="text-amber-600 text-xl font-bold">{late}</Text>
                <Text className="text-slate-400 text-xs mt-1">Late</Text>
              </Card>
            </View>

            <Card padding="lg" className="mb-4">
              <View className="flex-row items-center">
                <View className="w-20 h-20 rounded-full bg-slate-100 items-center justify-center mr-4 relative">
                  <View
                    className="absolute inset-0 rounded-full border-4"
                    style={{
                      borderColor: percentage >= 75 ? "#16A34A" : percentage >= 50 ? "#F59E0B" : "#DC2626",
                      borderLeftColor: "#E2E8F0",
                      borderBottomColor: "#E2E8F0",
                      transform: [{ rotate: "-45deg" }],
                    }}
                  />
                  <View className="w-[60px] h-[60px] bg-white rounded-full items-center justify-center">
                    <Text className="text-slate-900 text-xl font-bold">{percentage}%</Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 text-base font-bold">Monthly Attendance</Text>
                  <Text className="text-slate-400 text-xs mt-1">{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
                  <View className="flex-row items-center mt-2">
                    <Badge label={`${percentage}%`} variant={percentage >= 75 ? "success" : "warning"} />
                    <Text className="text-slate-400 text-xs ml-2">
                      {percentage >= 75 ? "Good" : "Needs Improvement"}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            <View className="flex-row justify-center gap-4 mb-4">
              {[
                { label: "Present", color: "bg-green-500" },
                { label: "Absent", color: "bg-red-500" },
                { label: "Late", color: "bg-amber-500" },
              ].map((item) => (
                <View key={item.label} className="flex-row items-center">
                  <View className={`w-2.5 h-2.5 rounded-full ${item.color} mr-1.5`} />
                  <Text className="text-slate-500 text-xs">{item.label}</Text>
                </View>
              ))}
            </View>

            <Card padding="md" className="mb-8">
              <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity className="w-8 h-8 bg-slate-100 rounded-lg items-center justify-center" onPress={prevMonth}>
                  <Ionicons name="chevron-back" size={18} color="#64748B" />
                </TouchableOpacity>
                <Text className="text-slate-900 text-base font-bold">{MONTHS[selectedMonth - 1]} {selectedYear}</Text>
                <TouchableOpacity className="w-8 h-8 bg-slate-100 rounded-lg items-center justify-center" onPress={nextMonth}>
                  <Ionicons name="chevron-forward" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View className="flex-row mb-2">
                {DAYS.map((day) => (
                  <View key={day} className="flex-1 items-center py-1">
                    <Text className="text-slate-400 text-[11px] font-medium">{day}</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <View key={`empty-${i}`} className="w-[14.28%] aspect-square p-1" />
                ))}
                {calendarDays.map((day) => {
                  const status = day.record?.status ?? (day.isFuture ? "future" : null);
                  return (
                    <TouchableOpacity
                      key={day.date}
                      className="w-[14.28%] aspect-square p-1"
                      onPress={() => setSelectedDay(day.date)}
                    >
                      <View className={`flex-1 rounded-xl items-center justify-center ${selectedDay === day.date ? "border-2 border-primary-500" : ""} ${day.isFuture ? "opacity-30" : ""}`}>
                        {status && status !== "future" ? (
                          <Ionicons
                            name={getStatusIcon(status) as any}
                            size={20}
                            color={status === "present" ? "#16A34A" : status === "absent" ? "#DC2626" : "#F59E0B"}
                          />
                        ) : (
                          <Text className={`text-xs ${day.isFuture ? "text-slate-300" : "text-slate-600"}`}>
                            {day.date}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {selectedDay && (
              <Card padding="md" className="mb-8">
                <Text className="text-slate-900 text-sm font-bold mb-2">
                  {DAYS[new Date(selectedYear, selectedMonth - 1, selectedDay).getDay()]}, {selectedDay} {MONTHS[selectedMonth - 1]} {selectedYear}
                </Text>
                {selectedRecord ? (
                  <View className="flex-row items-center">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${selectedRecord.status === "present" ? "bg-green-50" : selectedRecord.status === "absent" ? "bg-red-50" : "bg-amber-50"}`}>
                      <Ionicons
                        name={getStatusIcon(selectedRecord.status) as any}
                        size={22}
                        color={selectedRecord.status === "present" ? "#16A34A" : selectedRecord.status === "absent" ? "#DC2626" : "#F59E0B"}
                      />
                    </View>
                    <View>
                      <Text className="text-slate-800 text-sm font-semibold">
                        {getStatusLabel(selectedRecord.status)}
                      </Text>
                      {selectedRecord.remark && (
                        <Text className="text-slate-400 text-xs mt-0.5">{selectedRecord.remark}</Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-slate-100 rounded-xl items-center justify-center mr-3">
                      <Ionicons name="ellipse-outline" size={22} color="#CBD5E1" />
                    </View>
                    <Text className="text-slate-400 text-sm">No record / Holiday</Text>
                  </View>
                )}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
