import { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { changePassword as changePasswordApi } from "@/services/api";

export default function ChangePasswordScreen() {
  const parentUuid = useAuthStore((s) => s.parentUuid);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (!currentPassword.trim()) errs.currentPassword = "Current password is required";
    if (!newPassword.trim()) errs.newPassword = "New password is required";
    else if (newPassword.length < 8) errs.newPassword = "Password must be at least 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword))
      errs.newPassword = "Must contain uppercase, lowercase, and a number";
    if (!confirmPassword.trim()) errs.confirmPassword = "Please confirm your new password";
    else if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [currentPassword, newPassword, confirmPassword]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (!parentUuid) return;

    setSubmitting(true);
    try {
      await changePasswordApi(parentUuid, {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      Alert.alert("Success", "Password updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to update password";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  }, [validate, parentUuid, currentPassword, newPassword, confirmPassword]);

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Change Password</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Card padding="lg" className="mb-4">
            <View className="mb-2">
              <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Password Policy</Text>
              <Text className="text-slate-400 text-xs mt-2 leading-4">
                • At least 8 characters{"\n"}• One uppercase letter{"\n"}• One lowercase letter{"\n"}• One number
              </Text>
            </View>
          </Card>

          <Card padding="lg" className="mb-4">
            <View className="gap-5">
              <Input
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={(v) => {
                  setCurrentPassword(v);
                  setErrors((e) => ({ ...e, currentPassword: "" }));
                }}
                error={errors.currentPassword}
                isPassword
                leftIcon="lock-closed-outline"
              />

              <Input
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={(v) => {
                  setNewPassword(v);
                  setErrors((e) => ({ ...e, newPassword: "" }));
                }}
                error={errors.newPassword}
                isPassword
                leftIcon="lock-open-outline"
              />

              <Input
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  setErrors((e) => ({ ...e, confirmPassword: "" }));
                }}
                error={errors.confirmPassword}
                isPassword
                leftIcon="checkmark-circle-outline"
              />
            </View>
          </Card>

          <View className="mb-8">
            <Button
              title="Update Password"
              onPress={handleSubmit}
              loading={submitting}
              size="lg"
              disabled={submitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
