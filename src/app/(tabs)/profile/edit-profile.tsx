import { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "@/services/api";

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const parentUuid = useAuthStore((s) => s.parentUuid);
  const setUser = useAuthStore((s) => s.setUser);

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadParent = async () => {
      if (!parentUuid) return;
      try {
        const { fetchParent } = await import("@/services/api");
        const data = await fetchParent(parentUuid);
        if (data) {
          if (data.phone) setPhone(String(data.phone));
          if (data.email) setEmail(String(data.email));
          if (data.address) setAddress(String(data.address));
        }
      } catch {
        // use existing auth store values
      }
    };
    loadParent();
  }, [parentUuid]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email format";

    if (!phone.trim()) errs.phone = "Phone is required";
    else if (!/^[+]?[\d\s\-()]{7,15}$/.test(phone)) errs.phone = "Invalid phone number";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [email, phone]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    if (!parentUuid) return;

    setSubmitting(true);
    try {
      const payload: Record<string, string> = {};
      if (phone !== user?.phone) payload.phone = phone;
      if (email !== user?.email) payload.email = email;
      if (address) payload.address = address;

      if (Object.keys(payload).length === 0) {
        Alert.alert("No Changes", "No changes were made to your profile.");
        setSubmitting(false);
        return;
      }

      await updateProfile(parentUuid, payload);

      if (email !== user?.email || phone !== user?.phone) {
        setUser({
          ...user!,
          email: email || user!.email,
          phone: phone || user!.phone,
        });
      }

      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to update profile";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  }, [validate, parentUuid, phone, email, address, user, setUser]);

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
          <Text className="text-slate-900 text-lg font-bold tracking-tight">Edit Profile</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Card padding="lg" className="items-center mb-4">
            <View className="w-20 h-20 bg-primary-50 rounded-full items-center justify-center mb-3 border border-primary-100 relative">
              <Text className="text-primary-600 text-3xl font-bold">
                {user?.name?.charAt(0) || "P"}
              </Text>
            </View>
            <Text className="text-slate-900 text-lg font-bold">{user?.name || "Parent User"}</Text>
            <Text className="text-slate-400 text-xs mt-1">Name cannot be changed. Contact school office.</Text>
          </Card>

          <Card padding="lg" className="mb-4">
            <View className="gap-5">
              <Input
                label="Email"
                placeholder="parent@school.com"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setErrors((e) => ({ ...e, email: "" }));
                }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
              />

              <Input
                label="Phone"
                placeholder="+91 9876543210"
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setErrors((e) => ({ ...e, phone: "" }));
                }}
                error={errors.phone}
                keyboardType="phone-pad"
                leftIcon="call-outline"
              />

              <Input
                label="Address"
                placeholder="Enter your address"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                containerStyle={{ minHeight: 80 }}
                leftIcon="home-outline"
              />
            </View>
          </Card>

          <View className="mb-8">
            <Button
              title="Save Changes"
              onPress={handleSave}
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
