import axios from "axios";
import { API_BASE_URL_FULL } from "@/config/api";
import { storage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { useAuthStore } from "@/store/auth.store";
import type { AttendanceData, DashboardData, NotificationItem, StudentFee, ExamResultRecord, TimetableData, HomeworkItem, CalendarEvent, StudentDocument, CircularItem, LeaveRequest, LeaveRequestPayload, TransportDashboardData, TransportData, TransportStop, TransportLiveData, VehicleLocationHistoryPoint, DriverTripActionPayload, DriverTripStateResponse, DriverTripSummary, DriverTripStudent, DriverTripStudentStatus, TripLocationPoint, TripHistoryItem, SosAlertPayload } from "@/types";

const apiClient = axios.create({
  baseURL: API_BASE_URL_FULL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

async function resolveToken(): Promise<string | undefined> {
  const raw = await storage.get<string>(STORAGE_KEYS.AUTH_TOKEN);
  if (typeof raw === "string") return raw;
  const store = await storage.get<{ token?: string }>("school_parent_auth_store");
  if (store?.token) return store.token;
  if (raw && typeof raw === "object" && "token" in raw) {
    return (raw as Record<string, unknown>).token as string;
  }
  return undefined;
}

async function clearAuthData(): Promise<void> {
  await storage.remove(STORAGE_KEYS.AUTH_TOKEN);
  await storage.remove(STORAGE_KEYS.USER_DATA);
  await storage.remove("school_parent_auth_store");
  const authStore = useAuthStore.getState();
  authStore.logout();
}

apiClient.interceptors.request.use(
  async (config) => {
    const token = await resolveToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (__DEV__) {
      const fullUrl = `${config.baseURL ?? API_BASE_URL_FULL}${config.url ?? ""}`;
      console.log("[API] REQUEST:", config.method?.toUpperCase(), fullUrl);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export function isNetworkError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const err = error as { response?: unknown; request?: unknown; message?: string };
    if (err.response) return false;
    if (err.request) return true;
    if (err.message === "Network Error") return true;
  }
  return false;
}

export function isTimeoutError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const err = error as { message?: string; code?: string };
    return err.code === "ECONNABORTED" || err.message?.includes("timeout") === true;
  }
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return "No internet connection. Please check your network settings.";
  }
  if (isTimeoutError(error)) {
    return "Request timed out. Please try again.";
  }
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message ?? err.message ?? "Something went wrong. Please try again.";
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_METHODS = new Set(["get", "head", "options"]);

apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log("[API] RESPONSE:", response.status, response.config.url);
    }
    return response;
  },
  async (error) => {
    if (error.response) {
      if (__DEV__) {
        console.log("[API] ERROR:", error.response.status, error.response.config?.url, error.response.data);
      }
      if (error.response.status === 401) {
        await clearAuthData();
      }
      return Promise.reject(error);
    }

    // No response received → network failure or timeout. Automatic retry is
    // safe for GET/HEAD and for endpoints that opt in (`retryable`). Mutating
    // trip actions (start/end) are NOT retried to avoid double side-effects.
    if (__DEV__) {
      console.log("[API] ERROR: network/timeout ->", error.config?.url);
    }

    const config = error.config;
    const method = typeof config?.method === "string" ? config.method.toLowerCase() : "get";
    const optedIn = config?.retryable === true;
    const safeToRetry = optedIn || RETRYABLE_METHODS.has(method);
    const maxRetries = optedIn ? 2 : 1;
    const retryCount = config?.retryCount ?? 0;

    if (!config || !safeToRetry || retryCount >= maxRetries) {
      return Promise.reject(error);
    }

    const backoffMs = 500 * Math.pow(2, retryCount); // 1s, then 2s
    await sleep(backoffMs);
    config.retryCount = retryCount + 1;
    config.timeout = Math.max(config.timeout ?? 15000, 15000) + 10000;
    return apiClient(config);
  },
);

function unwrap<T>(response: { data: { success: boolean; data: T; message?: string } }): T {
  const body = response.data;
  if (!body?.success) {
    throw new Error(body?.message ?? "API request failed");
  }
  return body.data;
}

// ─── Parent / Dashboard ────────────────────────────────────────────

export async function fetchDashboard(parentUuid: string, childUuid?: string): Promise<DashboardData> {
  const params: Record<string, string> = {};
  if (childUuid) {
    params.child_uuid = childUuid;
  }
  const res = await apiClient.get(`/parents/${parentUuid}/dashboard`, { params });
  return unwrap<DashboardData>(res);
}

