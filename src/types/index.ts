export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role: "parent" | "driver";
}

export interface Student {
  id: number;
  uuid: string;
  name: string;
  class: string;
  section: string;
  roll_number: string;
  admission_no: string;
  avatar_url: string | null;
}

export interface AuthState {
  user: User | null;
  students: Student[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  parentUuid: string | null;
  selectedStudentUuid: string | null;
  driverUuid: string | null;
  assignedVehicleId: number | null;
  assignedRouteId: number | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  students: Student[];
  token: string;
  parent_uuid?: string;
  driver_uuid?: string;
  vehicle_id?: number;
  route_id?: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  attendance_date: string;
  status: "present" | "absent" | "late" | "half_day";
  remark: string | null;
}

export interface AttendanceData {
  student: Record<string, unknown>;
  month: number;
  year: number;
  summary: {
    total_days: number;
    counts: Record<string, number>;
  };
  records: AttendanceRecord[];
}

export interface FeeItem {
  id: number;
  fee_category_id: number;
  amount: number;
  paid: number;
  balance: number;
  fee_category: string | null;
  due_date: string | null;
  status: "paid" | "partial" | "pending";
}

export interface StudentFee {
  id: number;
  student_id: number;
  total_amount: number;
  total_paid: number;
  total_balance: number;
  status: "paid" | "partial" | "unpaid";
  assigned_at: string | null;
  items: FeeItem[];
}

export interface ExamResultRecord {
  id: number;
  exam_id: number;
  exam_name: string;
  exam_type?: string;
  exam_date?: string;
  subject_name: string | null;
  subject: string | null;
  maximum_marks: number;
  pass_marks?: number;
  student_id: number;
  student_name?: string;
  admission_no?: string;
  marks_obtained: number;
  grade: string | null;
  remarks: string | null;
  status?: string;
  percentage?: number;
}

export interface TimetableSlot {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: { id: number; name: string } | null;
  teacher: { id: number; name: string } | null;
  room: string | null;
}

export type TimetableData = Record<string, TimetableSlot[]>;

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: "general" | "attendance" | "fees" | "homework" | "result";
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface DashboardData {
  students: Record<string, unknown>[];
  attendance_summary: {
    present: number;
    absent: number;
    total: number;
    percentage: number;
  };
  fees_summary: {
    total: number;
    paid: number;
    pending: number;
  };
  exam_results_summary: {
    average: number;
    subjects: number;
    total_marks: number;
    obtained_marks: number;
  };
  notifications: NotificationItem[];
  leave_summary?: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

export interface HomeworkItem {
  id: number;
  subject_name: string | null;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
  attachment_url: string | null;
  status: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  is_published: boolean;
  location: string | null;
  audience: string | null;
}

export interface StudentDocument {
  id: number;
  title: string;
  document_type: string;
  document_type_label: string;
  file_name: string;
  file_size: number;
  file_size_formatted: string;
  mime_type: string;
  is_verified: boolean;
  verification_status_label: string;
  issue_date: string | null;
  expiry_date: string | null;
  remarks: string | null;
  download_url: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: number;
  student_id: number;
  student_name: string | null;
  leave_type_id: number;
  leave_type: string | null;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  status_label: string;
  attachment_url: string | null;
  remarks: string | null;
  created_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface LeaveRequestPayload {
  leave_type_id?: number;
  leave_type?: string;
  from_date: string;
  to_date: string;
  reason: string;
}

export interface CircularItem {
   id: number;
   title: string;
   body: string;
   message: string;
   type: string;
   type_label: string;
   priority: string;
   sent_at: string;
   created_at: string;
   is_read: boolean;
   read_at: string | null;
   created_by: { id: number; name: string } | null;
}

export interface TransportStop {
   id: number;
   stop_name: string;
   pickup_time: string | null;
   drop_time: string | null;
   sequence: number;
   is_student_stop: boolean;
}

export interface TransportData {
   vehicle_number: string | null;
   vehicle_name: string | null;
   vehicle_type: string | null;
   driver_name: string | null;
   driver_mobile: string | null;
   driver_license: string | null;
   route_name: string | null;
   route_start: string | null;
   route_end: string | null;
   pickup_stop: string | null;
   drop_stop: string | null;
   pickup_time: string | null;
   drop_time: string | null;
   status: string;
   monthly_fee: number | null;
}

export interface TransportDashboardData {
   transport: TransportData | null;
   stops: TransportStop[];
}

export interface TransportLiveData {
  transport?: Record<string, unknown> | null;
  vehicle?: Record<string, unknown> | null;
  assignment?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
  stops?: Record<string, unknown>[];
  route_stops?: Record<string, unknown>[];
  locations?: Record<string, unknown>[];
  current_location?: {
    latitude?: number;
    longitude?: number;
    speed?: number | null;
    heading?: number | null;
    accuracy?: number | null;
    recorded_at?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface VehicleLocationHistoryPoint {
  latitude?: number;
  longitude?: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  recorded_at?: string | null;
  [key: string]: unknown;
}

export interface DriverLocationSnapshot {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  timestamp: string;
}

export type DriverTripStatus = "not_started" | "in_progress" | "completed";

export type DriverTripStudentStatus = "pending" | "picked_up" | "dropped_off" | "missed";

export type DriverTripAction = "pickup" | "drop";

export type DriverTripActionKind = DriverTripAction | "missed";

export interface DriverTripStudent {
  /** trip_student_id — the id the pickup/drop/missed endpoints take */
  id: number;
  name: string;
  class: string;
  pickup_status: DriverTripStudentStatus;
  drop_status: DriverTripStudentStatus;
  stop_name?: string | null;
  stop_sequence?: number | null;
  picked_up_at?: string | null;
  dropped_off_at?: string | null;
}

export interface DriverTripStop {
  id: number;
  name: string;
  sequence: number;
  eta?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  arrived_at?: string | null;
  left_at?: string | null;
  students: DriverTripStudent[];
}

export interface DriverTripSummary {
  id: number;
  status: DriverTripStatus;
  type: "pickup" | "drop";
  route_name: string;
  vehicle_number: string;
  start_time: string | null;
  total_stops: number;
  total_students: number;
  completed_stops: number;
  picked_students: number;
  current_stop_id: number | null;
  next_stop_id: number | null;
  started_at: string | null;
  stops: DriverTripStop[];
  students: DriverTripStudent[];
}

export interface DriverTripStateResponse {
  has_active_trip: boolean;
  trip: DriverTripSummary | null;
}

export interface TripHistoryItem {
  id: number;
  status?: string;
  type?: "pickup" | "drop";
  route_name?: string | null;
  vehicle_number?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  total_stops?: number;
  completed_stops?: number;
  total_students?: number;
  picked_students?: number;
  dropped_students?: number;
  [key: string]: unknown;
}

export interface SosAlertPayload {
  driver_id?: number | null;
  driver_uuid?: string | null;
  trip_id?: number | null;
  vehicle_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  recorded_at?: string | null;
  message?: string | null;
}

export type DriverTripActionPayload = {
  trip_id: number;
  trip_student_id: number;
  action: DriverTripActionKind;
  action_id: string;
  triggered_at: string;
};

export interface QueuedDriverAction extends DriverTripActionPayload {
  queued_at: string;
  retries: number;
  last_error?: string;
}

// ─── Live Trip Location Tracking ──────────────────────────────

export interface TripLocationPoint {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  accuracy?: number | null;
  timestamp: string;
}

export interface QueuedTripLocation extends TripLocationPoint {
  trip_id: number;
  queued_at: string;
  retries: number;
  last_error?: string;
}

export type TripTrackingStatus = "idle" | "tracking" | "paused" | "denied" | "gps_off" | "offline" | "error";
