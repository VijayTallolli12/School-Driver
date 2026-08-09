import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushToken } from "@/services/api";
import { isExpoGo } from "@/utils/environment";
import { storage } from "@/utils/storage";

const PUSH_ENABLED_KEY = "driver_push_enabled";
export const TRIP_ALERTS_CHANNEL = "trip-alerts";

// Foreground presentation — banners/alerts only when the driver has not
// disabled in-app notifications from the Settings screen.
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const enabled = await isPushEnabled();
    return {
      shouldShowAlert: enabled,
      shouldShowBanner: enabled,
      shouldShowList: enabled,
      shouldPlaySound: enabled,
      shouldSetBadge: enabled,
    };
  },
});

export async function isPushEnabled(): Promise<boolean> {
  const value = await storage.get<boolean>(PUSH_ENABLED_KEY);
  return value !== false;
}

export async function setPushEnabled(enabled: boolean): Promise<void> {
  await storage.set(PUSH_ENABLED_KEY, enabled);
}

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(TRIP_ALERTS_CHANNEL, {
      name: "Trip alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#064E3B",
    });
  } catch {
    // Channel creation can fail in Expo Go — ignore.
  }
}

/**
 * Requests notification permission and registers the Expo push token with the
 * backend. Best-effort: never throws and never blocks app flows.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  // Remote push is unsupported in Expo Go since SDK 53 — skip the token call
  // there entirely (an import-time warning may still surface from the package).
  if (isExpoGo()) return;
  try {
    await ensureNotificationChannel();

    const current = await Notifications.getPermissionsAsync();
    let granted = current.status === "granted";
    if (!granted && current.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.status === "granted";
    }
    if (!granted) return;

    const projectId = Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token?.data) return;

    await registerPushToken(token.data, Platform.OS === "android" ? "android" : "ios");
  } catch {
    // Push registration is opportunistic — failures are non-fatal.
  }
}

/**
 * Adds a listener for notification taps. Returns an unsubscribe function.
 * `data.url` (sent by the backend) can route the driver to a screen.
 */
export type NotificationResponseHandler = (url: string | null) => void;

export function addNotificationResponseListener(
  handler: NotificationResponseHandler,
): { remove: () => void } {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    const url = typeof data?.url === "string" ? data.url : null;
    handler(url);
  });
  return { remove: () => sub.remove() };
}

export async function getNotificationPermissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  try {
    const status = await Notifications.getPermissionsAsync();
    return status.status === "granted" ? "granted" : status.status === "denied" ? "denied" : "undetermined";
  } catch {
    return "undetermined";
  }
}