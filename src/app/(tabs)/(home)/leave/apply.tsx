import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { submitLeaveRequest, updateLeaveRequest } from "@/services/api";
import type { Student, LeaveRequestPayload } from "@/types";

const LEAVE_TYPES = ["Sick", "Casual", "Emergency", "Personal", "Other"];

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isValidDate(str: string): boolean {
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ApplyLeaveScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const students = useAuthStore((s) => s.students);
  const selectedStudentUuid = useAuthStore((s) => s.selectedStudentUuid);
  const childUuid = selectedStudentUuid ?? students?.[0]?.uuid;

  const editId = params.editId ? Number(params.editId) : null;

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    students.find((s) => s.uuid === childUuid) ?? students[0] ?? null,
  );
  const [fromDate, setFromDate] = useState<Date>(() => {
    if (params.fromDate && isValidDate(params.fromDate)) return new Date(params.fromDate);
    return new Date();
  });
  const [toDate, setToDate] = useState<Date>(() => {
    if (params.toDate && isValidDate(params.toDate)) return new Date(params.toDate);
    return new Date();
  });
  const [leaveType, setLeaveType] = useState(params.leaveType ?? "Sick");
  const [reason, setReason] = useState(params.reason ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState<"from" | "to" | null>(null);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (!selectedStudent) errs.student = "Please select a student";
    if (!fromDate) errs.fromDate = "From date is required";
    if (!toDate) errs.toDate = "To date is required";
    if (fromDate && toDate && fromDate > toDate) {
      errs.toDate = "To date must be on or after from date";
    }
    if (!leaveType) errs.leaveType = "Please select a leave type";
    if (!reason.trim()) errs.reason = "Reason is required";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [selectedStudent, fromDate, toDate, leaveType, reason]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (!parentUuid || !childUuid || !selectedStudent) return;

    setSubmitting(true);
    try {
      const payload = {
        from_date: formatDateInput(fromDate),
        to_date: formatDateInput(toDate),
        leave_type: leaveType,
        reason: reason.trim(),
      } as LeaveRequestPayload;

      if (editId) {
        await updateLeaveRequest(parentUuid, childUuid, editId, payload);
        Alert.alert("Success", "Leave request updated successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        await submitLeaveRequest(parentUuid, childUuid, payload);
        Alert.alert("Success", "Leave request submitted successfully.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to submit leave request";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  }, [validate, parentUuid, childUuid, selectedStudent, fromDate, toDate, leaveType, reason, editId]);

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">{editId ? "Edit Leave" : "Apply Leave"}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Card padding="lg" className="mb-4">
            <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4">Leave Details</Text>

            {/* Student Selector */}
            <View className="mb-4">
              <Text className="text-slate-600 text-sm font-medium mb-1.5">Student *</Text>
              <View className="flex-row flex-wrap gap-2">
                {students.map((s) => {
                  const isSelected = selectedStudent?.uuid === s.uuid;
                  return (
                    <TouchableOpacity
                      key={s.uuid}
                      className={`px-3.5 py-2.5 rounded-xl border ${isSelected ? "bg-primary-600 border-primary-600" : "bg-white border-slate-200"}`}
                      activeOpacity={0.7}
                      onPress={() => setSelectedStudent(s)}
                    >
                      <Text className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-700"}`}>
                        {s.name} ({s.class}-{s.section})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.student && <Text className="text-status-error text-xs mt-1">{errors.student}</Text>}
            </View>

            {/* From Date */}
            <View className="mb-4">
              <Text className="text-slate-600 text-sm font-medium mb-1.5">From Date *</Text>
              <TouchableOpacity
                className={`flex-row items-center border rounded-xl px-4 py-3.5 ${errors.fromDate ? "border-status-error" : "border-slate-200"}`}
                activeOpacity={0.7}
                onPress={() => setShowDatePicker("from")}
              >
                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                <Text className="text-slate-800 text-sm ml-2.5 flex-1">{formatDisplayDate(fromDate)}</Text>
                <Ionicons name="chevron-down" size={16} color="#94A3B8" />
              </TouchableOpacity>
              {errors.fromDate && <Text className="text-status-error text-xs mt-1">{errors.fromDate}</Text>}
            </View>

            {/* To Date */}
            <View className="mb-4">
              <Text className="text-slate-600 text-sm font-medium mb-1.5">To Date *</Text>
              <TouchableOpacity
                className={`flex-row items-center border rounded-xl px-4 py-3.5 ${errors.toDate ? "border-status-error" : "border-slate-200"}`}
                activeOpacity={0.7}
                onPress={() => setShowDatePicker("to")}
              >
                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                <Text className="text-slate-800 text-sm ml-2.5 flex-1">{formatDisplayDate(toDate)}</Text>
                <Ionicons name="chevron-down" size={16} color="#94A3B8" />
              </TouchableOpacity>
              {errors.toDate && <Text className="text-status-error text-xs mt-1">{errors.toDate}</Text>}
            </View>

            {/* Leave Type */}
            <View className="mb-4">
              <Text className="text-slate-600 text-sm font-medium mb-1.5">Leave Type *</Text>
              <View className="flex-row flex-wrap gap-2">
                {LEAVE_TYPES.map((type) => {
                  const isSelected = leaveType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      className={`px-3.5 py-2 rounded-xl border ${isSelected ? "bg-primary-600 border-primary-600" : "bg-white border-slate-200"}`}
                      activeOpacity={0.7}
                      onPress={() => {
                        setLeaveType(type);
                        setErrors((e) => ({ ...e, leaveType: "" }));
                      }}
                    >
                      <Text className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-700"}`}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.leaveType && <Text className="text-status-error text-xs mt-1">{errors.leaveType}</Text>}
            </View>

            {/* Reason */}
            <View className="mb-2">
              <Input
                label="Reason *"
                placeholder="Describe the reason for leave"
                value={reason}
                onChangeText={(v) => {
                  setReason(v);
                  setErrors((e) => ({ ...e, reason: "" }));
                }}
                error={errors.reason}
                multiline
                numberOfLines={3}
                containerStyle={{ minHeight: 80 }}
              />
            </View>
          </Card>

          <View className="mb-8">
            <Button
              title={editId ? "Update Leave Request" : "Submit Leave Request"}
              onPress={handleSubmit}
              loading={submitting}
              size="lg"
              disabled={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === "from" ? fromDate : toDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={new Date()}
          is24Hour
          onChange={(_event: DateTimePickerEvent, selected?: Date) => {
            if (Platform.OS === "android") setShowDatePicker(null);
            if (selected) {
              if (showDatePicker === "from") {
                setFromDate(selected);
                setErrors((e) => ({ ...e, fromDate: "" }));
                if (selected > toDate) setToDate(selected);
              } else {
                setToDate(selected);
                setErrors((e) => ({ ...e, toDate: "" }));
              }
            }
          }}
        />
      )}
      {Platform.OS === "ios" && showDatePicker && (
        <TouchableOpacity
          className="bg-primary-600 mx-5 mb-4 py-3 rounded-xl items-center"
          activeOpacity={0.7}
          onPress={() => setShowDatePicker(null)}
        >
          <Text className="text-white font-semibold text-sm">Done</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
