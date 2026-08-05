import axios from "axios";
import { API_BASE_URL } from "@/config/api";
import { storage } from "@/utils/storage";
import { STORAGE_KEYS } from "@/constants/config";
import { useAuthStore } from "@/store/auth.store";
import type { AttendanceData, DashboardData, NotificationItem, StudentFee, ExamResultRecord, TimetableData, HomeworkItem, CalendarEvent, StudentDocument, CircularItem, LeaveRequest, LeaveRequestPayload, TransportDashboardData, TransportData, TransportStop } from "@/types";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
    const fullUrl = `${config.baseURL ?? API_BASE_URL}${config.url ?? ""}`;
    console.log("[API] REQUEST:", config.method?.toUpperCase(), fullUrl);
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

apiClient.interceptors.response.use(
  (response) => {
    console.log("[API] RESPONSE:", response.status, response.config.url);
    return response;
  },
  async (error) => {
    if (error.response) {
      console.log("[API] ERROR:", error.response.status, error.response.config.url, error.response.data);
    } else if (error.request) {
      console.log("[API] ERROR: Network Error - no response received:", error.config?.url);
    } else {
      console.log("[API] ERROR:", error.message);
    }
    if (error.response?.status === 401) {
      await clearAuthData();
    }
    return Promise.reject(error);
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

export default apiClient;
