import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fetchExamResults } from "@/services/api";
import type { ExamResultRecord } from "@/types";
import { OfflineState } from "@/components/ui/OfflineState";

const getGradeFromPercentage = (percentage: number) => {
  if (percentage >= 90) return { grade: "A+", color: "#16A34A" };
  if (percentage >= 80) return { grade: "A", color: "#22C55E" };
  if (percentage >= 70) return { grade: "B+", color: "#3B82F6" };
  if (percentage >= 60) return { grade: "B", color: "#F59E0B" };
  if (percentage >= 50) return { grade: "C", color: "#F97316" };
  return { grade: "D", color: "#DC2626" };
};

interface GroupedExam {
  label: string;
  results: ExamResultRecord[];
}

export default function ResultsScreen() {
  const [groupedExams, setGroupedExams] = useState<GroupedExam[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentUuid = useAuthStore((s) => s.parentUuid);
  const students = useAuthStore((s) => s.students);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const childUuid = selectedStudentUuid ?? students?.[0]?.uuid;

  const loadResults = useCallback(async () => {
    if (!parentUuid || !childUuid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const data = await fetchExamResults(parentUuid, childUuid);
      const groups: GroupedExam[] = Object.entries(data.results_by_academic_year).map(([year, results]) => ({
        label: year,
        results: results as unknown as ExamResultRecord[],
      }));
      setGroupedExams(groups);
      if (selectedIndex >= groups.length) setSelectedIndex(0);
    } catch (err: any) {
      console.error("[Results] load error:", err);
      setError(err?.response?.data?.message ?? "Failed to load results");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentUuid, childUuid]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadResults();
  }, [loadResults]);

  const currentGroup = groupedExams[selectedIndex];
  const results = currentGroup?.results ?? [];

  const totalMarks = results.reduce((s, r) => s + (r.maximum_marks ?? 0), 0);
  const obtainedMarks = results.reduce((s, r) => s + (r.marks_obtained ?? 0), 0);
  const overallPct = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
  const gradeInfo = getGradeFromPercentage(overallPct);

  const uniqueExams = new Map<string, { label: string; results: ExamResultRecord[] }>();
  results.forEach((r) => {
    const name = r.exam_name || "Unknown Exam";
    if (!uniqueExams.has(name)) uniqueExams.set(name, { label: name, results: [] });
    uniqueExams.get(name)!.results.push(r);
  });
  const examGroups = Array.from(uniqueExams.values());

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Exams & Results</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC4899" colors={["#EC4899"]} />}
      >
        {loading ? (
          <View className="items-center justify-center pt-24">
            <ActivityIndicator size="large" color="#EC4899" />
            <Text className="text-slate-400 text-sm mt-3">Loading results...</Text>
          </View>
        ) : error ? (
          <OfflineState message={error} onRetry={onRefresh} />
        ) : groupedExams.length === 0 ? (
          <View className="items-center justify-center py-16">
            <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="document-text-outline" size={28} color="#94A3B8" />
            </View>
            <Text className="text-slate-600 text-base font-semibold">No Results Yet</Text>
            <Text className="text-slate-400 text-sm mt-1 text-center">Exam results will appear here once published</Text>
          </View>
        ) : (
          <>
            {groupedExams.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {groupedExams.map((group, index) => (
                  <TouchableOpacity
                    key={group.label}
                    className={`px-4 py-3 rounded-xl mr-3 ${selectedIndex === index ? "bg-primary-600" : "bg-white border border-slate-100"}`}
                    onPress={() => setSelectedIndex(index)}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-sm font-semibold ${selectedIndex === index ? "text-white" : "text-slate-800"}`}>
                      {group.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {results.length > 0 && (
              <>
                <Card padding="lg" className="mb-4">
                  <View className="flex-row items-center justify-between mb-4">
                    <View>
                      <Text className="text-slate-500 text-xs font-medium uppercase tracking-wider">Overall Performance</Text>
                      <Text className="text-slate-900 text-3xl font-bold mt-1">{overallPct}%</Text>
                    </View>
                    <View className="w-14 h-14 bg-primary-50 rounded-2xl items-center justify-center">
                      <Text className="text-primary-600 text-xl font-bold">{gradeInfo.grade}</Text>
                    </View>
                  </View>
                  <View className="bg-slate-100 rounded-full h-2 overflow-hidden">
                    <View className="h-full rounded-full" style={{ width: `${overallPct}%`, backgroundColor: gradeInfo.color }} />
                  </View>
                </Card>

                {examGroups.map((examGroup) => (
                  <View key={examGroup.label} className="mb-4">
                    <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">{examGroup.label}</Text>
                    <Card padding="none" className="overflow-hidden">
                      {examGroup.results.map((result, index) => {
                        const pct = result.maximum_marks > 0 ? Math.round((result.marks_obtained / result.maximum_marks) * 100) : 0;
                        const barColor = pct >= 80 ? "#16A34A" : pct >= 60 ? "#F59E0B" : "#DC2626";
                        const passed =
                          result.pass_marks != null
                            ? result.marks_obtained >= result.pass_marks
                            : pct >= 40;
                        return (
                          <View
                            key={result.id}
                            className={`px-4 py-3.5 ${index < examGroup.results.length - 1 ? "border-b border-slate-50" : ""}`}
                          >
                            <View className="flex-row items-center justify-between mb-2">
                              <Text className="text-slate-800 text-sm font-semibold flex-1">
                                {result.subject_name ?? result.subject ?? "Unknown Subject"}
                              </Text>
                              <View className="flex-row items-center gap-2">
                                <Text className="text-slate-600 text-sm font-bold">
                                  {result.marks_obtained}/{result.maximum_marks}
                                </Text>
                                <Badge
                                  label={passed ? "Pass" : "Fail"}
                                  variant={passed ? "success" : "error"}
                                />
                                <Badge
                                  label={result.grade ?? getGradeFromPercentage(pct).grade}
                                  variant={pct >= 80 ? "success" : pct >= 60 ? "warning" : "error"}
                                />
                              </View>
                            </View>
                            <View className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                            </View>
                          </View>
                        );
                      })}
                    </Card>
                  </View>
                ))}
              </>
            )}
          </>
        )}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
