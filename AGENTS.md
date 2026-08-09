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

## Session 2026-08-10 — Driver App (Expo) Reliability & Polish

### New Screens (all API-integrated)
- `transport/trip-history` — `GET /driver/trips/history` (fetchTripHistory), light theme, split Start/End/Duration/Stops/Picked/Attendance blocks
- `transport/emergency` — SOS alert POST with current snapshot (lat/lng/accuracy from expo-location)
- `profile/settings` — push toggle (services/notifications `isPushEnabled`/`setPushEnabled`), app version, ACTIVE_API_URL display, links to privacy/help

### Reliability Changes
- **Flush mutex**: `src/utils/flushMutex.ts` (`withFlushMutex`) serializes concurrent flushes of the location & attendance queue; used in `flushLocationQueue` and `flushAttendanceQueue` (background task + foreground watcher + manual Sync now share one in-flight run)
- **GPS accuracy gating**: `tripTracking.ts` exports `isUsableFix` (drops fixes > `MIN_USABLE_ACCURACY_METERS` = 250 m), `accuracyQuality` (high/ok/poor/none), `snapshotToPoint`. Applied in foreground watch, `locationTask.ts` background task, and `handleTripSample`. `accuracy` is now sent on `TripLocationPoint`
- **Weak-GPS banner**: live-trip shows an amber warning when `position.accuracy` is poor; SOS Fix banner got accessibility labels
- **Stop attendance (pickup/drop/missed)**: `stop-attendance.tsx` was redesigned around the real backend contract — each student row shows the active trip side (from `trip.type`), a status chip (pending/picked/dropped/missed), and `[PICKUP] [DROP]` buttons (irrelevant side disabled for single-leg trips) + a `MISSED` link. Actions mark `trip_student_id` optimistically with per-student offline queue fallback; "NEXT STOP" confirms when students remain unmarked. Swipe present/absent UI removed.

### Runtime Input Validation
- `src/utils/driverValidation.ts` — zod schemas for `DriverTripActionPayload` (trip_id/trip_student_id/action pickup|drop|missed/action_id/triggered_at), `TripLocationPoint` + queued variants; `parseDriverActionPayload`/`parseTripLocationPoint` are called inside `enqueueAttendance`/`enqueueLocation` so malformed entries never reach persisted queues
- `src/services/driverTripQueue.ts` — AsyncStorage-backed `driver_trip_action_queue` keyed by `action_id`; `flushAttendanceQueue` POSTs via `markDriverTripAction` under `withFlushMutex("attendance-queue")`

### Expo Go gating
- `src/utils/environment.ts` — `isExpoGo()` (checks `Constants.executionEnvironment === ExecutionEnvironment.StoreClient`)
- Remote push + background tasks are unsupported in Expo Go (SDK 53+): `registerForPushNotifications()` early-returns in Expo Go, and `_layout.tsx` dynamically imports `locationTask` (background-task registration) only when NOT in Expo Go — Expo Go boots cleanly, dev builds get full background sync

### Testing
- Jest configured: `jest.config.js` (jest-expo preset + `^@/` moduleNameMapper); `npm test` / `npm run typecheck`
- jest **must be v29** (jest-expo 57 does not work with jest 30: `clearMocksOnScope is not a function`)
- Suites in `src/utils/__tests__/`: geo, transport normalization, flushMutex, driverValidation, roles, sosQueue (39 tests)
- EAS build profiles added in `eas.json` (development/preview/production)

## Session 2026-08-10 (cont.) — Role-based auth & SOS hardening

### Role-based auth
- `src/utils/roles.ts` — `normalizeUserRole` (tolerates `role` string, `roles` string[] or spatie-style `[{id, name}]`; prefers `driver` whenever any driver signal exists; never guesses "parent") and `isDriverPayload` (driver detection via `driver_uuid`/`vehicle_id`/`route_id`)
- Wired into login.tsx (populates `driverUuid`/`assignedVehicleId`/`assignedRouteId`), splash (index.tsx), alerts, home, transport index

