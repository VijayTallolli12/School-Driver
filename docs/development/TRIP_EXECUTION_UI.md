# Trip Execution UI

Screen-by-screen UI specification for the Driver App. Each screen is flow-based, one primary action, no ERP clutter, large touch targets, high contrast.

## Visual System

| Token | Value |
|---|---|
| Background (trip) | `slate-950` (#020617) |
| Surface | `slate-900` / `slate-800` |
| Border | `slate-700` |
| Primary | emerald-500 (success/start) |
| Warn | amber-400 (next stop) |
| Danger | red-500/600 (end/emergency) |
| Min touch target | 48 px (buttons use 52–60 px) |

---

## 1. Home — Control Screen

Route: `(tabs)/(home)/transport/index` — auto-gated.

- If an active trip exists (`GET /driver/trips/active`), the screen redirects to Live Trip.
- If not, renders the control card:

```
┌──────────────────────────────────────┐
│ Trip Control        [emergency btn]  │
│ Ready to Drive                       │
│──────────────────────────────────────│
│ ROUTE NAME                           │
│ North Zone Route                     │
│──────────────────────────────────────│
│ VEHICLE NUMBER                       │
│ MH-12-AB-1234                        │
│──────────────────────────────────────│
│ START TIME   STOPS   STUDENTS        │
│ 07:30        12      48               │
│──────────────────────────────────────│
│ ✓ All attendance synced   [Sync]     │
│                                      │
│        [ START TRIP ]  ← big CTA     │
└──────────────────────────────────────┘
```

- `START TRIP` → `POST /driver/trips/start` → Live Trip.

---

## 2. Live Trip

Route: `(tabs)/(home)/transport/live-trip?tripId=<id>`

```
┌──────────────────────────────────────┐
│ CURRENT STATUS: In Progress  [SOS]   │
│──────────────────────────────────────│
│ CURRENT STOP                         │
│ Sector 15 Park                       │
│ NEXT STOP                            │
│ Sector 22 Market                     │
│ PICKED       TIMER                   │
│ 12/48        00:14:32                │
│ ROUTE PROGRESS             25%       │
│ ██████████░░░░░░░░░░░░░░░            │
│──────────────────────────────────────│
│ ⚠ Sync Queue: 0            [Sync]    │
│                                      │
│   [ ARRIVE AT STOP ]  (blue)         │
│   [ MARK ATTENDANCE ] (cyan)         │
│   [ NEXT STOP ]       (amber)        │
│   [ END TRIP ]        (red, last)    │
└──────────────────────────────────────┘
```

- Timer recomputed every 15 s; `NEXT STOP` calls `leave-stop`; auto-completes at last stop.
- `END TRIP` only enabled when at the last stop or already completed.

---

## 3. Stop Attendance

Route: `(tabs)/(home)/transport/stop-attendance?tripId=<id>&stopId=<id>`

```
┌──────────────────────────────────────┐
│ STOP ATTENDANCE          [SOS]       │
│ Sector 15 Park                       │
│ Marked: 4/6      ● Synced            │
│──────────────────────────────────────│
│ ◄──ABSENT──[ Swipe Row ]──PRESENT──► │
│   Rahul Sharma         Class 5-B     │
│ ◄──ABSENT──[ Swipe Row ]──PRESENT──► │
│   Anjali Verma         Class 5-B     │
│  ...                                 │
│                                      │
│   [ NEXT STOP ]  (enabled when all)  │
└──────────────────────────────────────┘
```

Behavior:
- On mount: `arrive-stop` is fired, then trip is fetched.
- Swipe right (dx > 45) → **present**; swipe left (dx < −45) → **absent**.
- Row is `memo`ized; marking updates an optimistic map (no reload, no lag).
- Each mark: `POST /driver/trips/{trip}/attendance` with `action_id` + `Idempotency-Key`; falls back to local queue on failure.
- `NEXT STOP` disabled until every student is marked → `leave-stop` → back to Live Trip.

---

## 4. Trip Completed

Route: `(tabs)/(home)/transport/trip-success`

```
┌──────────────────────────────────────┐
│           ✅                          │
│        Trip Completed                 │
│  All stops closed, attendance saved   │
│                                      │
│   [ BACK TO HOME ]                   │
└──────────────────────────────────────┘
```

---

## 5. Emergency

Route: `(tabs)/(home)/transport/emergency` (flow-based, reachable from Control, Live Trip, Stop, Alerts)

```
┌──────────────────────────────────────┐
│ ‹     EMERGENCY                      │
│          ⚠ (red circle)              │
│       EMERGENCY                       │
│  Stop the vehicle safely and         │
│  contact dispatch immediately.       │
│──────────────────────────────────────│
│ CURRENT STATUS        [In Progress]  │
│ ROUTE: North Zone   VEHICLE: MH-...  │
│ PICKED 12/48   DRIVER: Rajesh Kumar  │
│                                      │
│   [ 📞 CALL DISPATCH ]  (red)        │
│   [ BACK TO TRIP ]                   │
└──────────────────────────────────────┘
```

- `CALL DISPATCH` opens the dialer (`tel:`).
- Shows current trip snapshot (route, vehicle, picked/total) from `GET /driver/trips/active`.

---

## 6. Alerts Tab

Route: `(tabs)/alerts` (tab, all roles)

```
┌──────────────────────────────────────┐
│ Alerts                [3 unread]     │
│──────────────────────────────────────│
│ (driver)  ⚠ EMERGENCY  — full-width  │
│ (driver)  STATUS  IN PROGRESS [Open] │
│ (driver)  SYNC    2 pending [Sync]   │
│──────────────────────────────────────│
│ NOTIFICATIONS             [View All] │
│ ┌──────────────────────────────────┐ │
│ │ 🔔 title            time         │ │
│ │    body                          │ │
│ │ 🔔 title            time         │ │
│ │    body                          │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

- Shows unread badge on the tab bar icon (auto-refreshed every 60 s).
- `EMERGENCY` → Emergency screen.
- Sync card shows queued attendance; `Sync Now` flushes the queue.
- Notifications reuse the shared `/notifications` API.

---

## 7. Profile Tab

Route: `(tabs)/profile` — role-aware shell.
- Driver menu: Vehicle Info, Assigned Routes, Notifications, Documents, Settings.
- Hides parent-only linked students UI.

---

## Accessibility / Driving Rules

- All buttons ≥ 48 px height.
- High contrast text on dark backgrounds.
- One primary action per screen; secondary actions clearly separated.
- Emergency reachable from every driving surface with one tap.
- No pull-to-refresh needed during a trip; data refreshes on action.
