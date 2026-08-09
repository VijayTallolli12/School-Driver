import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { arriveAtStop, fetchDriverTrip, getErrorMessage, isNetworkError, leaveStop, markDriverTripAction } from "@/services/api";
import { enqueueAttendance, flushAttendanceQueue, getAttendanceQueue } from "@/services/driverTripQueue";
import type { DriverTripAction, DriverTripActionKind, DriverTripStudent, DriverTripStudentStatus, DriverTripSummary } from "@/types";

type LocalActionMap = Record<number, DriverTripActionKind | undefined>;

function statusForSide(side: DriverTripAction, status: DriverTripStudentStatus): DriverTripStudentStatus {
  if (side === "pickup") {
    if (status === "picked_up" || status === "missed") return status;
    return "pending";
  }
  if (status === "dropped_off" || status === "missed") return status;
  return "pending";
}

function effectiveStatus(student: DriverTripStudent, side: DriverTripAction, local?: DriverTripActionKind): DriverTripStudentStatus {
  if (local === "pickup") return "picked_up";
  if (local === "drop") return "dropped_off";
  if (local === "missed") return "missed";
  return statusForSide(side, student.pickup_status);
}

type StudentRowProps = {
  student: DriverTripStudent;
  side: DriverTripAction;
  localAction?: DriverTripActionKind;
  busy: boolean;
  onAction: (student: DriverTripStudent, action: DriverTripActionKind) => void;
};

const Chip = memo(function Chip({ status }: { status: DriverTripStudentStatus }) {
  const scheme: Record<DriverTripStudentStatus, string> = {
    pending: "bg-slate-700 text-slate-200",
    picked_up: "bg-emerald-500 text-emerald-950",
    dropped_off: "bg-emerald-500 text-emerald-950",
    missed: "bg-rose-500 text-rose-950",
  };
  const label = status === "picked_up" ? "Picked" : status === "dropped_off" ? "Dropped" : status;
  return (
    <View className={`px-2.5 py-1 rounded-lg ${scheme[status]}`}>
      <Text className="text-[10px] font-bold uppercase tracking-wide">{label}</Text>
    </View>
  );
});

