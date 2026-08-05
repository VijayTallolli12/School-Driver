import type { ReactNode } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface ScreenWrapperProps {
  children: ReactNode;
  title?: string;
  scroll?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export function ScreenWrapper({
  children,
  title,
  scroll = true,
  onBack,
  rightAction,
}: ScreenWrapperProps) {
  const handleBack = onBack ?? (() => router.back());

  const content = (
    <View className="flex-1 bg-surface-background">
      {title && (
        <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100">
          <View className="flex-row items-center">
            {onBack !== null && (
              <TouchableOpacity
                onPress={handleBack}
                className="w-8 h-8 items-center justify-center -ml-1 mr-2"
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={22} color="#475569" />
              </TouchableOpacity>
            )}
            <View className="flex-1">
              <Text className="text-slate-900 text-lg font-bold tracking-tight">
                {title}
              </Text>
            </View>
            {rightAction && <View>{rightAction}</View>}
          </View>
        </View>
      )}
      {scroll ? (
        <ScrollView
          className="flex-1 px-5 pt-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 px-5 pt-5">{children}</View>
      )}
    </View>
  );

  return <SafeAreaView className="flex-1 bg-surface-background">{content}</SafeAreaView>;
}
