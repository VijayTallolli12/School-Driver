# Offline Sync Strategy

Driver App attendance must be reliable in low-network / no-network conditions. This document describes the local queue system used to guarantee no attendance is lost even when a driver has no connectivity.

## Why a queue

A school bus passes through areas with poor cellular coverage. If attendance is only written to the server on tap, any network blip loses (or forces the driver to re-enter) a student's record — unsafe and confusing. Instead, every attendance action is first applied optimistically on-device and persisted to a local queue, then synchronised to the backend as soon as connectivity allows.

## Components

- `src/services/driverTripQueue.ts` — queue persistence + flush logic.
- `src/services/api.ts` — `submitDriverAttendance` (idempotent via `Idempotency-Key`).
- `src/utils/storage.ts` — AsyncStorage wrapper (`@react-native-async-storage/async-storage`).

### Storage key

```
driver_trip_attendance_queue  ->  QueuedAttendanceAction[]
```

### Payload shape

```ts
interface DriverAttendancePayload {
  trip_id: number;
  stop_id: number;
  student_id: number;
  status: "present" | "absent";
  action_id: string;      // client-generated, unique per action
  marked_at: string;       // ISO-8601
}

interface QueuedAttendanceAction extends DriverAttendancePayload {
  queued_at: string;       // when it was queued locally
  retries: number;
  last_error?: string;
}
```

## Write path (on tap)

1. Optimistically update UI (`setAttendanceMap`).
2. Attempt `submitDriverAttendance(payload)` with the Idempotency header:
   - Success → flush the queue (to drain anything older) and update the counter.
   - Network/any failure → `enqueueAttendance(payload)`.

`enqueueAttendance` is idempotent by `action_id`: re-marking the same logical action replaces the existing queued entry instead of duplicating it.

## Flush path

`flushAttendanceQueue()`:

1. Read the full queue.
2. For each action (FIFO):
   - Try `submitDriverAttendance(action)`; on success → `synced++`, drop it.
   - On failure → keep it with `retries+1` and `last_error`.
   - If a network error is detected, stop flushing immediately and keep the rest — do not hammer an unreachable server.
3. Persist what remains.

Returns `{ pending, synced, failed, offline }`.

## When sync runs

- **Automatic**: on the Live Trip screen's 15 s timer (`flushAttendanceQueue`).
- **Manual**: "Sync" button on the Control screen, the Live Trip sync bar, and the Alerts tab "Sync Now".
- **After each successful mark**: to drain any backlog opportunistically.

## Idempotency & retry safety

- The backend keys attendance by `Idempotency-Key` = `action_id`, so retrying the same
  `action_id` never double-records.
- `action_id = "<trip>-<stop>-<student>-<status>-<timestamp>"` — unique per logical mark.
- Because the queue stores the full payload, retries send identical bytes to the server,
  preserving idempotency across devices/app restarts.

## Sync indicator

- Control screen: "✓ All attendance synced" / "N pending attendance" + `[Sync]`.
- Live Trip: "Sync Queue: N" + `[Sync]`.
- Alerts tab: "Sync: N pending" + `[Sync Now]`. The `sync-outline` vs `checkmark-done` icon indicates dirty vs clean.
- Tab bar shows unread notification badge (server-side) via `fetchUnreadCount`.

## Edge cases

| Scenario | Behavior |
|---|---|
| Network lost mid-mark | Action is queued; UI shows "Sync Pending: N". |
| App killed offline | Queue is persisted to AsyncStorage; restored on next launch. |
| Server briefly down (non-network) | Action is kept in the queue and retried on next flush. |
| Same student re-marked | Same `action_id` replaces the queued entry — no duplicates. |
| Trip ends with pending items | Queue remains; user can sync from Control/Alerts, or items flush on next mark. |
| 401 session expired | Axios response interceptor clears auth; app returns to login. |