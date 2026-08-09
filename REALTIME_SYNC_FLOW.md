# Real-Time Sync Flow Report — Driver App

Status: **Implemented**
Endpoint: `POST /driver/trips/{tripId}/location` (trip-scoped, accepts a single point or a batch)

## Data flow

```
GPS fix (fg watch / bg task)
   └─► enqueueLocation(tripId, point)        [locationQueue.ts]
          └─► AsyncStorage "driver_trip_location_queue"  (offline-safe)
                 └─► flushLocationQueue()    [locationQueue.ts]
                        └─► uploadTripLocations(tripId, points[])  [api.ts]
                               └─► POST /driver/trips/{tripId}/location { locations: [...] }
```

## Trigger points for a flush

1. **Foreground watch** — every fix is enqueued; a flush runs at most once per **5 seconds** (`flushOfflineThrottled` in `tripTracking.ts`).
2. **Background location task** — after enqueuing its batch, `locationTask.ts` flushes immediately.
3. **Background-fetch task** — every ~15 min (`driver-location-flush-fetch`) it retries the queue so buffered samples are not lost while the app is backgrounded.
4. **Trip stop** — `stopTripTracking()` flushes once more before clearing context.

## Batching

- Batches are capped at **20 points** (`BATCH_SIZE` in `locationQueue.ts`, mirrored as `MAX_LOCATION_BATCH_SIZE` in `api.ts`).
- The queue is sorted by `queued_at` and grouped into **contiguous per-trip runs**, so a batch never mixes two trips.
- Batch payload is `{ locations: TripLocationPoint[] }`; `uploadTripLocation` (single) exists as a fallback for clients where batch support is unknown (`isLocationBatchSupported`).

## Offline resilience (lossless)

- Points live in AsyncStorage before and after upload attempts — nothing is dropped.
- On **network failure** (`isNetworkError`), the failing batch **and every later item** are kept with `retries += 1` and a `last_error` message; the flush aborts so ordering is preserved. `offline: true` flips `tracking.store.status` to `"offline"`, and the Alerts screen shows the combined pending count.
- Non-network errors (e.g. 4xx) keep the batch too, avoiding data loss at the cost of retry loops — surfaced via `failed`.

## Idempotency / dedupe

- `enqueueLocation` dedupes by `trip_id` + `timestamp`, so a repeated fix or a duplicate background+foreground sample overwrites instead of duplicating.
- Same `trip_id` + `timestamp` sent twice to the backend is idempotent at the row level (upsert by that key).

## Capacity bound

- Queue is LRU-capped at **500 points per trip** (oldest dropped). At 4–5 s cadence that is ≈ 35–55 min of buffering — far beyond the typical offline window.

## Security

- Requests carry the JWT via the existing Axios interceptor (`src/services/api.ts`).
- Endpoint is trip-scoped (`/driver/trips/{tripId}/location`) — a driver can only write to trips they are assigned to (backend authorizes ownership).
- Anti-spoofing: mocked fixes are dropped in production (see `GPS_IMPLEMENTATION.md`).

## UI visibility

- `tracking.store`: `queuedCount` (pending), `lastSyncedAt`, `status` (`tracking` / `offline`).
- Live Trip screen: "Sync" row shows pending location count + last synced time + offline pill.
- Alerts screen: sync card aggregates attendance + location queue pending counts with a manual "Sync now".
