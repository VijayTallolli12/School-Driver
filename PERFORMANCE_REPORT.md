# Performance Report — Driver App Live Tracking

Status: **Implemented** — tuned for school-bus telemetry at low battery and low memory cost.

## Update cadence (what the backend receives)

| Source | Interval | Effective on the wire |
|---|---|---|
| Foreground watch | 4 000 ms / 5 m | batched, flushed ≤ every 5 s |
| Background task | 5 000 ms | deferred to 10 s / 50 m, batched |
| Background-fetch | ~15 min | retry only |

At 40–70 km/h a fix every 4–5 s ≈ a point every 45–100 m — dense enough for a smooth route replay while minimizing payload size.

## Payload efficiency

- Single JSON object per trip batch: `{ locations: [{lat, lng, speed, heading, timestamp}] }`.
- Batching cap **20 points/request** (matches `MAX_LOCATION_BATCH_SIZE`), with contiguous per-trip runs so there is never a mixed-trip request.
- `speed`/`heading` are sent as `number | null`, and the dedupe by `trip_id + timestamp` prevents redundant samples (a foreground + background fix at the same timestamp collapses to one).

## Memory & storage

- Queue capped at **LRU 500 points/trip** — bounded AsyncStorage usage (~50 KB max at ~100 B/point), independent of how long the app runs.
- Queue is trimmed on every enqueue (single AsyncStorage write per sample).
- Flush failure keeps the *tail* of the queue (`slice(failedIndex)`) instead of re-sending already-acked points, avoiding duplicate network work.

## Network behavior

- Throttled flush: at most **one flush / 5 s** (`flushOfflineThrottled`).
- `isNetworkError` distinguishes offline from server errors: offline short-circuits the batch loop so we don't hammer a dead connection, and `status` flips to `"offline"` for the UI.
- No retry storm: retries happen on the next scheduled trigger (5 s, background task, or ~15 min fetch), never in a tight loop.

## Rendering

- `TripMapView` is `memo`ized; static stop markers use `tracksViewChanges={false}`; only the driver marker + polyline update per fix.
- Controlled region only while `follow` is on — panning disables camera animation so the UI never fights the user.
- Live Trip screen renders distance/ETA in `memo`ized sub-components keyed on `position` + `nextStopId`, so card churn is minimal.

## Battery

- Foreground: `Accuracy.High` + 4 s / 5 m gating (distance gating is the primary battery saver).
- Background: `AutomotiveNavigation` activity type + deferred updates (10 s / 50 m) keeps GPS duty cycle low.
- No wake-lock abuse beyond the foreground service required for Android background tracking.

## Known trade-offs

- 500-point LRU cap means very long offline windows (> ~40 min at 4–5 s cadence) will drop the oldest samples. Acceptable for a driver app; if longer retention is required, raise `LRU_CAP` (and the backend ingest rate).
- Background-fetch minimum interval is advisory on iOS (10–15 min); actual cadence is OS-controlled.

## Validation

- `npx tsc --noEmit` passes after every change.
- Manual validation checklist: trip start → GPS pill `tracking` → Alerts shows pending counts → airplane mode → queuedCount grows → network restored → flush drains → queuedCount → 0.
