# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Dependency Management

For all Expo React Native dependencies, NEVER use npm install directly for native packages. Always use `npx expo install <package>` so versions stay compatible with the current Expo SDK. Do not upgrade React Native, Reanimated, Gesture Handler, or Expo packages independently.

# Project Architecture — School ERP Parent App

## Backend (Laravel)

### Key Files
- `app/Http/Controllers/Api/V1/ParentApiController.php` — REST API for parent dashboard, attendance, fees, exams, timetable
- `app/Modules/Parents/Services/ParentService.php` — Business logic for dashboard aggregation
- `app/Modules/Auth/Controllers/ApiAuthController.php` — Login, me, logout, token refresh
- `routes/modules/api.php` — API route definitions at `/api/v1/`

### Auth Response Format
Login/me returns wrapped in `{ success, message, data: { token, user, students, parent_uuid } }`.
- `user` — UserResource with roles
- `students` — Array of `{ id, uuid, name, class, section, roll_number, admission_no, photo }`
- `parent_uuid` — UUID of the Guardian record (added to both login and me responses)

### Parent API Endpoints (all require `parent_uuid`)
- `GET /parents/{uuid}/dashboard` — Aggregated dashboard data (students, attendance_summary, fees_summary, exam_results_summary, notifications)
- `GET /parents/{uuid}/children/{childUuid}/attendance?month=&year=` — Monthly attendance records with counts
- `GET /parents/{uuid}/children/{childUuid}/fees` — StudentFee collection with items
- `GET /parents/{uuid}/children/{childUuid}/exams` — Exam results grouped by academic year
- `GET /parents/{uuid}/children/{childUuid}/timetable` — Weekly timetable grouped by day_of_week
- `GET /parents/{uuid}/children/{childUuid}/homework` — Homework assignments with attachments
- `GET /parents/{uuid}/children/{childUuid}/calendar?month=&year=&type=` — Academic calendar events (holidays, exams, PTMs, sports, annual day)
- `GET /parents/{uuid}/children/{childUuid}/documents` — Student uploaded documents with verification status
- `GET /parents/{uuid}/circulars?page=` — Paginated circulars/announcements
- `GET /parents/{uuid}/circulars/{id}` — Circular detail
- `POST /parents/{uuid}/circulars/{id}/read` — Mark circular as read
- `GET /parents/{uuid}/children/{childUuid}/leave-requests` — Leave request list for a child
- `POST /parents/{uuid}/children/{childUuid}/leave-requests` — Submit new leave request
- `GET /parents/{uuid}/children/{childUuid}/leave-requests/{id}` — Leave request detail
- `PUT /parents/{uuid}` — Update parent profile (fields: phone, email, address, profile_photo)
- `PUT /parents/{uuid}/change-password` — Change password (fields: current_password, new_password, confirm_password)

## Frontend (Expo React Native)

### State Management
- **Zustand** with `persist` middleware → AsyncStorage
- Auth store: `useAuthStore` holds `{ user, students, token, isAuthenticated, parentUuid, selectedStudentUuid }`
- `hydrateFromApi(data)` auto-selects first student via `selectedStudentUuid`

### API Layer (`src/services/api.ts`)
- Axios client with token resolution (checks raw `auth_token` key + Zustand persist store)
- 401 response interceptor clears auth data
- All API functions unwrap `{ success, data }` wrapper automatically
- Functions: `fetchDashboard`, `fetchParent`, `fetchAttendance`, `fetchFees`, `fetchExamResults`, `fetchTimetable`, `fetchChildren`, `fetchMe`, `fetchNotifications`, `fetchUnreadCount`, `markNotificationRead`, `markAllNotificationsRead`, `fetchHomework`, `fetchCalendar`, `fetchDocuments`, `fetchCirculars`, `fetchCircularDetail`, `markCircularRead`, `fetchLeaveRequests`, `fetchLeaveRequestDetail`, `submitLeaveRequest`, `updateProfile`, `changePassword`

### Types (`src/types/index.ts`)
- `User`, `Student`, `AuthState`, `LoginResponse`, `ApiResponse<T>`
- Data types: `AttendanceRecord`, `AttendanceData`, `StudentFee`, `FeeItem`, `ExamResultRecord`, `TimetableSlot`, `TimetableData`, `NotificationItem`, `DashboardData` (includes optional `leave_summary`), `HomeworkItem`, `HomeworkAttachment`, `CalendarEvent`, `StudentDocument`, `CircularItem`, `CircularAttachment`, `LeaveRequest`, `LeaveRequestPayload`

### Screens Status (all API-integrated)

