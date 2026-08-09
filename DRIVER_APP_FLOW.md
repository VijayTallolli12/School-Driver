# Driver App Flow

This document describes the end-to-end trip execution flow for the School Driver App. It is a flow-first application: each screen has one purpose, one primary action, and moves the driver toward completing the trip.

## Phase 1 — App Entry

After login the app decides where the driver lands based on active trip state.

```
Login
  └─ success
       └─ role = driver
            └─ Home tab → Trip Control screen (src/app/(tabs)/(home)/transport/index.tsx)
                 ├─ GET /driver/trips/active
                 │    ├─ trip.status === "in_progress"  → router.replace → Live Trip screen
                 │    └─ no active trip (or not_started) → show "Start Trip" control screen
                 └─ role = parent → normal Parent dashboard
```

The entry gate lives in `src/app/(tabs)/(home)/index.tsx` (driver Home redirect) and
`src/app/(tabs)/(home)/transport/index.tsx` (active-trip gate).

---

## Phase 2. Home — Control Screen (NOT a dashboard)

Shown only when there is no active trip.

Displays ONLY:

- Route Name
- Vehicle Number
- Start Time
- Total Stops
- Total Students

Primary CTA: **START TRIP** (one action per screen).

Impl: `transport/index.tsx`.

---

## Phase 3. Start Trip Flow

1. Driver taps **START TRIP**.
2. App calls `POST /driver/trips/start` (`startDriverTrip`).
3. On success it navigates to the **Live Trip** screen with the new `tripId`.
4. On failure it shows the API/network error inline and stays on the control screen.

---

## Phase 4. Live Trip — Core

Shows:
- Current Stop
- Next Stop
- Students picked / total
- Trip Timer (elapsed since `started_at`, refreshed every 15 s)
- Route progress bar (`completed_stops / total_stops`)

Primary actions:
- **ARRIVE AT STOP** → opens stop attendance
- **MARK ATTENDANCE** → opens stop attendance
- **NEXT STOP** → `POST /leave-stop`, advances to the next stop; completes the trip automatically at the last stop
- **END TRIP** → `POST /end`, only enabled at the last stop

Always visible:
- Emergency button (top right) → Emergency screen
- Current status (In Progress / Ready)
- Offline sync queue count + manual Sync

Impl: `transport/live-trip.tsx`.

---

## Phase 5. Stop Screen

When the driver taps "Arrive" / "Mark Attendance", the app:
1. Calls `POST /driver/trips/{trip}/arrive-stop` (idempotent).
2. Renders the list of students for that stop.

Each student row:
- Name
- Class
- Swipe **right** → Present
- Swipe **left** → Absent

Marking is instant (optimistic local state, no reload). Each attendance submission is
idempotent via a client-generated `action_id` sent as `Idempotency-Key`.

Impl: `transport/stop-attendance.tsx`.

---

## Phase 6. Attendance

`POST /driver/trips/{trip}/attendance` with body:

```json
{
  "stop_id": ...,
  "student_id": ...,
  "status": "present" | "absent",
  "marked_at": "ISO-8601",
  "action_id": "<trip-stop-student-status-timestamp>"
}
```

- Idempotent: the backend keys by `Idempotency-Key` / `action_id`.
- Retry safe: on network failure the payload is written to the local queue and flushed later.
- Offline queue ready: see `OFFLINE_SYNC_STRATEGY.md`.

---

## Phase 7. Stop Transition

After the final student at a stop is marked:
- Driver taps **NEXT STOP**.
- App calls `POST /driver/trips/{trip}/leave-stop` and then re-fetches the trip.
- The live trip screen advances automatically to the next stop.

---

## Phase 8. End Trip

At the last stop the app shows **END TRIP**.
- Driver taps **END TRIP**.
- App calls `POST /driver/trips/{trip}/end`.
- On success the app navigates to the **Trip Completed** screen (`transport/trip-success.tsx`).
- Success screen offers **BACK TO HOME**, returning the driver to the control screen (now with no active trip).

---

## Phase 9. Offline Mode

Refer to `OFFLINE_SYNC_STRATEGY.md` for the full design. Summary:

- Every attendance action is queued locally when the network fails.
- A sync indicator surfaces pending counts + a manual Sync action on the Control, Live Trip, and Alerts screens.
- Automatic flush runs on the live-trip timer (every 15 s).

---

## Phase 10. Navigation

Minimal tabs: **Home · Alerts · Profile**.

- Trip/route screens are **not** tabbed — they are stack-based flow screens under the Home stack.
- Flow screens: Control, Live Trip, Stop Attendance, Trip Completed, Emergency.

```
(tabs)
 ├─ (home)
 │    ├─ index          <- Parent dashboard / Driver Home gate → redirects to /transport (driver)
 │    ├─ transport/     <- FLOW screens (Control, Live Trip, Attendance, Success, Emergency, Route, GPS, Driver)
 │    ├─ notifications/
 │    ├─ ... (parent modules)
 ├─ alerts/             <- Alerts tab (emergency + sync + trip status + notifications)
 └─ profile/            <- Profile tab
```

---

## Phase 11. UI Rules

- Minimum 48 px / 56 px buttons (`min-h-[52px]`/`min-h-[56px]`/`min-h-[60px]`).
- High contrast on dark `slate-950` trip surfaces.
- Minimal text, labels are short and uppercase.
- One primary action per screen.
- No scrolling during driving (single-action layout with `mt-auto` bottom actions).

---

## Phase 12. Safety

Every driving surface shows:
- Emergency button → Emergency screen (dispatch call + current status + "back to trip").
- Current status (trip state).
- Clear, explicit action labels.

Emergency screen (flow-based, not tabbed): `transport/emergency.tsx`.

---

## Phase 13. Performance

- `memo` on swiped mode.
- Optimistic local attendance state.
- Re-fetch only after state-changing actions, not on every render.
- 15 s timer drift for elapsed; no per-second full re-render of trip.
- Reanimated-driven swipe transforms (no React state churn per move.

---

## Phase 14. Reports

- This file: DRIVER_APP_FLOW.md
- TRIP_EXECUTION_UI.md
- OFFLINE_SYNC_STRATEGY.md
- DRIVER_APP_TEST_PLAN.md