# Driver App Gap Analysis

Date: 2026-08-05

Scope: Expo Driver App only. The Laravel backend source tree is not present in this workspace, so this audit compares the current driver-facing Expo screens against the driver API contract already documented in [DRIVER_PHASE_1_API_CONTRACT.md](DRIVER_PHASE_1_API_CONTRACT.md).

## Summary

The driver app is partially ready and the transport/gps foundation is in place, but several Phase 2 modules are still not implemented as real driver workflows. The current app is strongest in authentication, transport dashboard rendering, route details, profile shell, notifications, and offline/error handling. The main gaps are dedicated trips workflow, pickup/drop actions, ETA calculation, SOS, and driver-specific profile/settings surfaces.

## Classification

| Module | Status | Notes |
|---|---|---|
| Authentication | Completed | Role-aware login is in place and hydrates `driver_uuid`, `vehicle_id`, and `route_id` in the auth store. |
| Driver Dashboard | Completed | Driver mode renders a transport-centric dashboard with quick actions and live transport summary. |
| Trips | Missing | No dedicated trips/trip-progress screen exists. Current transport screens are route-centric only. |
| Assigned Routes | Completed | Route details screen exists and reuses the live transport payload. |
| Student Pickup | Needs UI | Backend action helpers exist in the API layer, but there is no pickup workflow screen or interaction yet. |
| Student Drop | Needs UI | Backend action helpers exist in the API layer, but there is no drop workflow screen or interaction yet. |
| Live GPS Tracking | Completed | A driver live GPS screen exists, requests location permission, captures coordinates, uploads location samples, and opens Google Maps navigation. |
| ETA | Missing | No ETA calculation, API field, or UI surface exists. |
| Driver Attendance | Missing | No driver attendance screen is implemented. |
| Driver Leave | Missing | No driver leave screen or leave request workflow is implemented for driver accounts. |
| Vehicle Details | Completed | Vehicle and driver details are displayed through the transport/driver screen. |
| Vehicle Inspection | Missing | No inspection checklist or inspection submission workflow exists. |
| Notifications | Completed | Notifications screen is present and uses the existing shared notification API. |
| Circulars | Completed | Circular list/detail routes already exist; they remain reusable for driver accounts. |
| Documents | Completed | Documents screen exists in the app structure and uses the shared document API contract. |
| Profile | Completed | Driver profile shell is role-aware and hides parent-only child-switcher UI. |
| Settings | Needs UI | Profile menu includes a placeholder settings entry, but there is no dedicated driver settings screen. |
| Incident Reporting | Missing | No incident report form, API surface, or navigation entry exists. |
| Emergency SOS | Missing | No SOS workflow or emergency action screen exists. |
| Chat with Transport Admin | Missing | No chat UI or transport-admin messaging API is implemented in the app. |
| Offline | Completed | Shared offline/error handling exists via `OfflineState`, API interceptors, and retry patterns across transport and notifications. |

## Screen Audit

### Authentication

Completed. The login flow is still the same Expo Router and Zustand architecture, but the auth model is now role-aware and supports driver-specific identifiers. No additional work is required in the app shell for Phase 2 authentication.

### Dashboard

Completed. The driver dashboard currently shows transport summary cards, route access, and live GPS entry points. It is functional, but it is still a summary surface rather than a full trip control center.

### Trips

Missing. There is no trip list, active trip timer, route start/end progress view, or trip history screen. The current app only exposes transport route details and GPS tracking.

### Pickup and Drop

Needs UI. The API layer now includes transport action helpers, but no driver-facing screens exist to call pickup or drop actions from a stop or student row. This is the most obvious Phase 2 app gap.

### GPS

Completed. The app has a dedicated live GPS screen that requests device location permission, watches position updates, uploads samples, and links to Google Maps navigation. It does not yet render a map polyline, but the core tracking flow is present.

### ETA

Missing. There is no ETA card, next-stop ETA field, route timing model, or backend-derived ETA UI. The current route screens display only scheduled pickup and drop times.

### SOS

Missing. No emergency action button, confirmation flow, or transport-admin escalation UI exists. There is also no transport SOS API wired in the app layer.

### Profile

Completed. The profile screen is role-aware and removes the parent-only linked-students UI for drivers. It still uses the shared shell and theme.

### Notifications

Completed. Notifications are fully integrated through the shared notification flow and remain available to driver accounts.

### Offline

Completed. Offline/error handling is implemented through the shared state components and API error helpers, with retry actions on the transport and notifications screens.

## Broken

No hard runtime blockers were found during this audit. The current gaps are feature gaps, not crashes.

## Needs API Integration

- None for the currently implemented transport, notification, and profile flows.
- Pickup and drop have backend helper functions already, but no UI surface yet. That is primarily a UI gap.

## Recommended Next Build Slice

1. Trips and pickup/drop workflow
2. ETA model and next-stop display
3. Emergency SOS and incident reporting
4. Driver settings and inspection checklist

## Evidence Files

- [Transport dashboard](src/app/(tabs)/(home)/transport/index.tsx)
- [Route details](src/app/(tabs)/(home)/transport/route.tsx)
- [Live GPS](src/app/(tabs)/(home)/transport/live-gps.tsx)
- [Driver profile shell](src/app/(tabs)/profile/index.tsx)
- [Notifications](src/app/(tabs)/(home)/notifications/index.tsx)
- [Offline state](src/components/ui/OfflineState.tsx)