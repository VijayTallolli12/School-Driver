import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { Card } from "@/components/ui/Card";

const CONTACT_ITEMS = [
  { icon: "call-outline", label: "Call School Office", value: "Contact the school administration during office hours" },
  { icon: "mail-outline", label: "Email Support", value: "Send an email to the school support team" },
  { icon: "chatbubble-ellipses-outline", label: "In-App Chat", value: "Chat with support during working hours" },
  { icon: "information-circle-outline", label: "FAQ", value: "Check frequently asked questions" },
];

export default function HelpScreen() {
  return (
    <ScreenWrapper title="Help & Support">
      <Card padding="lg" className="mb-5">
        <View className="items-center mb-4">
          <View className="w-16 h-16 bg-primary-50 rounded-full items-center justify-center mb-3">
            <Ionicons name="help-circle-outline" size={32} color="#3B82F6" />
          </View>
          <Text className="text-slate-900 text-base font-bold">How can we help you?</Text>
          <Text className="text-slate-500 text-sm mt-1 text-center">
            Reach out to the school for any questions or issues.
          </Text>
        </View>
      </Card>

      <Card padding="none" className="overflow-hidden mb-5">
        {CONTACT_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            className={`flex-row items-center px-5 py-4 ${
              index < CONTACT_ITEMS.length - 1 ? "border-b border-slate-50" : ""
            }`}
            activeOpacity={0.7}
          >
            <View className="w-9 h-9 bg-slate-50 rounded-xl items-center justify-center">
              <Ionicons name={item.icon as any} size={20} color="#64748B" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-slate-700 text-sm font-medium">{item.label}</Text>
              <Text className="text-slate-400 text-xs mt-0.5">{item.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        ))}
      </Card>

      <Card padding="lg">
        <Text className="text-slate-900 text-sm font-bold mb-2">School Office Hours</Text>
        <Text className="text-slate-500 text-xs leading-5">
          Monday – Friday: 8:00 AM – 4:00 PM{"\n"}
          Saturday: 8:00 AM – 12:00 PM{"\n"}
          Sunday: Closed
        </Text>
      </Card>
    </ScreenWrapper>
  );
}
