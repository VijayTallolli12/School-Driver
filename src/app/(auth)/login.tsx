import { useState, useCallback, useRef, useEffect } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/auth.store";
import { useBrandingStore } from "@/store/branding.store";
import apiClient from "@/services/api";
import { storage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hydrateFromApi = useAuthStore((s) => s.hydrateFromApi);
  const branding = useBrandingStore((s) => s.branding);
  const refreshBranding = useBrandingStore((s) => s.refreshBranding);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onLogin = useCallback(async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: wrapper } = await apiClient.post("/auth/login", values);
      if (!wrapper || !wrapper.success) {
        throw new Error(wrapper?.message ?? "Login failed. Please check your credentials.");
      }
      const payload: {
        token: string;
        user: Record<string, unknown>;
        students: Record<string, unknown>[];
        parent_uuid?: string;
      } = wrapper.data;
      if (!payload || !payload.token) {
        throw new Error("Login did not return valid user credentials.");
      }

      const mappedUser = {
        id: payload.user.id as number,
        name: (payload.user.name as string) ?? "",
        email: (payload.user.email as string) ?? "",
        phone: (payload.user.phone as string) ?? "",
        avatar_url: (payload.user.avatar_url as string) ?? null,
        role: "parent" as const,
      };

      const mappedStudents = (payload.students ?? []).map((s) => ({
        id: s.id as number,
        uuid: (s.uuid as string) ?? "",
        name: (s.name as string) ?? "",
        class: (s.class as string) ?? "",
        section: (s.section as string) ?? "",
        roll_number: (s.roll_number as string) ?? "",
        admission_no: (s.admission_no as string) ?? "",
        avatar_url: (s.photo as string) ?? null,
      }));

      hydrateFromApi({
        user: mappedUser,
        students: mappedStudents,
        token: payload.token,
        parent_uuid: (payload.parent_uuid as string | undefined) ?? undefined,
      });

      await storage.set(STORAGE_KEYS.AUTH_TOKEN, payload.token);
      router.replace("/(tabs)/(home)" as any);
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please check your credentials.";
      Alert.alert("Login Error", message);
    } finally {
      setIsSubmitting(false);
    }
  }, [hydrateFromApi]);

  const appName = branding.appName || "School ERP";
  const schoolName = branding.schoolName || "School ERP";
  const hasLogo = !!branding.schoolLogo;
  const primaryColor = branding.primaryColor;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View className="px-6 pt-12 pb-4">
            {hasLogo ? (
              <View className="w-16 h-16 rounded-2xl items-center justify-center mb-6 overflow-hidden bg-white border border-slate-100">
                <Image
                  source={{ uri: branding.schoolLogo as string }}
                  className="w-12 h-12"
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-6"
                style={{ backgroundColor: `${primaryColor}14` }}
              >
                <Ionicons name="school-outline" size={36} color={primaryColor} />
              </View>
            )}
            <Text className="text-slate-900 text-3xl font-bold tracking-tight">
              Welcome to {schoolName}
            </Text>
            <Text className="text-slate-500 text-base mt-1.5">
              Sign in to your {appName} account
            </Text>
          </View>

          <View className="px-5 flex-1">
            <View className="gap-5">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email Address"
                    placeholder="parent@school.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    leftIcon="mail-outline"
                    error={errors.email?.message}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    returnKeyType="next"
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    autoComplete="password"
                    leftIcon="lock-closed-outline"
                    isPassword
                    error={errors.password?.message}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onLogin)}
                  />
                )}
              />

              <View className="pt-3">
                <Button
                  title="Sign In"
                  onPress={handleSubmit(onLogin)}
                  loading={isSubmitting}
                  size="lg"
                />
              </View>
            </View>
          </View>

          <View className="items-center pt-8 pb-8">
            <View className="flex-row items-center">
              <View className="w-8 h-px bg-slate-200" />
              <Text className="text-slate-400 text-xs mx-3 font-medium">
                {appName}
              </Text>
              <View className="w-8 h-px bg-slate-200" />
            </View>
            <Text className="text-slate-400 text-xs mt-2">
              Powered by Folkslogic
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
