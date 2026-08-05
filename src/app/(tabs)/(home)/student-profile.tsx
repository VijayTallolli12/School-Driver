import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { fetchParent } from "@/services/api";

export default function StudentProfileScreen() {
  const students = useAuthStore((s) => s.students);
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const setSelectedStudentUuid = useAuthStore((s) => s.setSelectedStudentUuid);
  const user = useAuthStore((s) => s.user);
  const student = students.find((s) => s.uuid === selectedStudentUuid) ?? students[0] ?? null;

  const [parentInfo, setParentInfo] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const loadParentInfo = useCallback(async () => {
    if (!parentUuid) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchParent(parentUuid);
      setParentInfo(data);
    } catch (err) {
      console.error("[StudentProfile] load parent error:", err);
    } finally {
      setLoading(false);
    }
  }, [parentUuid]);

  useEffect(() => {
    loadParentInfo();
  }, [loadParentInfo]);

  if (!student) {
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
            <Text className="text-slate-900 text-lg font-bold tracking-tight">Student Profile</Text>
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="person-outline" size={28} color="#94A3B8" />
          </View>
          <Text className="text-slate-700 text-base font-semibold text-center">No Student Data</Text>
          <Text className="text-slate-400 text-sm text-center mt-1.5">Student information is not available at the moment</Text>
        </View>
      </SafeAreaView>
    );
  }

  const guardian = parentInfo;
  const fatherName = guardian?.father_name ?? guardian?.first_name ?? user?.name ?? "";
  const motherName = guardian?.mother_name ?? "";
  const contact = guardian?.phone ?? user?.phone ?? "";
  const email = guardian?.email ?? user?.email ?? "";
  const address = guardian?.address ?? "";

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Student Profile</Text>
        </View>
        <View className="mt-3">
          <ChildSwitcher
            selectedUuid={selectedStudentUuid}
            onSelect={(uuid) => setSelectedStudentUuid(uuid)}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Card padding="lg" className="items-center mb-4">
          <View className="w-20 h-20 bg-primary-50 rounded-full items-center justify-center mb-3 border-2 border-primary-100">
            <Text className="text-primary-600 text-3xl font-bold">{student.name.charAt(0)}</Text>
          </View>
          <Text className="text-slate-900 text-xl font-bold">{student.name}</Text>
          <View className="flex-row items-center mt-1.5">
            <Badge label={`Class ${student.class}`} variant="info" />
            <View className="mx-2 w-1 h-1 bg-slate-300 rounded-full" />
            <Text className="text-slate-500 text-sm">Section {student.section}</Text>
            <View className="mx-2 w-1 h-1 bg-slate-300 rounded-full" />
            <Text className="text-slate-500 text-sm">Roll: {student.roll_number}</Text>
          </View>
        </Card>

        <View className="flex-row gap-3 mb-4">
          <Card padding="md" className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 bg-blue-50 rounded-lg items-center justify-center mr-2">
                <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
              </View>
              <Text className="text-slate-500 text-xs font-medium">Academic Year</Text>
            </View>
            <Text className="text-slate-800 text-sm font-semibold">2025-2026</Text>
          </Card>
          <Card padding="md" className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 bg-green-50 rounded-lg items-center justify-center mr-2">
                <Ionicons name="school-outline" size={16} color="#16A34A" />
              </View>
              <Text className="text-slate-500 text-xs font-medium">Admission</Text>
            </View>
            <Text className="text-slate-800 text-sm font-semibold">{student.admission_no || "—"}</Text>
          </Card>
        </View>

        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Parent Details</Text>
        <Card padding="none" className="overflow-hidden mb-4">
          {[
            { icon: "person-outline", label: "Father's Name", value: fatherName },
            { icon: "person-outline", label: "Mother's Name", value: motherName },
            { icon: "call-outline", label: "Contact", value: contact },
            { icon: "mail-outline", label: "Email", value: email },
            { icon: "home-outline", label: "Address", value: address || "—" },
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
                <Text className="text-slate-700 text-sm font-medium mt-0.5">{item.value || "—"}</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
