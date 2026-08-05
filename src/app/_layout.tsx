import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryProvider } from "@/providers/QueryProvider";
import { useBrandingStore } from "@/store/branding.store";

export default function RootLayout() {
  const loadBranding = useBrandingStore((s) => s.loadBranding);
  const isLoaded = useBrandingStore((s) => s.isLoaded);

  useEffect(() => {
    if (!isLoaded) {
      loadBranding();
    }
  }, [isLoaded, loadBranding]);

  return (
    <QueryProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryProvider>
  );
}
