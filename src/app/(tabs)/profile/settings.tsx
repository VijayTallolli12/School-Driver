import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Constants from "expo-constants";
import { ACTIVE_API_URL } from "@/config/api";
import { getNotificationPermissionStatus, isPushEnabled, setPushEnabled } from "@/services/notifications";

export default function SettingsScreen() {
  const [pushEnabled, setLocalPushEnabled] = useState(true);
  const [permission, setPermission] = useState<"granted" | "denied" | "undetermined">("undetermined");

  useEffect(() => {
    void isPushEnabled().then(setLocalPushEnabled);
    void getNotificationPermissionStatus().then(setPermission);
  }, []);

  const togglePush = useCallback(async (enabled: boolean) => {
    setLocalPushEnabled(enabled);
    await setPushEnabled(enabled);
  }, []);

  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="w-8 h-8 items-center justify-center -ml-1 mr-2"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#475569" />
          </TouchableOpacity>
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Settings</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Notifications</Text>
        <View className="rounded-2xl border border-slate-100 bg-white overflow-hidden mb-6">
          <View className="flex-row items-center px-5 py-4">
            <View className="w-9 h-9 bg-slate-50 rounded-xl items-center justify-center mr-3">
              <Ionicons name="notifications-outline" size={18} color="#64748B" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-700 text-sm font-medium">In-app alerts</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                {permission === "granted" ? "Permission granted" : permission === "denied" ? "Blocked on this device" : "Not requested yet"}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Toggle in-app alerts"
              value={pushEnabled}
              onValueChange={togglePush}
              trackColor={{ false: "#E2E8F0", true: "#10B981" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">About</Text>
        <View className="rounded-2xl border border-slate-100 bg-white overflow-hidden mb-6">
          <View className="flex-row items-center px-5 py-4 border-b border-slate-50">
            <View className="w-9 h-9 bg-slate-50 rounded-xl items-center justify-center mr-3">
              <Ionicons name="information-circle-outline" size={18} color="#64748B" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-400 text-xs">App Version</Text>
              <Text className="text-slate-700 text-sm font-medium mt-0.5">School Driver App · {version}</Text>
            </View>
          </View>
          <View className="flex-row items-center px-5 py-4">
            <View className="w-9 h-9 bg-slate-50 rounded-xl items-center justify-center mr-3">
              <Ionicons name="cloud-outline" size={18} color="#64748B" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-400 text-xs">API Server</Text>
              <Text className="text-slate-700 text-sm font-medium mt-0.5" numberOfLines={1}>{ACTIVE_API_URL}</Text>
            </View>
          </View>
        </View>

        <View className="rounded-2xl border border-slate-100 bg-white overflow-hidden mb-8">
          <TouchableOpacity
            accessibilityRole="button"
            className="flex-row items-center px-5 py-4 border-b border-slate-50"
            activeOpacity={0.7}
            onPress={() => router.push("/profile/privacy" as any)}
          >
            <View className="w-9 h-9 bg-slate-50 rounded-xl items-center justify-center mr-3">
              <Ionicons name="shield-checkmark-outline" size={18} color="#64748B" />
            </View>
            <Text className="text-slate-700 text-sm font-medium flex-1">Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            className="flex-row items-center px-5 py-4"
            activeOpacity={0.7}
            onPress={() => router.push("/profile/help" as any)}
          >
            <View className="w-9 h-9 bg-slate-50 rounded-xl items-center justify-center mr-3">
              <Ionicons name="help-circle-outline" size={18} color="#64748B" />
            </View>
            <Text className="text-slate-700 text-sm font-medium flex-1">Help & Support</Text>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}