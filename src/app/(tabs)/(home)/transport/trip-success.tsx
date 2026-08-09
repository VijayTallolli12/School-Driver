import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function TripSuccessScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-6 items-center justify-center">
      <View className="w-20 h-20 rounded-full bg-emerald-500 items-center justify-center mb-5">
        <Ionicons name="checkmark" size={42} color="#022C22" />
      </View>
      <Text className="text-white text-3xl font-bold">Trip Completed</Text>
      <Text className="text-slate-300 text-base mt-3 text-center">
        All stops are closed and attendance has been recorded.
      </Text>

      <TouchableOpacity
        className="mt-8 min-h-[56px] w-full rounded-2xl bg-emerald-500 items-center justify-center"
        activeOpacity={0.85}
        onPress={() => router.replace("/(tabs)/(home)/transport" as any)}
      >
        <Text className="text-emerald-950 text-lg font-bold">BACK TO HOME</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
