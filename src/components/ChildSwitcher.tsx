import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth.store";
import type { Student } from "@/types";

interface ChildSwitcherProps {
  selectedUuid: string | null;
  onSelect: (uuid: string) => void;
}

export function ChildSwitcher({ selectedUuid, onSelect }: ChildSwitcherProps) {
  const students = useAuthStore((s) => s.students) ?? [];
  const [showModal, setShowModal] = useState(false);

  if (!students || students.length === 0) return null;

  const selected = students.find((s) => s.uuid === selectedUuid) ?? students[0];
  const isMulti = students.length > 1;

  if (!isMulti) {
    return (
      <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5">
        <View className="w-9 h-9 bg-primary-50 rounded-full items-center justify-center mr-2.5">
          <Text className="text-primary-600 font-bold text-sm">
            {selected.name?.charAt(0) ?? "?"}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-slate-900 font-semibold text-sm leading-tight">
            {selected.name ?? "—"}
          </Text>
          <Text className="text-slate-500 text-[11px] leading-tight mt-0.5">
            Class {selected.class ?? "—"}-{selected.section ?? "—"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        className="flex-row items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5"
        activeOpacity={0.7}
        onPress={() => setShowModal(true)}
      >
        <View className="w-9 h-9 bg-primary-50 rounded-full items-center justify-center mr-2.5">
          <Text className="text-primary-600 font-bold text-sm">
            {selected.name?.charAt(0) ?? "?"}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-slate-900 font-semibold text-sm leading-tight">
            {selected.name ?? "—"}
          </Text>
          <Text className="text-slate-500 text-[11px] leading-tight mt-0.5">
            Class {selected.class ?? "—"}-{selected.section ?? "—"}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color="#94A3B8" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/25 px-6"
          onPress={() => setShowModal(false)}
        >
          <Pressable
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
            onPress={() => {}}
          >
            <View className="px-5 pt-5 pb-3">
              <Text className="text-slate-900 text-base font-bold">Switch Child</Text>
              <Text className="text-slate-500 text-xs mt-0.5">Select a student to view their data</Text>
            </View>

            <ScrollView className="max-h-80">
              {students.map((s) => {
                const isActive = s.uuid === selectedUuid;
                return (
                  <TouchableOpacity
                    key={s.uuid}
                    className={`flex-row items-center px-5 py-3.5 ${isActive ? "bg-primary-50/50" : ""}`}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect(s.uuid);
                      setShowModal(false);
                    }}
                  >
                    <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                      isActive ? "bg-primary-100" : "bg-slate-100"
                    }`}>
                      <Text className={`font-bold text-sm ${
                        isActive ? "text-primary-700" : "text-slate-500"
                      }`}>
                        {s.name?.charAt(0) ?? "?"}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className={`text-sm font-semibold flex-1 ${
                          isActive ? "text-primary-700" : "text-slate-800"
                        }`}>
                          {s.name ?? "—"}
                        </Text>
                        {isActive && (
                          <Ionicons name="checkmark-circle" size={18} color="#3B82F6" />
                        )}
                      </View>
                      <Text className="text-slate-500 text-xs mt-0.5">
                        Class {s.class ?? "—"}-{s.section ?? "—"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              className="px-5 py-3.5 border-t border-slate-100 items-center"
              activeOpacity={0.7}
              onPress={() => setShowModal(false)}
            >
              <Text className="text-slate-500 text-sm font-medium">Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
