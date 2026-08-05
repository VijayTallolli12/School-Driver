# Parent Transport Module Audit

**Date:** 2026-08-05
**Project:** School ERP Parent App (Expo React Native + Laravel Backend)

---

## 1. Existing Backend Transport Module

### Models

| Model | Table | Key Fields |
|-------|-------|------------|
| `Vehicle` | `vehicles` | `id`, `vehicle_number`, `vehicle_name`, `vehicle_type`, `capacity`, `driver_id`, `attendant`, `status`, `school_id` |
| `Driver` | `drivers` | `id`, `user_id`, `name`, `mobile`, `license_number`, `license_expiry_date`, `address`, `status`, `school_id` |
| `Route` | `routes` | `id`, `route_name`, `start_point`, `end_point`, `distance`, `vehicle_id`, `driver_id`, `status`, `school_id` |
| `RouteStop` | `route_stops` | `id`, `route_id`, `stop_name`, `pickup_time`, `drop_time`, `sequence`, `school_id` |
| `TransportAssignment` | `transport_assignments` | `id`, `student_id`, `route_id`, `route_stop_id`, `vehicle_id`, `pickup_point`, `monthly_fee`, `status`, `school_id` |

### Existing APIs (School/Admin Only)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/transport/location` | POST | Update vehicle location (driver app) |
| `/api/v1/transport/live` | GET | Live vehicle status dashboard |
| `/api/v1/transport/vehicle/{id}/location` | GET | Vehicle location history |

### Existing APIs (Admin Panel - Blade Views)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/transport` | GET | Transport management dashboard |
| `/admin/transport/vehicles` | GET/POST | CRUD vehicles |
| `/admin/transport/drivers` | GET/POST | CRUD drivers |
| `/admin/transport/routes` | GET/POST | CRUD routes |
| `/admin/transport/stops` | GET/POST | CRUD route stops |
| `/admin/transport/assignments` | GET/POST | CRUD student transport assignments |

### Gap Identified

**No parent-facing transport API exists.** The existing transport APIs are designed for school staff and drivers, not for parents. Parents cannot view their child's transport details (vehicle, driver, route, stops) through the parent app.

---

## 2. New APIs Added

### `GET /api/v1/parents/{uuid}/children/{childUuid}/transport`

**Description:** Returns transport dashboard data for a parent's child, including vehicle info, driver info, route info, stop sequence, and pickup/drop times.

**Middleware:** `auth:sanctum`, `school`, `throttle:60,1`, `permission:dashboard.view`

**Response Format:**

```json
{
  "success": true,
  "message": "Transport details retrieved.",
  "data": {
    "transport": {
      "vehicle_number": "MH-12-AB-1234",
      "vehicle_name": "School Bus 1",
      "vehicle_type": "school_bus",
      "driver_name": "Rajesh Kumar",
      "driver_mobile": "+91-9876543210",
      "driver_license": "DL-0420190012345",
      "route_name": "Route A - North Zone",
      "route_start": "Sector 15",
      "route_end": "School Main Gate",
      "pickup_stop": "Sector 15 Park",
      "drop_stop": "School Main Gate",
      "pickup_time": "07:30",
      "drop_time": "13:30",
      "status": "active",
      "monthly_fee": 2500.00
    },
    "stops": [
      {
        "id": 1,
        "stop_name": "Sector 15 Park",
        "pickup_time": "07:30",
        "drop_time": null,
        "sequence": 1,
        "is_student_stop": true
      },
      {
        "id": 2,
        "stop_name": "School Main Gate",
        "pickup_time": "07:50",
        "drop_time": "13:30",
        "sequence": 5,
        "is_student_stop": false
      }
    ]
  }
}
```

**Error Responses:**
- `404` - Parent not found or Child not found for this parent
- `200` with `transport: null` - No active transport assignment

---

## 3. Frontend Transport Module

### New Files Created

| File | Description |
|------|-------------|
| `src/app/(tabs)/(home)/transport/index.tsx` | Transport Dashboard screen |
| `src/app/(tabs)/(home)/transport/driver.tsx` | Driver Details screen |
| `src/app/(tabs)/(home)/transport/route.tsx` | Route Details screen |

### Modified Files

| File | Change |
|------|--------|
| `src/services/api.ts` | Added `fetchTransportDashboard()` function and `TransportDashboardData`/`TransportStop`/`TransportData` types import |
| `src/types/index.ts` | Added `TransportStop`, `TransportData`, `TransportDashboardData` interfaces |
| `src/app/(tabs)/(home)/_layout.tsx` | Added transport screen routes |
| `src/app/(tabs)/(home)/index.tsx` | Added Transport module card to Dashboard |
| `src/services/api.ts` | Improved error logging for network errors |

### Screen Navigation

```
transport/index.tsx → Transport Dashboard
  ├── tappable Vehicle & Driver card → /transport/driver
  ├── tappable Route card → /transport/route
  └── Call Driver button (tel:)
```

---

## 4. Design Consistency

All Transport screens follow the existing Parent App design system:

- **Cards:** Reused `Card` component with `padding="lg"` and `padding="md"`
- **Typography:** Same text size/weight/color conventions as other screens
- **Spacing:** Same `px-5`, `gap-3`, `mb-8` patterns
- **Buttons:** Reused `TouchableOpacity` with `bg-primary-600` styling
- **Icons:** All `Ionicons` from `@expo/vector-icons`
- **Loading:** Centered `ActivityIndicator` + "Loading..." text
- **Error:** Icon + message + Retry button
- **Empty State:** Reused `EmptyState` component for "No Transport Assigned"
- **Refresh:** `RefreshControl` with pull-to-refresh
- **Colors:** Cyan (`#06B6D4`) as primary transport accent color
- **SafeAreaView:** All screens wrapped in `SafeAreaView`

---

## 5. Features Implemented (Release 1)

- ✅ Transport Dashboard (vehicle, driver, route, pickup/drop, stops, status, fee)
- ✅ Driver Details (photo placeholder, name, mobile, license, vehicle, route, call button)
- ✅ Route Details (route info, vehicle, driver, stop sequence, pickup/drop times)
- ✅ Call Driver button (`tel:` URI)
- ✅ Stop sequence with student stop highlighted
- ✅ "No Transport Assigned" empty state
- ✅ Error handling with retry
- ✅ Pull-to-refresh
- ✅ Loading state
- ✅ Navigation back
- ✅ Student context (uses `selectedStudentUuid` from auth store)

---

## 6. Features NOT Implemented (Future Releases)

- ❌ Live GPS Tracking (no GPS data from backend)
- ❌ Google Maps (no map integration)
- ❌ ETA / Arrival Prediction
- ❌ Live Vehicle Location
- ❌ Geofencing
- ❌ Push Notifications (uses existing notification system)
- ❌ Driver Live Status
- ❌ Student Boarding Confirmation
- ❌ Chat with Driver

---

## 7. API Integration Notes

- The `fetchTransportDashboard` function follows the same pattern as other API functions in `api.ts`
- It unwraps the `{ success, data }` wrapper automatically
- It handles missing `parentUuid` or `childUuid` gracefully (skips loading)
- The API endpoint uses the same `auth:sanctum` middleware as all other parent APIs
- The `permission:dashboard.view` middleware is used for access control