export async function fetchParent(parentUuid: string): Promise<Record<string, unknown>> {
  const res = await apiClient.get(`/parents/${parentUuid}`);
  return unwrap(res);
}

// ─── Attendance ─────────────────────────────────────────────────────

export async function fetchAttendance(
  parentUuid: string,
  childUuid: string,
  month?: number,
  year?: number,
): Promise<AttendanceData> {
  const params: Record<string, number> = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const res = await apiClient.get(`/parents/${parentUuid}/children/${childUuid}/attendance`, { params });
  return unwrap<AttendanceData>(res);
}

// ─── Fees ───────────────────────────────────────────────────────────

export async function fetchFees(parentUuid: string, childUuid: string): Promise<StudentFee[]> {
  const res = await apiClient.get(`/parents/${parentUuid}/children/${childUuid}/fees`);
  return unwrap<StudentFee[]>(res);
}

// ─── Exam Results ───────────────────────────────────────────────────

export async function fetchExamResults(
  parentUuid: string,
  childUuid: string,
): Promise<{ student: Record<string, unknown>; results_by_academic_year: Record<string, ExamResultRecord[]> }> {
  const res = await apiClient.get(`/parents/${parentUuid}/children/${childUuid}/exams`);
  return unwrap(res);
}

// ─── Timetable ──────────────────────────────────────────────────────

export async function fetchTimetable(parentUuid: string, childUuid: string): Promise<{ timetable: TimetableData }> {
  const res = await apiClient.get(`/parents/${parentUuid}/children/${childUuid}/timetable`);
  return unwrap(res);
}

// ─── Children ───────────────────────────────────────────────────────

export async function fetchChildren(parentUuid: string): Promise<Record<string, unknown>[]> {
  const res = await apiClient.get(`/parents/${parentUuid}/children`);
  return unwrap(res);
}

// ─── Me ─────────────────────────────────────────────────────────────

export async function fetchMe(): Promise<{
  user: Record<string, unknown>;
  roles: string[];
  permissions: string[];
  students?: Record<string, unknown>[];
  parent_uuid?: string;
}> {
  const res = await apiClient.get("/me");
  return unwrap(res);
}

// ─── Notifications ──────────────────────────────────────────────────

const NOTIFICATION_TYPE_MAP: Record<string, NotificationItem["type"]> = {
  attendance_alert: "attendance",
  fee_reminder: "fees",
  exam_result_alert: "result",
  announcement: "general",
  timetable_update: "general",
};

function normalizeNotification(raw: Record<string, unknown>): NotificationItem {
  if (!raw || typeof raw !== "object") {
    return {
      id: 0,
      title: "",
      body: "",
      type: "general",
      is_read: false,
      created_at: "",
      data: undefined,
    };
  }
  const rawId = raw.id;
  return {
    id: typeof rawId === "number" ? rawId : typeof rawId === "string" ? parseInt(rawId, 10) || 0 : 0,
    title: (raw.title as string) ?? "",
    body: ((raw.body as string) ?? (raw.message as string) ?? ""),
    type: NOTIFICATION_TYPE_MAP[raw.type as string] ?? "general",
    is_read: (raw.is_read as boolean) ?? false,
    created_at: (raw.created_at as string) ?? "",
    data: raw.data as Record<string, unknown> | undefined,
  };
}

export async function fetchNotifications(page = 1): Promise<{
  data: NotificationItem[];
  meta: { current_page: number; last_page: number; total: number };
}> {
  const res = await apiClient.get("/notifications", { params: { page } });
  const body = unwrap<{ data: Record<string, unknown>[]; meta: { current_page: number; last_page: number; total: number } }>(res);
  const rawItems = (body.data ?? []) as Record<string, unknown>[];
  return {
    data: rawItems.map(normalizeNotification),
    meta: body.meta,
  };
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  const res = await apiClient.get("/notifications/unread");
  const data = unwrap<{ unread_count: number }>(res);
  return { count: data.unread_count };
}

export async function markNotificationRead(id: number): Promise<void> {
  await unwrap<void>(await apiClient.post(`/notifications/${id}/read`));
}

export async function markAllNotificationsRead(): Promise<void> {
  await unwrap<void>(await apiClient.post("/notifications/read-all"));
}

// ─── Homework ───────────────────────────────────────────────────────

