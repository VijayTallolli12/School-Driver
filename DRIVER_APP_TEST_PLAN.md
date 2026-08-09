# Driver App Test Plan

Test plan for the Phase 1 Trip Execution Engine. Assumes a backend seeded with a driver account, a vehicle, an assigned route with stops, and students linked to stops.

Preconditions for every scenario:

- Driver account exists (`role = driver`).
- Backend is reachable at the configured `API_BASE_URL` (`src/config/api.ts`).
- `npx tsc --noEmit` passes.

---

## 1. App Entry (Phase 1)

| # | Action | Expected |
|---|--------|----------|
| 1.1 | Log in as a driver with no active trip | Home tab shows the **Control screen** (Start Trip) — not the parent dashboard. |
| 1.2 | Log in as a driver with an `in_progress` trip | Automatically redirected to **Live Trip** for that trip. |
| 1.3 | Log in as a parent | Parent dashboard renders as before (no driver redirect). |

## 2. Control Screen (Phase 2)

| # | Action | Expected |
|---|--------|----------|
| 2.1 | Open Home with no active trip | Shows ONLY: Route Name, Vehicle Number, Start Time, Total Stops, Total Students. |
| 2.2 | Inspect UI | Single primary CTA (**START TRIP**), min 48 px, high contrast. |
| 2.3 | Tap Emergency icon | Opens **Emergency** screen. |

## 3. Start Trip (Phase 3)

| # | Action | Expected |
|---|--------|----------|
| 3.1 | Tap **START TRIP** | `POST /driver/trips/start`; navigates to Live Trip. |
| 3.2 | Airplane mode on, tap START TRIP | Inline network error shown; stays on Control screen; no crash. |
| 3.3 | Tap START TRIP twice quickly | Only one trip starts; second tap disabled via `starting` guard. |

## 4. Live Trip (Phase 4)

| # | Action | Expected |
|---|--------|----------|
| 4.1 | Open Live Trip | Current Stop, Next Stop, Picked/Total, Timer, Progress bar all render. |
| 4.2 | Wait 30 s | Timer advances; queue auto-flushes every 15 s. |
| 4.3 | Tap **ARRIVE AT STOP** | Navigates to Stop Attendance for that stop. |
| 4.4 | Tap **MARK ATTENDANCE** | Same as 4.3. |
| 4.5 | Tap **NEXT STOP** before marking | `leave-stop` called; next stop becomes current; last stop triggers completion. |
| 4.6 | Tap **END TRIP** mid-route | Disabled (only enabled at last stop / completed). |
| 4.7 | Tap Emergency | Emergency screen with current trip status. |

## 5. Stop Attendance (Phase 5–6)

| # | Action | Expected |
|---|--------|----------|
| 5.1 | Open a stop | `arrive-stop` fired; student list (name + class) loads. |
| 5.2 | Swipe a student right | Row shows Present; `POST attendance` with `action_id` + `Idempotency-Key`. |
| 5.3 | Swipe a student left | Row shows Absent; attendance submitted. |
| 5.4 | Partial swipe (< 45 px) | Row springs back; no mark recorded. |
| 5.5 | Mark all students | **NEXT STOP** becomes enabled. |
| 5.6 | Tap NEXT STOP with unmarked students | Blocked with "Mark all students" alert. |
| 5.7 | Rapid swipes across several students | No lag; each row `memo`ized; optimistic update instant. |

## 6. Offline / Sync (Phase 9)

| # | Action | Expected |
|---|--------|----------|
| 6.1 | Airplane mode; mark 3 students | 3 items queued; sync indicator shows pending. |
| 6.2 | Re-enable network; wait 15 s | Queue flushes automatically; pending → 0. |
| 6.3 | Kill app offline, relaunch | Queue persists (AsyncStorage); still pending. |
| 6.4 | Re-mark same student offline twice | Only one queue entry per `action_id`. |
| 6.5 | Manual **Sync** on Alerts/Control | Queue drains; `synced` count reported. |
| 6.6 | Sync while server down (non-network) | Items retained, retried later; no data loss. |

## 7. End Trip (Phase 8)

| # | Action | Expected |
|---|--------|----------|
| 7.1 | At last stop tap **END TRIP** | `POST /driver/trips/{trip}/end`; navigates to **Trip Completed**. |
| 7.2 | Trip Completed → BACK TO HOME | Control screen shows, no active trip. |
| 7.3 | End trip with queued attendance | Queue retained; syncable from Control/Alerts. |

## 8. Alerts Tab & Safety (Phase 10, 12)

| # | Action | Expected |
|---|--------|----------|
| 8.1 | Tabs render | Exactly **Home · Alerts · Profile**. |
| 8.2 | Unread notifications | Red badge appears on Alerts tab icon; updates within 60 s. |
| 8.3 | Alerts screen (driver) | Emergency card, Status card (Open Live Trip when in progress), Sync card. |
| 8.4 | Tap EMERGENCY | Emergency screen; **CALL DISPATCH** opens dialer; BACK TO TRIP works. |
| 8.5 | Emergency during no trip | Shows "No Active Trip" status; BACK TO HOME works. |

## 9. Profile & Sessions

| # | Action | Expected |
|---|--------|----------|
| 9.1 | Profile (driver) | Shows vehicle info, routes, notifications, documents, settings; no parent student list. |
| 9.2 | Expire/invalidate token | 401 interceptor clears auth → login screen. |

---

## Regression Commands

```bash
npx tsc --noEmit   # type safety
npx expo start      # run the app (metro)
```

## Out of Scope (Release 2)

- SOS escalation to a server endpoint (current emergency is a local call-out).
- Chat, Leave, Vehicle Inspection, Incident Reporting.
- Map polyline rendering on the Live Trip screen.