const StudentRow = memo(function StudentRow({ student, side, localAction, busy, onAction }: StudentRowProps) {
  const status = effectiveStatus(student, side, localAction);
  const done = status !== "pending";
  const pickupDone = student.pickup_status !== "pending" || localAction === "pickup" || localAction === "missed";
  const dropDone = student.drop_status !== "pending" || localAction === "drop" || localAction === "missed";
  const canPickup = side === "pickup" && !pickupDone;
  const canDrop = side === "drop" && !dropDone;
  const canMiss = !done;

  const buttonBase = "flex-1 rounded-xl py-2.5 px-2 flex-row items-center justify-center";
  const disabledStyle = "opacity-40";

  return (
    <View
      accessible
      accessibilityLabel={`${student.name}, Class ${student.class}, status ${status}`}
      className={`mb-2 rounded-2xl border px-4 py-3 ${done ? "border-emerald-500/40 bg-slate-900" : "border-rose-500/30 bg-slate-900"}`}
    >
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-1 pr-2">
          <Text className="text-white text-base font-semibold">{student.name}</Text>
          <Text className="text-slate-400 text-sm mt-0.5">
            Class {student.class}
            {student.stop_name ? ` · ${student.stop_name}` : ""}
          </Text>
        </View>
        <Chip status={status} />
      </View>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Pick up ${student.name}`}
          accessibilityHint="Marks this student as picked up"
          className={`${buttonBase} ${canPickup ? "bg-emerald-500" : `bg-slate-800 ${disabledStyle}`}`}
          activeOpacity={0.8}
          disabled={!canPickup || busy}
          onPress={() => onAction(student, "pickup")}
        >
          <Ionicons name="arrow-up-circle" size={16} color={canPickup ? "#042F2E" : "#64748B"} />
          <Text className={`text-xs font-bold ml-1.5 ${canPickup ? "text-emerald-950" : "text-slate-400"}`}>PICKUP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Drop ${student.name}`}
          accessibilityHint="Marks this student as dropped off"
          className={`${buttonBase} ${canDrop ? "bg-emerald-500" : `bg-slate-800 ${disabledStyle}`}`}
          activeOpacity={0.8}
          disabled={!canDrop || busy}
          onPress={() => onAction(student, "drop")}
        >
          <Ionicons name="arrow-down-circle" size={16} color={canDrop ? "#042F2E" : "#64748B"} />
          <Text className={`text-xs font-bold ml-1.5 ${canDrop ? "text-emerald-950" : "text-slate-400"}`}>DROP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Mark ${student.name} missed`}
          accessibilityHint="Records this student as missed, reason flagged for follow up"
          className={`rounded-xl py-2.5 px-3 items-center justify-center ${canMiss ? "bg-rose-500/15" : `bg-slate-800 ${disabledStyle}`}`}
          activeOpacity={0.8}
          disabled={!canMiss || busy}
          onPress={() => onAction(student, "missed")}
        >
          <Text className={`text-[11px] font-bold ${canMiss ? "text-rose-300" : "text-slate-400"}`}>MISSED</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

function buildActionId(tripId: number, studentId: number, action: DriverTripActionKind): string {
  return `${tripId}-${studentId}-${action}-${Date.now()}`;
}

export default function StopAttendanceScreen() {
  const params = useLocalSearchParams<{ tripId?: string; stopId?: string }>();
  const tripId = params.tripId ? Number(params.tripId) : null;
  const stopId = params.stopId ? Number(params.stopId) : null;

  const [trip, setTrip] = useState<DriverTripSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingStop, setSavingStop] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMap, setActionMap] = useState<LocalActionMap>({});
  const [queueCount, setQueueCount] = useState(0);

  const load = useCallback(async () => {
    if (!tripId || !stopId) {
      router.replace("/transport/live-trip" as any);
      return;
    }

    try {
      setError(null);
      // Order matters: arrive at the stop FIRST, then fetch so the student
      // list reflects the backend state after the arrival is registered.
      try {
        await arriveAtStop(tripId, stopId);
      } catch (err: unknown) {
        // Arrival is idempotent; a failure here (e.g. already arrived, or
        // offline) must not block reading the stop's student roster.
        if (!isNetworkError(err)) {
          setError(getErrorMessage(err));
        }
      }
      const loaded = await fetchDriverTrip(tripId);
      setTrip(loaded);
      const queue = await getAttendanceQueue();
      setQueueCount(queue.length);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [stopId, tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  const side: DriverTripAction = trip?.type === "drop" ? "drop" : "pickup";

  const currentStop = useMemo(() => {
    if (!trip || !stopId) return null;
    return trip.stops.find((s) => s.id === stopId) ?? null;
  }, [stopId, trip]);

  const handleAction = useCallback(
    async (student: DriverTripStudent, action: DriverTripActionKind) => {
      if (!tripId || !currentStop) return;

      const actionId = buildActionId(tripId, student.id, action);
      const payload = {
        trip_id: tripId,
        trip_student_id: student.id,
        action,
        action_id: actionId,
        triggered_at: new Date().toISOString(),
      };

      setActionMap((prev) => ({ ...prev, [student.id]: action }));

      try {
        setBusy(true);
        await markDriverTripAction(payload);
        await flushAttendanceQueue();
      } catch {
        await enqueueAttendance(payload);
      }
      const queue = await getAttendanceQueue();
      setQueueCount(queue.length);
      setBusy(false);
    },
    [currentStop, tripId],
  );

  const pendingCount = useMemo(() => {
    if (!currentStop) return 0;
    return currentStop.students.filter((s) => effectiveStatus(s, side, actionMap[s.id]) === "pending").length;
  }, [actionMap, currentStop, side]);

  const handleCompleteStop = useCallback(async () => {
    if (!tripId || !stopId) return;

    const proceed = async () => {
      try {
        setSavingStop(true);
        await leaveStop(tripId, stopId);
        await flushAttendanceQueue();
        router.replace({ pathname: "/transport/live-trip", params: { tripId: String(tripId) } } as any);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setSavingStop(false);
      }
    };

    if (pendingCount > 0) {
      Alert.alert(
        "Unmarked students",
        `${pendingCount} student${pendingCount === 1 ? "" : "s"} haven't been marked yet. Leave this stop anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => void proceed() },
        ],
      );
      return;
    }
    await proceed();
  }, [pendingCount, stopId, tripId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#34D399" />
      </SafeAreaView>
    );
  }

  const routeInfo = trip ? `${side === "drop" ? "DROP" : "PICKUP"} · ${trip.route_name}` : "Stop Attendance";

  return (
    <SafeAreaView className="flex-1 bg-slate-950 px-4 py-3">
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-slate-400 text-xs uppercase tracking-[1.2px]">{routeInfo}</Text>
          <Text className="text-white text-xl font-bold mt-1">{currentStop?.name ?? "Stop"}</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Emergency"
          accessibilityHint="Opens the emergency screen"
          className="w-11 h-11 rounded-2xl bg-red-600 items-center justify-center"
          onPress={() => router.push("/transport/emergency" as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="call" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View className="mb-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 flex-row items-center justify-between">
        <Text className="text-slate-200 text-sm">
          {side === "drop" ? "Dropped" : "Picked"}: {(currentStop?.students.length ?? 0) - pendingCount}/{currentStop?.students.length ?? 0}
        </Text>
        <Text className={`text-sm font-semibold ${queueCount > 0 ? "text-amber-300" : "text-emerald-300"}`}>
          {queueCount > 0 ? `Sync Pending: ${queueCount}` : "Synced"}
        </Text>
      </View>

      {error ? <Text className="text-red-300 text-sm mb-2">{error}</Text> : null}

      <View className="flex-1">
        {currentStop && currentStop.students.length === 0 ? (
          <View className="items-center justify-center pt-16 pb-8">
            <Ionicons name="people-outline" size={40} color="#334155" />
            <Text className="text-slate-300 text-base font-semibold mt-3">No students at this stop</Text>
            <Text className="text-slate-500 text-sm mt-1 text-center px-8">
              No students are assigned to this stop. You can move to the next one.
            </Text>
          </View>
        ) : (
          currentStop?.students?.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              side={side}
              localAction={actionMap[student.id]}
              busy={busy || savingStop}
              onAction={handleAction}
            />
          ))
        )}
      </View>

      <TouchableOpacity
        className="min-h-[56px] rounded-2xl items-center justify-center bg-emerald-500"
        activeOpacity={0.85}
        onPress={handleCompleteStop}
        disabled={savingStop || busy}
        accessibilityRole="button"
        accessibilityLabel="Next stop"
        accessibilityHint="Leave this stop and continue the trip"
      >
        {savingStop ? (
          <ActivityIndicator color="#042F2E" />
        ) : (
          <Text className="text-lg font-bold text-emerald-950">NEXT STOP</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}