| Screen | Status | API Source |
|--------|--------|-----------|
| Login | ✅ Real API | `POST /auth/login` → unwrap + map |
| Dashboard | ✅ Real API | `GET /parents/{uuid}/dashboard` |
| Attendance | ✅ Real API | `GET /parents/{uuid}/children/{childUuid}/attendance` |
| Fees | ✅ Real API | `GET /parents/{uuid}/children/{childUuid}/fees` |
| Results | ✅ Real API | `GET /parents/{uuid}/children/{childUuid}/exams` |
| Timetable | ✅ Real API | `GET /parents/{uuid}/children/{childUuid}/timetable` |
| Notifications | ✅ Real API | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` |
| Student Profile | ✅ Real API | `GET /parents/{uuid}` (for parent details) + auth store |
| Profile | ✅ Real data | Auth store (`user?.name`, `user?.email`) |
| Edit Profile | ✅ Real API | `GET /parents/{uuid}` (load) + `PUT /parents/{uuid}` (save) |
| Privacy | ✅ Static | Static text |
| Help | ✅ Static | Static text |
| Homework | ✅ Real API | `GET /parents/{uuid}/children/{childUuid}/homework` |
| Calendar | ✅ Real API | `GET /parents/{uuid}/children/{childUuid}/calendar` |
| Documents | ✅ Real API | `GET /parents/{uuid}/children/{childUuid}/documents` |
| Circulars | ✅ Real API | `GET /parents/{uuid}/circulars`, `GET /parents/{uuid}/circulars/{id}`, `POST /parents/{uuid}/circulars/{id}/read` |
| Leave List | ✅ Real API | `GET /parents/{uuid}/children/{childUuid}/leave-requests` |
| Apply Leave | ✅ Real API | `POST /parents/{uuid}/children/{childUuid}/leave-requests` |
| Leave Detail | ✅ Real API | `GET /parents/{uuid}/children/{childUuid}/leave-requests/{id}` |
| Change Password | ✅ Real API | `PUT /parents/{uuid}/change-password` |

### Navigation Structure
```
(auth)/login           — Auth screen
(tabs)/
  (home)/
    index              — Dashboard
    attendance         — Attendance calendar
    fees               — Fees overview + history
    results            — Exam results grouped
    timetable          — Weekly timetable
    notifications      — Notifications list
    notifications/[id] — Notification detail
    student-profile    — Student details + parent info
    homework           — Homework list with attachments
    calendar           — Academic calendar with month/type filters
    documents          — Student uploaded documents
    circulars          — Circulars/announcements list
    circulars/[id]     — Circular detail with attachments
    leave              — Leave request list for a child
    leave/apply        — Submit new leave request
    leave/[id]         — Leave request detail
  profile/
    index              — Profile main
    edit-profile       — Editable profile (phone, email, address)
    change-password    — Change password
    privacy            — Privacy policy
    help               — Help & support
```

### Common Patterns
- All data screens use: `useState` + `useEffect` + `useCallback` + `RefreshControl`
- Loading state: centered `ActivityIndicator` + "Loading..." text
- Error state: icon + message + Retry button
- Empty state: icon + title + description
- All screens use `SafeAreaView` + `Card` + `Ionicons` + NativeWind classes
- Student context: screens read `selectedStudentUuid` from auth store (defaults to first student)

### Key Conventions
- Backend returns `{ success, message, data: ... }`; API service `unwrap()` extracts `.data.data`
- Backend `User` → `guardian()` → `students()` pivot chain for parent-child relationship
- Frontend `Student.avatar_url` maps from backend `photo` field in login.tsx
- All screens handle missing `parentUuid` or `childUuid` gracefully (skip loading)
- Timetable day_of_week: 1=Monday through 7=Sunday (backend numeric, frontend maps via DAY_NAMES)

## Session 2026-06-15 — DataTables Binding Audit & Backend Fixes

### Backend Fixes Applied
1. **Notification model N+1 fix**: `getUnreadCountAttribute()` now checks `$this->attributes['unread_count']` first (from `withCount`), avoiding redundant per-row query
2. **`NotificationController::show()`**: Added `loadCount` for unread_count
3. **`StudentReportController::directory()`**: Added per-student-ID caching for `formatDirectoryRow()` (was called 8× per row); added `e()` escaping for XSS
4. **Fees blade**: Wrapped all 5 DataTable creations in `try-catch` via `createFeeTable()` factory; added `error` + `initComplete` AJAX callbacks with console.log; null-guarded all `tables.xxx?.ajax.reload()` calls
5. **View cache cleared**: Fixed `parents.activity_summary` not-found error
6. **Vite production build**: Rebuilt after all changes

### Troubleshooting
- If fees tables still show "No data" after deploy → open browser console → look for `[Fee DT]` prefix logs
- If `recordsTotal` > 0 but no rows render → likely Bootstrap tab `display:none` + DataTables `responsive: true` interaction
- Workaround for hidden tab DataTables: call `table.columns.adjust().responsive.recalc()` on tab `shown.bs.tab` event
