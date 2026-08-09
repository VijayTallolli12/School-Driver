import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { fetchDriverTripState, getErrorMessage, isNetworkError, sendSosAlert } from "@/services/api";
import { enqueueSos, flushSosQueue } from "@/services/sosQueue";
import { getDriverLocationSnapshot, requestDriverLocationPermission } from "@/services/geolocation";
import type { DriverTripSummary } from "@/types";

type SosState = "idle" | "sending" | "sent" | "queued" | "error";

export default function EmergencyScreen() {
  const user = useAuthStore((s) => s.user);
  const driverUuid = useAuthStore((s) => s.driverUuid);
  const assignedVehicleId = useAuthStore((s) => s.assignedVehicleId);
  const [trip, setTrip] = useState<DriverTripSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sosState, setSosState] = useState<SosState>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const state = await fetchDriverTripState();
      setTrip(state.trip);
      setSosState((prev) => (prev === "sent" || prev === "queued" ? prev : "idle"));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmAndSendSos = useCallback(() => {
    Alert.alert(
      "Send SOS alert?",
      "Your current location and trip details will be shared with the school transport admin immediately.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send SOS", style: "destructive", onPress: () => void sendSos() },
      ],
    );
  }, []);

  const sendSos = useCallback(async () => {
    setSosState("sending");
    setError(null);

    // Backend validation requires trip_id on every SOS alert. The active-trip
    // state may not have loaded yet (or none exists), so re-check before send.
    let activeTripId: number | null = trip?.id ?? null;
    if (activeTripId == null) {
      try {
        const state = await fetchDriverTripState();
        if (state.trip?.id != null) {
          activeTripId = state.trip.id;
          setTrip(state.trip);
        }
      } catch {
        // fall through to the guard below
      }
    }

    if (activeTripId == null) {
      setSosState("error");
      const msg = "An active trip is required to send an SOS alert.";
      setError(msg);
      Alert.alert("SOS unavailable", msg);
      return;
    }

    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      let accuracy: number | null = null;

      const granted = await requestDriverLocationPermission();
      if (granted) {
        const snapshot = await getDriverLocationSnapshot().catch(() => null);
        if (snapshot) {
          latitude = snapshot.latitude;
          longitude = snapshot.longitude;
          accuracy = snapshot.accuracy;
        }
      }

      const payload = {
        driver_id: user?.id ?? null,
        driver_uuid: driverUuid,
        trip_id: activeTripId,
        vehicle_id: assignedVehicleId,
        latitude,
        longitude,
        accuracy,
        recorded_at: new Date().toISOString(),
        message: "Driver requested immediate assistance.",
      };

      try {
        await sendSosAlert(payload);
        setSosState("sent");
      } catch (err: unknown) {
        if (isNetworkError(err)) {
          await enqueueSos(payload);
          setSosState("queued");
          Alert.alert(
            "SOS queued offline",
            "No internet connection. Your SOS alert is saved and will be sent automatically once the connection returns.",
          );
          return;
        }
        throw err;
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setSosState("error");
      Alert.alert("SOS failed", getErrorMessage(err));
    }
  }, [assignedVehicleId, driverUuid, trip]);

  const retrySend = useCallback(async () => {
    setError(null);
    if (sosState === "queued") {
      setSosState("sending");
      try {
        const result = await flushSosQueue();
        setSosState(result.pending > 0 ? "queued" : "sent");
      } catch (err: unknown) {
        setError(getErrorMessage(err));
        setSosState("queued");
      }
    } else {
      void sendSos();
    }
  }, [sendSos, sosState]);

  const statusLabel = !trip
    ? "No Active Trip"
    : trip.status === "in_progress"
      ? "Trip In Progress"
      : "Trip Ready";

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-5 py-3">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          accessibilityLabel="Go back"
          className="w-11 h-11 rounded-2xl bg-slate-800 items-center justify-center"
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Emergency</Text>
        <View className="w-11" />
      </View>

      <View className="mt-8 items-center">
        <View className="w-24 h-24 rounded-full bg-red-600 items-center justify-center">
          <Ionicons name="warning" size={48} color="#FFFFFF" />
        </View>
        <Text className="text-red-400 text-3xl font-bold tracking-wide mt-4">EMERGENCY</Text>
        <Text className="text-slate-300 text-sm mt-2 text-center px-6">
          Stop the vehicle safely and contact dispatch immediately.
        </Text>
      </View>

      <View className="flex-1 justify-center">
        {loading ? (
          <View className="items-center">
            <ActivityIndicator color="#F87171" />
          </View>
        ) : (
          <View className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-slate-400 text-xs uppercase tracking-[1.2px]">Current Status</Text>
              <View className={`px-3 py-1.5 rounded-full ${trip?.status === "in_progress" ? "bg-emerald-500/20" : "bg-slate-800"}`}>
                <Text className={`text-xs font-bold ${trip?.status === "in_progress" ? "text-emerald-300" : "text-slate-300"}`}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            <View className="h-px bg-slate-800 my-4" />

            <View className="flex-row">
              <View className="flex-1">
                <Text className="text-slate-400 text-xs uppercase">Route</Text>
                <Text className="text-white text-base font-semibold mt-1" numberOfLines={1}>
                  {trip?.route_name ?? "—"}
                </Text>
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-slate-400 text-xs uppercase">Vehicle</Text>
                <Text className="text-white text-base font-semibold mt-1" numberOfLines={1}>
                  {trip?.vehicle_number ?? "—"}
                </Text>
              </View>
            </View>

            <View className="flex-row mt-4">
              <View className="flex-1">
                <Text className="text-slate-400 text-xs uppercase">Picked</Text>
                <Text className="text-white text-base font-semibold mt-1">{trip?.picked_students ?? 0}/{trip?.total_students ?? 0}</Text>
              </View>
              <View className="flex-1 ml-4">
                <Text className="text-slate-400 text-xs uppercase">Driver</Text>
                <Text className="text-white text-base font-semibold mt-1" numberOfLines={1}>
                  {user?.name ?? "—"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {error ? <Text className="text-red-300 text-sm mt-3 text-center">{error}</Text> : null}

        {sosState === "sent" ? (
          <View className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 items-center">
            <Ionicons name="checkmark-circle" size={36} color="#34D399" />
            <Text className="text-emerald-300 text-base font-bold mt-2">SOS Alert Sent</Text>
            <Text className="text-emerald-200/80 text-xs mt-1 text-center">
              The transport admin has been notified with your location.
            </Text>
          </View>
        ) : sosState === "queued" ? (
          <View className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 items-center">
            <Ionicons name="cloud-offline-outline" size={32} color="#FCD34D" />
            <Text className="text-amber-200 text-base font-bold mt-2">SOS Queued Offline</Text>
            <Text className="text-amber-100/80 text-xs mt-1 text-center">
              You are offline. The alert is saved on this device and will be sent automatically when the connection returns.
            </Text>
          </View>
        ) : null}
      </View>

      <View className="pb-3 gap-3">
        <TouchableOpacity
          accessibilityLabel={sosState === "sent" ? "SOS alert already sent" : "Send SOS alert to transport admin"}
          className={`min-h-[56px] rounded-2xl items-center justify-center ${sosState === "sent" ? "bg-emerald-600" : "bg-red-600"}`}
          activeOpacity={0.85}
          onPress={confirmAndSendSos}
          disabled={sosState === "sending"}
        >
          {sosState === "sending" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="radio-outline" size={22} color="#FFFFFF" />
              <Text className="text-white text-lg font-bold ml-2">
                {sosState === "sent" ? "SOS SENT" : sosState === "queued" ? "SOS QUEUED — TAP TO RESEND" : "SEND SOS ALERT"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {(sosState === "queued" || sosState === "error") && (
          <TouchableOpacity
            accessibilityLabel="Retry sending the SOS alert"
            className="min-h-[56px] rounded-2xl bg-slate-800 items-center justify-center"
            activeOpacity={0.85}
            onPress={retrySend}
          >
            <View className="flex-row items-center">
              <Ionicons name="refresh" size={20} color="#FCA5A5" />
              <Text className="text-slate-100 text-base font-bold ml-2">{sosState === "error" ? "TRY AGAIN" : "RETRY SENDING NOW"}</Text>
            </View>
          </TouchableOpacity>
        )}

        {trip?.status === "in_progress" ? (
          <TouchableOpacity
            accessibilityLabel="Back to live trip"
            className="min-h-[52px] rounded-2xl bg-slate-800 items-center justify-center"
            activeOpacity={0.85}
            onPress={() => router.replace({ pathname: "/transport/live-trip", params: { tripId: String(trip.id) } } as any)}
          >
            <Text className="text-slate-100 text-base font-bold">BACK TO TRIP</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            accessibilityLabel="Back to home"
            className="min-h-[52px] rounded-2xl bg-slate-800 items-center justify-center"
            activeOpacity={0.85}
            onPress={() => router.replace("/(tabs)/(home)/transport" as any)}
          >
            <Text className="text-slate-100 text-base font-bold">BACK TO HOME</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}