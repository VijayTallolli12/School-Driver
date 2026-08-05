import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBrandingStore } from "@/store/branding.store";
import { Badge } from "./Badge";

interface OfflineStateProps {
  message?: string;
  onRetry?: () => void;
  isOffline?: boolean;
}

export function OfflineState({
  message,
  onRetry,
  isOffline = true,
}: OfflineStateProps) {
  const theme = useBrandingStore((s) => s.theme);
  const displayMessage =
    message ??
    "You're offline. Check your connection and pull down to retry.";

  return (
    <View className="items-center justify-center py-16 px-8">
      <View className="w-20 h-20 bg-amber-50 rounded-full items-center justify-center mb-4">
        <Ionicons name="wifi-outline" size={36} color="#F59E0B" />
      </View>
      <Text className="text-slate-800 text-lg font-bold text-center mb-2">
        No Internet Connection
      </Text>
      <Text className="text-slate-400 text-sm text-center leading-5 max-w-[260px] mb-4">
        {displayMessage}
      </Text>
      {onRetry && (
        <TouchableOpacity
          className="flex-row items-center px-6 py-3 rounded-xl"
          style={{ backgroundColor: theme.primary }}
          activeOpacity={0.7}
          onPress={onRetry}
        >
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
          <Text className="text-white font-semibold text-sm ml-2">Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
