
export const APP_NAME = "School Parent";
export const APP_VERSION = "1.0.0";

export const STORAGE_KEYS = {
  AUTH_TOKEN: "school_parent_auth_token",
  USER_DATA: "school_parent_user_data",
  STUDENTS: "school_parent_students",
} as const;

export const QUERY_KEYS = {
  DASHBOARD: "dashboard",
  STUDENTS: "students",
  ATTENDANCE: "attendance",
  FEES: "fees",
  HOMEWORK: "homework",
  NOTIFICATIONS: "notifications",
  TIMETABLE: "timetable",
  RESULTS: "results",
  LEAVE_REQUESTS: "leave-requests",
  CALENDAR: "calendar",
  DOCUMENTS: "documents",
  CIRCULARS: "circulars",
} as const;