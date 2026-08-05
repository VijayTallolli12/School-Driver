import { View, Text } from "react-native";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { Card } from "@/components/ui/Card";

export default function PrivacyScreen() {
  return (
    <ScreenWrapper title="Privacy">
      <Card padding="lg" className="mb-4">
        <Text className="text-slate-900 text-base font-bold mb-2">Data Protection</Text>
        <Text className="text-slate-500 text-sm leading-5">
          Your personal data and your child's academic information are stored securely and used only for school-related purposes.
          We do not share your data with third parties without your explicit consent.
        </Text>
      </Card>

      <Card padding="lg" className="mb-4">
        <Text className="text-slate-900 text-base font-bold mb-2">Information We Collect</Text>
        <Text className="text-slate-500 text-sm leading-5">
          We collect information necessary for school operations including parent contact details, student academic records,
          attendance data, fee payment history, and communication preferences.
        </Text>
      </Card>

      <Card padding="lg" className="mb-4">
        <Text className="text-slate-900 text-base font-bold mb-2">Your Rights</Text>
        <Text className="text-slate-500 text-sm leading-5">
          You have the right to access, update, or request deletion of your personal data. For any privacy-related requests,
          please contact the school administration.
        </Text>
      </Card>

      <Card padding="lg">
        <Text className="text-slate-900 text-base font-bold mb-2">Contact</Text>
        <Text className="text-slate-500 text-sm leading-5">
          For privacy concerns, reach out to the school data protection officer at the school office or via email.
        </Text>
      </Card>

      <View className="mt-6 items-center">
        <Text className="text-slate-400 text-xs">Version 1.0 • Last updated May 2026</Text>
      </View>
    </ScreenWrapper>
  );
}
