import { View, Text, ScrollView, TouchableOpacity, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth.store";
import { useBrandingStore } from "@/store/branding.store";
import { router } from "expo-router";
import { Card } from "@/components/ui/Card";
import { storage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";

const MENU_ITEMS = [
  { icon: "person-outline", label: "Edit Profile", route: "/profile/edit-profile" },
  { icon: "lock-closed-outline", label: "Change Password", route: "/profile/change-password" },
  { icon: "notifications-outline", label: "Notifications", route: "/notifications" },
  { icon: "shield-checkmark-outline", label: "Privacy", route: "/profile/privacy" },
  { icon: "help-circle-outline", label: "Help & Support", route: "/profile/help" },
] as const;

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const students = useAuthStore((s) => s.students);
  const logout = useAuthStore((s) => s.logout);
  const branding = useBrandingStore((s) => s.branding);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await storage.remove(STORAGE_KEYS.AUTH_TOKEN);
          await storage.remove(STORAGE_KEYS.USER_DATA);
          await storage.remove("school_parent_auth_store");
          logout();
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
  };

  const handleMenuPress = (route: string) => {
    router.push(route as any);
  };

  const schoolName = branding.schoolName || "School ERP";
  const hasLogo = !!branding.schoolLogo;
  const primaryColor = branding.primaryColor;

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100">
        <Text className="text-slate-900 text-lg font-bold tracking-tight">Profile</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        <Card padding="lg" className="items-center mb-4">
          {hasLogo ? (
            <View className="w-20 h-20 rounded-full items-center justify-center mb-3 overflow-hidden border border-slate-100 bg-white">
              <Image
                source={{ uri: branding.schoolLogo as string }}
                className="w-16 h-16"
                resizeMode="contain"
              />
            </View>
          ) : (
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-3 border border-primary-100"
              style={{ backgroundColor: `${primaryColor}14` }}
            >
              <Text className="text-3xl font-bold" style={{ color: primaryColor }}>
                {schoolName.charAt(0) || "S"}
              </Text>
            </View>
          )}
          <Text className="text-slate-900 text-lg font-bold">{schoolName}</Text>
          <Text className="text-slate-500 text-sm mt-0.5">{user?.email || "parent@school.com"}</Text>
        </Card>

        <Card padding="none" className="overflow-hidden mb-4">
          {[
            { icon: "mail-outline", label: "Email", value: user?.email || "—" },
            { icon: "call-outline", label: "Phone", value: user?.phone || "—" },
          ].map((item, index, arr) => (
            <View
              key={item.label}
              className={`flex-row items-center px-5 py-3.5 ${index < arr.length - 1 ? "border-b border-slate-50" : ""}`}
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

        {students.length > 0 && (
          <View className="mb-4">
            <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Linked Students</Text>
            <Card padding="none" className="overflow-hidden">
              {students.map((s, index) => (
                <View
                  key={s.uuid}
                  className={`flex-row items-center px-5 py-3.5 ${index < students.length - 1 ? "border-b border-slate-50" : ""}`}
                >
                  <View className="w-9 h-9 bg-primary-50 rounded-full items-center justify-center mr-3">
                    <Text className="text-primary-600 text-sm font-bold">{s.name.charAt(0)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-slate-800 text-sm font-semibold">{s.name}</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">Class {s.class}-{s.section} • Roll: {s.roll_number}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        <Card padding="none" className="overflow-hidden mb-6">
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              className={`flex-row items-center px-5 py-4 ${index < MENU_ITEMS.length - 1 ? "border-b border-slate-50" : ""}`}
              activeOpacity={0.7}
              onPress={() => handleMenuPress(item.route)}
            >
              <View className="w-8 h-8 bg-slate-50 rounded-lg items-center justify-center">
                <Ionicons name={item.icon as any} size={18} color="#64748B" />
              </View>
              <Text className="text-slate-700 text-sm font-medium ml-3 flex-1">{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </Card>

        <TouchableOpacity
          className="mb-8 bg-white rounded-2xl border border-red-100 p-4 items-center"
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text className="text-status-error font-semibold text-sm">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
