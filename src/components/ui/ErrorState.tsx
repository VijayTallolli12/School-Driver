import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
  retryLabel = "Try Again",
}: ErrorStateProps) {
  return (
    <View className="items-center justify-center py-16 px-8">
      <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
        <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
      </View>
      <Text className="text-slate-700 text-base font-semibold text-center">
        Oops!
      </Text>
      <Text className="text-slate-400 text-sm text-center mt-1.5 leading-5">
        {message}
      </Text>
      {onRetry && (
        <View className="mt-5">
          <Button
            title={retryLabel}
            onPress={onRetry}
            variant="outline"
            size="sm"
          />
        </View>
      )}
    </View>
  );
}