### Offline SOS queue
- `src/services/sosQueue.ts` — AsyncStorage-backed `driver_sos_queue` with `enqueueSos` (dedupes by driver+uuid+trip+recorded_at) and `flushSosQueue` (serialized via `withFlushMutex("sos-queue")`). On network error the entry is kept AND later entries are still attempted (no `break`, so they're never stranded); backend-rejected entries are dropped once so they can't loop forever
- Flush wired into app cold start (`_layout.tsx`, only when authenticated) + alerts screen "Sync Now" (SOS badge shows unsent count)
- `emergency.tsx` drops `tel:` dial-out in favor of POST/queue with tap-to-resend; retry block is only rendered for `queued`/`error` so unreachable `sending` comparisons were removed
- Expo Go note: `battery_level` on SOS payload is not part of `SosAlertPayload`

### Live-trip reliability
- END TRIP guarded by `endGuardRef` (no duplicate POST if auto-completion races a manual tap)
- Dev-friendly early end: `src/utils/environment.ts` `allowForceEnd()` (true in `__DEV__`). In dev builds END TRIP works from ANY stop — it turns amber, reads "END TRIP (EARLY)", and asks for explicit confirmation before POSTing `/driver/trips/{trip}/end`. Production keeps the last-stop-only gate. The backend `/end` endpoint itself has no stop gate.
- `stop-attendance.tsx` arrival is non-blocking: `arriveAtStop` failure (incl. network) no longer blocks loading the student roster — only non-network errors surface
- live-trip shows a GPS-quality chip (High/OK/Poor) next to the tracking pill; all action buttons have accessibility labels/hints
- Removed legacy `transport/route.tsx` + `transport/driver.tsx` (overlapped live-trip flow) — also removed their `Stack.Screen` entries and Profile menu items ("Vehicle Info", "Assigned Routes")

### Driver trip API contract (verified against `school` backend, 2026-08-10)
The real backend endpoints differ from what the app first assumed:
- `GET /driver/trips/current` (NOT `/trips/active`) returns the driver's current or next-scheduled trip as `{ has_current_trip, trip, route, vehicle, stops }`; trip.status is `scheduled | in_progress | completed`
- `POST /driver/trips/start` requires body `{ trip_id }` (TripStartRequest) — starts a pre-created `scheduled` trip; returns `{ trip: { id, status, started_at } }`
- `POST /driver/trips/{trip}/start` (by URL) also exists
- `GET /driver/trips/{trip}` returns nested `{ trip, route, vehicle, stops }`
- `arrive-stop`/`leave-stop` require `route_stop_id` (NOT `stop_id`)
- Trip payloads expose per-stop progress derived from `trip_events`: each stop carries `arrived_at`/`left_at` (`stop_arrived` / `stop_left` events, nullable), and the trip carries `current_stop_id` (first stop arrived-but-not-left), `next_stop_id`, `completed_stops` (stops left). Frontend `normalizeDriverTripDetails()` maps these — they replace the old hardcoded `current_stop_id: null` / `completed_stops: 0`. END TRIP on live-trip is gated on `currentIndex === stops.length - 1`, so enabling now depends on real progress
- Attendance is marked per-student via `POST /driver/trips/{trip}/pickup`, `POST /driver/trips/{trip}/drop`, and `POST /driver/trips/{trip}/mark-missed`; each takes `trip_student_id` (the pivot id, NOT `student_id`) + `Idempotency-Key`. `mark-missed` runs in a DB transaction and takes an optional `reason`; request classes reject the legacy `status`/`student_id`/`stop_id` payload the app first used

Frontend `src/services/api.ts` now normalizes backend payloads into the flat `DriverTripSummary` via `normalizeDriverTripDetails()`; dashboard `transport/index.tsx` shows the real scheduled trip and passes `trip_id` to START TRIP (disabled when no trip today).

### Live location contract (verified + aligned, 2026-08-10)
- App posts `POST /driver/trips/{trip}/location` with `{ locations: [{ lat, lng, speed, heading, accuracy, timestamp }] }` (batch, `TripLocationUpdateRequest`) or a single flat point. Backend `DriverApiService::updateTripLocation()` derives `vehicle`/`trip` from the route binding (no `vehicle_id` needed), writes one `VehicleLocation` + one `location_update` trip_event per point, and dispatches `LocationUpdated` once for the latest point.
- The legacy `POST /driver/location` single-point endpoint (flat `latitude`/`longitude`/`captured_at` + required `vehicle_id`, `UpdateDriverLocationRequest`) is unchanged and still routes to `updateLocation`. Do NOT send the app's `lat/lng/timestamp` shape there.
- If a URL 404s on a route that exists in `routes/modules/api/driver.php`, the running server is stale → `php artisan optimize:clear` + restart `php artisan serve` (no route cache / Octane in this repo).

## Session 2026-08-10 (cont.) — Admin SOS Alerts (backend)

### Data model
- New table `driver_sos_alerts` (migration `2026_08_10_000002`) — `driver_id`, `trip_id`, `latitude`, `longitude`, `message`, `status` (`new | acknowledged | resolved`), `notes`, `handled_by` (user id), `handled_at`. Model `App\Modules\Transport\Models\SosAlert` **must declare `protected $table = 'driver_sos_alerts'`** (pluralizer resolves the wrong `sos_alerts` otherwise).

### Driver write path
- `DriverApiService::sos()` (app/Modules/Driver/Services/DriverApiService.php:1175) — after the existing `sos_alert` trip_event + activity + `Log::warning`, now also `SosAlert::create([...status 'new'])`.

### Admin UI
- Sidebar → Transport → **SOS Alerts** (`admin/transport/sos`), permissions `transport.view` (list) / `transport.update` (invoice).
- Routes in `routes/modules/transport.php` under `admin.transport.sos.{index,data,show,update}` (`admin.` prefix applied in routes/web.php).
- `TransportController` `sosIndex` (status cards new/acknowledged/resolved/total) + `sosData` (Yajra DataTable, message `e()`-escaped) + `sosShow` + `updateSos` (`UpdateSosRequest`: `status` in:new,acknowledged,resolved + `notes`; sets `handled_by`/`handled_at`).
- Views `resources/views/modules/transport/sos.blade.php` + partials `_sos_status` / `_sos_actions`; "Take Action" modal posts the `.ajax-form` → global `app.js` dispatches `erp:success` on success (page then reloads).
