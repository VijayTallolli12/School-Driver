# Map Integration Report — Driver App

Status: **Implemented** via `react-native-maps` (v1.20.1, SDK 54 compatible)

## Component

`src/components/TripMapView.tsx` — a `memo`ized wrapper around `react-native-maps`:

- **`<MapView>`** — `Provider` default (Apple Maps on iOS, Google Maps on Android), shows the user location dot, `showsCompass`, `showsMyLocationButton`.
- **`<Marker>`** for the driver's current position with a green circle (color `#34D399`) that re-anchors as fixes arrive.
- **`<Marker>` per trip stop** — `DriverTripStop` now carries `latitude`/`longitude` (`src/types/index.ts`). Colors:
  - Current stop → `#10B981`
  - Next stop → `#F59E0B` (amber, with a distinct label)
  - Other stops → `#94A3B8` (muted)
- **`<Polyline>`** — route path through the visited/remaining stops; coordinates filtered to only valid (`isValidCoord`) points so bad GPS doesn't break the path.
- **Initial region** — derived from the first valid stop or the driver's current position (`buildRegion`), so the map is never blank on mount.

## Follow / pan behavior

- While `follow` is true, the map is a **controlled** component: the `region` prop is updated from the latest fix, so the camera tracks the vehicle.
- On `onPanDrag` the user takes manual control → `follow` flips false and the map becomes uncontrolled (no camera jumps).
- A "Follow" button (crosshair icon) re-enables following and animates the camera back to the vehicle.

## Distance & ETA

- `src/utils/geo.ts`:
  - `haversineMeters(a, b)` — great-circle distance between fixes.
  - `estimateEta(distance, speed)` — uses live `speed` when available, else a 40 km/h fallback.
  - `formatDistanceMeters` — 1.2 km / 350 m formatting.
- Live Trip screen shows **Distance to next stop** and **Estimated arrival** cards computed from the latest position + next stop coordinates.

## API key (Android)

`app.json` → `android.config.googleMaps.apiKey` is set to the real Maps SDK key
`"AIzaSyB9cabiamvIwM8WNo7BLBihA9Y894bk8x0"`.

The key is sourced from `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (`.env` / `.env.development` /
`.env.production` / EAS build env) via `app.config.js`.

## Web

- `Platform.OS === "web"` renders an overlay: "Map is not available on web" instead of `react-native-maps` (which is native-only).

## Known limitations

- iOS uses Apple Maps; `Polyline`/`Marker` behavior is identical, but map styling differs.
- `expo-maps` (the newer SDK 54 alpha map module) is **not** used — the spec explicitly requires `react-native-maps`, and `expo-maps` is not yet available in Expo Go.
- Markers use `tracksViewChanges={false}` on static stop markers for render performance; the driver marker animates via coordinate updates.