export async function fetchHomework(parentUuid: string, childUuid: string): Promise<HomeworkItem[]> {
  const res = await apiClient.get(`/parents/${parentUuid}/children/${childUuid}/homework`);
  const data = unwrap<{ homework: HomeworkItem[] }>(res);
  return data.homework;
}

// ─── Academic Calendar ──────────────────────────────────────────────

export async function fetchCalendar(
  parentUuid: string,
  childUuid: string,
  month?: number,
  year?: number,
  eventType?: string,
): Promise<CalendarEvent[]> {
  const params: Record<string, string | number> = {};
  if (month) params.month = month;
  if (year) params.year = year;
  if (eventType) params.type = eventType;
  const res = await apiClient.get(`/parents/${parentUuid}/children/${childUuid}/calendar`, { params });
  const data = unwrap<{ events: CalendarEvent[] }>(res);
  return data.events;
}

// ─── Student Documents ──────────────────────────────────────────────

export async function fetchDocuments(parentUuid: string, childUuid: string): Promise<StudentDocument[]> {
  const res = await apiClient.get(`/parents/${parentUuid}/children/${childUuid}/documents`);
  const data = unwrap<{ documents: StudentDocument[] }>(res);
  return data.documents;
}

// ─── Circulars / Announcements ────────────────────────────────────

export async function fetchCirculars(parentUuid: string, page = 1): Promise<{
  data: CircularItem[];
  meta: { current_page: number; last_page: number; total: number };
}> {
  const res = await apiClient.get(`/parents/${parentUuid}/circulars`, { params: { page } });
  const body = res.data;
  return {
    data: (body.data ?? []) as CircularItem[],
    meta: body.meta as { current_page: number; last_page: number; total: number },
  };
}

export async function fetchCircularDetail(parentUuid: string, id: number): Promise<CircularItem> {
  const res = await apiClient.get(`/parents/${parentUuid}/circulars/${id}`);
  return unwrap<CircularItem>(res);
}

export async function markCircularRead(parentUuid: string, id: number): Promise<void> {
  await unwrap<void>(await apiClient.post(`/parents/${parentUuid}/circulars/${id}/read`));
}

// ─── Leave Requests ─────────────────────────────────────────────────

export async function fetchLeaveRequests(parentUuid: string, childUuid: string): Promise<LeaveRequest[]> {
  const res = await apiClient.get(`/parents/${parentUuid}/children/${childUuid}/leave-requests`);
  const data = unwrap<{ leave_requests: LeaveRequest[] }>(res);
  return data.leave_requests;
}

export async function fetchLeaveRequestDetail(parentUuid: string, childUuid: string, id: number): Promise<LeaveRequest> {
  const res = await apiClient.get(`/parents/${parentUuid}/children/${childUuid}/leave-requests/${id}`);
  const data = unwrap<{ leave_request: LeaveRequest }>(res);
  return data.leave_request;
}

export async function submitLeaveRequest(parentUuid: string, childUuid: string, payload: LeaveRequestPayload): Promise<LeaveRequest> {
  const res = await apiClient.post(`/parents/${parentUuid}/children/${childUuid}/leave-requests`, payload);
  const data = unwrap<{ leave_request: LeaveRequest }>(res);
  return data.leave_request;
}

export async function updateLeaveRequest(parentUuid: string, childUuid: string, id: number, payload: Partial<LeaveRequestPayload>): Promise<LeaveRequest> {
  const res = await apiClient.put(`/parents/${parentUuid}/children/${childUuid}/leave-requests/${id}`, payload);
  const data = unwrap<{ leave_request: LeaveRequest }>(res);
  return data.leave_request;
}

// ─── Profile ────────────────────────────────────────────────────────

export interface ProfileUpdatePayload {
  phone?: string;
  email?: string;
  address?: string;
  profile_photo?: string;
}

