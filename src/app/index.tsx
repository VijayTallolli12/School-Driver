import { useEffect, useRef } from "react";
import { router } from "expo-router";
import { View, Text, Animated, Image } from "react-native";
import { useAuthStore } from "@/store/auth.store";
import { useBrandingStore } from "@/store/branding.store";

export default function SplashScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const branding = useBrandingStore((s) => s.branding);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        console.log("[Splash] Authenticated, redirecting to /(tabs)/(home)");
        router.replace("/(tabs)/(home)" as any);
      } else {
        console.log("[Splash] Not authenticated, redirecting to /(auth)/login");
        router.replace("/(auth)/login" as any);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const appName = branding.appName || "School ERP";
  const schoolName = branding.schoolName || "School ERP";
  const hasLogo = !!branding.schoolLogo;

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: branding.primaryColor }}
    >
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
        className="items-center"
      >
        {hasLogo ? (
          <View className="w-24 h-24 bg-white rounded-2xl items-center justify-center mb-6 shadow-lg overflow-hidden">
            <Image
              source={{ uri: branding.schoolLogo as string }}
              className="w-20 h-20"
              resizeMode="contain"
            />
          </View>
        ) : (
          <View className="w-24 h-24 bg-white rounded-2xl items-center justify-center mb-6 shadow-lg">
            <Text className="text-4xl">🏫</Text>
          </View>
        )}
        <Text className="text-white text-3xl font-bold tracking-wider">
          {appName}
        </Text>
        <Text
          className="text-white text-sm mt-2"
          style={{ opacity: 0.8 }}
        >
          {schoolName}
        </Text>
      </Animated.View>
      <Animated.View
        style={{ opacity: fadeAnim }}
        className="absolute bottom-12"
      >
        <Text className="text-white text-xs" style={{ opacity: 0.6 }}>
          Version 1.0.0
        </Text>
      </Animated.View>
    </View>
  );
}
