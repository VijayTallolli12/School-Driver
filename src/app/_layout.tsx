import "../global.css";
import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryProvider } from "@/providers/QueryProvider";
import { useBrandingStore } from "@/store/branding.store";
import { useAuthStore } from "@/store/auth.store";
import { addNotificationResponseListener } from "@/services/notifications";
import { flushSosQueue } from "@/services/sosQueue";
import { flushAttendanceQueue } from "@/services/driverTripQueue";
import { isExpoGo } from "@/utils/environment";

export default function RootLayout() {
  const loadBranding = useBrandingStore((s) => s.loadBranding);
  const isLoaded = useBrandingStore((s) => s.isLoaded);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isLoaded) {
      loadBranding();
    }
    // expo-background-task / expo-task-manager are not supported in Expo Go.
    // Defer the import so Expo Go boots without warnings and dev builds still
    // register the idle-sync + background location tasks.
    if (!isExpoGo()) {
      void import("@/services/locationTask").then((m) => m.registerBackgroundTasks());
    }
    // On every cold start, try flushing any attendance / SOS entries that were
    // buffered offline in a previous session.
    if (isAuthenticated) {
      void flushAttendanceQueue();
      void flushSosQueue();
    }
  }, [isLoaded, loadBranding, isAuthenticated]);

  useEffect(() => {
    const sub = addNotificationResponseListener((url) => {
      if (url) {
        router.push(url as never);
      } else {
        router.navigate("/alerts" as never);
      }
    });
    return () => sub.remove();
  }, []);

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