export async function updateProfile(parentUuid: string, payload: ProfileUpdatePayload): Promise<Record<string, unknown>> {
  const res = await apiClient.put(`/parents/${parentUuid}`, payload);
  return unwrap(res);
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export async function changePassword(parentUuid: string, payload: ChangePasswordPayload): Promise<Record<string, unknown>> {
   const res = await apiClient.put(`/parents/${parentUuid}/change-password`, payload);
   return unwrap<Record<string, unknown>>(res);
}

// ─── Transport ──────────────────────────────────────────────

export async function fetchTransportDashboard(parentUuid: string, childUuid: string): Promise<TransportDashboardData> {
   const res = await apiClient.get(`/parents/${parentUuid}/children/${childUuid}/transport`);
   const body = unwrap<{ transport: Record<string, unknown> | null; stops: Record<string, unknown>[] }>(res);
   return {
     transport: (body.transport ?? null) as unknown as TransportData | null,
     stops: (body.stops ?? []) as unknown as TransportStop[],
   };
 }

export async function fetchTransportLive(): Promise<TransportLiveData> {
  const res = await apiClient.get("/transport/live");
  return unwrap<TransportLiveData>(res);
}

export interface VehicleLocationPayload {
  vehicle_id: number;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  recorded_at?: string;
}

export async function updateVehicleLocation(payload: VehicleLocationPayload): Promise<Record<string, unknown>> {
  const res = await apiClient.post("/transport/location", payload);
  return unwrap<Record<string, unknown>>(res);
}

export async function fetchVehicleLocationHistory(vehicleId: number): Promise<VehicleLocationHistoryPoint[]> {
  const res = await apiClient.get(`/transport/vehicle/${vehicleId}/location`);
  const data = unwrap<{ data?: VehicleLocationHistoryPoint[]; locations?: VehicleLocationHistoryPoint[] }>(res);
  return data.data ?? data.locations ?? [];
}

export interface DriverRouteActionPayload {
  route_id: number;
  vehicle_id: number;
  stop_id?: number;
  student_id?: number;
  latitude?: number;
  longitude?: number;
  trip_status?: "started" | "completed";
  pickup_status?: "waiting" | "boarded" | "absent";
  drop_status?: "dropped" | "not_dropped" | "absent";
  notes?: string;
}

export async function startDriverShift(payload: DriverRouteActionPayload): Promise<Record<string, unknown>> {
  const res = await apiClient.post("/transport/shift/start", payload);
  return unwrap<Record<string, unknown>>(res);
}

export async function endDriverShift(payload: DriverRouteActionPayload): Promise<Record<string, unknown>> {
  const res = await apiClient.post("/transport/shift/end", payload);
  return unwrap<Record<string, unknown>>(res);
}

export async function markPickup(payload: DriverRouteActionPayload): Promise<Record<string, unknown>> {
  const res = await apiClient.post("/transport/pickup", payload);
  return unwrap<Record<string, unknown>>(res);
}

export async function markDrop(payload: DriverRouteActionPayload): Promise<Record<string, unknown>> {
  const res = await apiClient.post("/transport/drop", payload);
  return unwrap<Record<string, unknown>>(res);
}

// ─── Driver Trip Execution ───────────────────────────────────────
//
// The Laravel backend models trips as pre-created records (status:
// "scheduled" | "in_progress" | "completed") scoped to a driver + date.
//   GET  /driver/trips/current   -> current (or next scheduled) trip
//   POST /driver/trips/start     -> body { trip_id } (validated required)
//   GET  /driver/trips/{trip}    -> trip + route + vehicle + stops
// Payloads nest `trip` / `route` / `vehicle` / `stops`, so we normalize
// them into the app's flat DriverTripSummary shape.

type DriverTripStatusRaw = "scheduled" | "in_progress" | "completed";

function normalizeDriverStatus(status: unknown): DriverTripSummary["status"] {
  if (status === "in_progress" || status === "completed") return status;
  return "not_started";
}

function normalizeDriverPickupStatus(value: unknown): DriverTripStudentStatus {
  if (value === "picked_up" || value === "missed") return value;
  return "pending";
}

function normalizeDriverDropStatus(value: unknown): DriverTripStudentStatus {
  if (value === "dropped_off" || value === "missed") return value;
  return "pending";
}

function normalizeDriverStudentMap(student: Record<string, unknown>): DriverTripStudent {
  return {
    // Backend pickup/drop/mark-missed routes take `trip_student_id`
    // (the pivot id), never the raw student id.
    id:
      typeof student.trip_student_id === "number"
        ? (student.trip_student_id as number)
        : typeof student.id === "number"
          ? (student.id as number)
          : 0,
    name:
      (typeof student.name === "string" && student.name.trim().length > 0 ? student.name : null) ??
      (typeof student.student_name === "string" && (student.student_name as string).trim().length > 0 ? (student.student_name as string) : null) ??
      "Student",
    class: typeof student.class === "string" ? (student.class as string) : "",
    pickup_status: normalizeDriverPickupStatus(student.pickup_status),
    drop_status: normalizeDriverDropStatus(student.drop_status),
    stop_name: typeof student.stop_name === "string" && (student.stop_name as string).trim().length > 0 ? (student.stop_name as string) : null,
    stop_sequence: typeof student.stop_sequence === "number" ? (student.stop_sequence as number) : null,
    picked_up_at: typeof student.picked_up_at === "string" ? (student.picked_up_at as string) : null,
    dropped_off_at: typeof student.dropped_off_at === "string" ? (student.dropped_off_at as string) : null,
  };
}

function normalizeDriverTripDetails(payload: Record<string, unknown> | null): DriverTripSummary {
  const trip = (payload?.trip && typeof payload.trip === "object" ? (payload.trip as Record<string, unknown>) : {}) as Record<string, unknown>;
  const route = (payload?.route && typeof payload.route === "object" ? (payload.route as Record<string, unknown>) : {}) as Record<string, unknown>;
  const vehicle = payload?.vehicle && typeof payload.vehicle === "object" ? (payload.vehicle as Record<string, unknown>) : null;
  const rawStops = Array.isArray(payload?.stops) ? (payload.stops as Record<string, unknown>[]) : [];
  const rawStudents = Array.isArray(payload?.students) ? (payload.students as Record<string, unknown>[]) : [];

  const startedAt = typeof trip.started_at === "string" ? trip.started_at : null;
  const stops = rawStops.map((stop, index) => ({
    id: typeof stop.stop_id === "number" ? stop.stop_id : typeof stop.id === "number" ? (stop.id as number) : index + 1,
    name:
      (typeof stop.stop_name === "string" && stop.stop_name.trim().length > 0 ? stop.stop_name : null) ??
      (typeof stop.name === "string" && stop.name.trim().length > 0 ? (stop.name as string) : null) ??
      `Stop ${index + 1}`,
    sequence: typeof stop.sequence === "number" ? (stop.sequence as number) : index + 1,
    eta: typeof stop.eta === "string" ? (stop.eta as string) : null,
    latitude: typeof stop.latitude === "number" ? (stop.latitude as number) : null,
    longitude: typeof stop.longitude === "number" ? (stop.longitude as number) : null,
    arrived_at: typeof stop.arrived_at === "string" ? (stop.arrived_at as string) : null,
    left_at: typeof stop.left_at === "string" ? (stop.left_at as string) : null,
    students: Array.isArray(stop.students) ? (stop.students as Record<string, unknown>[]).map(normalizeDriverStudentMap) : [],
  }));

  // Progress is authoritative from the backend (per-stop arrived_at/left_at).
  // Fall back to local derivation when a response omits it so behaviour stays
  // stable against older payloads.
  const currentFromStops = (() => {
    const current = stops.find((stop) => Boolean(stop.arrived_at) && !stop.left_at);
    return current ? current.id : null;
  })();
  const completedFromStops = stops.filter((stop) => Boolean(stop.left_at)).length;
  const nextFromStops = (() => {
    if (currentFromStops == null) return null;
    const idx = stops.findIndex((stop) => stop.id === currentFromStops);
    if (idx >= 0 && idx + 1 < stops.length) return stops[idx + 1].id;
    return null;
  })();

  const type = trip.type === "drop" ? "drop" : "pickup";

  return {
    id: typeof trip.id === "number" ? (trip.id as number) : 0,
    status: normalizeDriverStatus(trip.status as DriverTripStatusRaw),
    type,
    route_name: (typeof route.route_name === "string" && route.route_name.trim().length > 0 ? route.route_name : "") as string,
    vehicle_number: (typeof vehicle?.vehicle_number === "string" && (vehicle.vehicle_number as string).trim().length > 0 ? (vehicle.vehicle_number as string) : "") as string,
    start_time: startedAt,
    total_stops: typeof route.total_stops === "number" ? (route.total_stops as number) : stops.length,
    total_students: typeof trip.total_students === "number" ? (trip.total_students as number) : rawStudents.length,
    completed_stops: typeof trip.completed_stops === "number" ? (trip.completed_stops as number) : completedFromStops,
    picked_students: typeof trip.picked_up_count === "number" ? (trip.picked_up_count as number) : 0,
    current_stop_id: typeof trip.current_stop_id === "number" ? (trip.current_stop_id as number) : currentFromStops,
    next_stop_id: typeof trip.next_stop_id === "number" ? (trip.next_stop_id as number) : nextFromStops,
    started_at: startedAt,
    stops,
    students: rawStudents.map(normalizeDriverStudentMap),
  };
}

export async function fetchDriverTripState(): Promise<DriverTripStateResponse> {
  const res = await apiClient.get("/driver/trips/current");
  const payload = unwrap<Record<string, unknown>>(res);
  const tripPayload =
    payload.trip && typeof payload.trip === "object" && Object.keys(payload.trip as Record<string, unknown>).length > 0
      ? (payload as Record<string, unknown>)
      : null;
  const trip = tripPayload ? normalizeDriverTripDetails(tripPayload) : null;
  return {
    has_active_trip: trip !== null,
    trip,
  };
}

export async function fetchDriverTrip(tripId: number): Promise<DriverTripSummary> {
  const res = await apiClient.get(`/driver/trips/${tripId}`);
  const payload = unwrap<Record<string, unknown>>(res);
  return normalizeDriverTripDetails(payload);
}

export async function startDriverTrip(tripId: number): Promise<DriverTripSummary> {
  const res = await apiClient.post("/driver/trips/start", { trip_id: tripId });
  const payload = unwrap<{ trip?: Record<string, unknown> }>(res);
  return normalizeDriverTripDetails({ trip: payload?.trip ?? {} } as Record<string, unknown>);
}

export async function arriveAtStop(tripId: number, stopId: number): Promise<DriverTripSummary> {
  const res = await apiClient.post(`/driver/trips/${tripId}/arrive-stop`, { route_stop_id: stopId });
  unwrap(res);
  return fetchDriverTrip(tripId);
}

export async function leaveStop(tripId: number, stopId: number): Promise<DriverTripSummary> {
  const res = await apiClient.post(`/driver/trips/${tripId}/leave-stop`, { route_stop_id: stopId });
  unwrap(res);
  return fetchDriverTrip(tripId);
}

export async function markDriverTripAction(payload: DriverTripActionPayload): Promise<Record<string, unknown>> {
  const endpoint =
    payload.action === "missed"
      ? `/driver/trips/${payload.trip_id}/mark-missed`
      : `/driver/trips/${payload.trip_id}/${payload.action}`;
  const res = await apiClient.post(
    endpoint,
    {
      trip_student_id: payload.trip_student_id,
      triggered_at: payload.triggered_at,
    },
    {
      headers: {
        "Idempotency-Key": payload.action_id,
      },
      retryable: true,
    },
  );
  return unwrap<Record<string, unknown>>(res);
}

export async function endDriverTrip(tripId: number): Promise<DriverTripSummary> {
  const res = await apiClient.post(`/driver/trips/${tripId}/end`);
  const payload = unwrap<{ trip?: Record<string, unknown> }>(res);
  return normalizeDriverTripDetails({ trip: payload?.trip ?? {} } as Record<string, unknown>);
}

// ─── Driver SOS / Trip History / Push Tokens ──────────────────

export async function sendSosAlert(payload: SosAlertPayload): Promise<Record<string, unknown>> {
  const res = await apiClient.post("/driver/sos", payload);
  return unwrap<Record<string, unknown>>(res);
}

export async function fetchTripHistory(): Promise<TripHistoryItem[]> {
  const res = await apiClient.get("/driver/trips/history");
  const body = unwrap<{ trips?: TripHistoryItem[]; data?: TripHistoryItem[] }>(res);
  return body.trips ?? body.data ?? [];
}

export async function registerPushToken(
  token: string,
  platform: "android" | "ios",
): Promise<Record<string, unknown> | null> {
  try {
    const res = await apiClient.post("/driver/push-token", { token, platform });
    return unwrap<Record<string, unknown>>(res);
  } catch {
    // Best-effort — push registration must never block app flows.
    return null;
  }
}

// ─── Driver Trip Live Location ────────────────────────────────

const MAX_LOCATION_BATCH_SIZE = 20;

export async function uploadTripLocations(tripId: number, points: TripLocationPoint[]): Promise<Record<string, unknown>> {
  const res = await apiClient.post(
    `/driver/trips/${tripId}/location`,
    {
      locations: points,
    },
    { retryable: true },
  );
  return unwrap<Record<string, unknown>>(res);
}

export async function uploadTripLocation(tripId: number, point: TripLocationPoint): Promise<Record<string, unknown>> {
  const res = await apiClient.post(
    `/driver/trips/${tripId}/location`,
    point,
    { retryable: true },
  );
  return unwrap<Record<string, unknown>>(res);
}

export async function isLocationBatchSupported(): Promise<boolean> {
  return MAX_LOCATION_BATCH_SIZE > 0;
}

export default apiClient;
