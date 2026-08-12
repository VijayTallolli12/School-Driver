# Driver App Phase 1 API Contract

This workspace currently contains the Expo Driver App only. The Laravel backend source tree is not present here, so this document defines the REST contract required to complete Phase 1 end-to-end in the ERP backend repo.

## Phase 1 Scope

- Authentication
- Driver Dashboard
- Assigned Routes
- Student Pickup
- Student Drop
- Live GPS Tracking

## Authentication

### `POST /api/v1/auth/login`

The login response must support both parent and driver roles.

#### Response shape

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "...",
    "user": {
      "id": 1,
      "name": "Driver Name",
      "email": "driver@school.com",
      "phone": "+91...",
      "avatar_url": null,
      "role": "driver"
    },
    "driver_uuid": "driver-uuid",
    "vehicle_id": 12,
    "route_id": 34
  }
}
```

## Driver Dashboard

### `GET /api/v1/transport/live`

Returns the current driver transport context, active route, stop list, and current location snapshot.

#### Success response

```json
{
  "success": true,
  "message": "Live transport data retrieved.",
  "data": {
    "transport": {
      "vehicle_number": "MH-12-AB-1234",
      "vehicle_name": "School Bus 1",
      "vehicle_type": "school_bus",
      "driver_name": "Rajesh Kumar",
      "driver_mobile": "+91-9876543210",
      "driver_license": "DL-...",
      "route_name": "North Zone Route",
      "route_start": "Sector 15",
      "route_end": "School Main Gate",
      "pickup_stop": "Sector 15 Park",
      "drop_stop": "School Main Gate",
      "pickup_time": "07:30",
      "drop_time": "13:30",
      "status": "active",
      "monthly_fee": 2500
    },
    "stops": [
      {
        "id": 1,
        "stop_name": "Sector 15 Park",
        "pickup_time": "07:30",
        "drop_time": null,
        "sequence": 1,
        "is_student_stop": true
      }
    ],
    "current_location": {
      "latitude": 18.5204,
      "longitude": 73.8567,
      "speed": 8.4,
      "heading": 110,
      "accuracy": 12,
      "recorded_at": "2026-08-05T09:10:00.000Z"
    }
  }
}
```

## Live GPS Tracking

### `POST /api/v1/transport/location`

Uploads a vehicle location sample from the driver device.

#### Request body

```json
{
  "vehicle_id": 12,
  "latitude": 18.5204,
  "longitude": 73.8567,
  "speed": 8.4,
  "heading": 110,
  "accuracy": 12,
  "recorded_at": "2026-08-05T09:10:00.000Z"
}
```

#### Validation

- `vehicle_id` required, exists in `vehicles`
- `latitude` required, numeric, between -90 and 90
- `longitude` required, numeric, between -180 and 180
- `speed` nullable numeric
- `heading` nullable numeric
- `accuracy` nullable numeric
- `recorded_at` nullable date-time

### `GET /api/v1/transport/vehicle/{id}/location`

Returns location history for a vehicle.

## Assigned Routes and Route Actions

### `POST /api/v1/transport/shift/start`

Marks the driver as started for the route/shift.

### `POST /api/v1/transport/shift/end`

Marks the driver shift as completed.

### `POST /api/v1/transport/pickup`

Marks a pickup event for a stop or student.

### `POST /api/v1/transport/drop`

Marks a drop event for a stop or student.

#### Shared payload shape

```json
{
  "route_id": 34,
  "vehicle_id": 12,
  "stop_id": 1,
  "student_id": 88,
  "latitude": 18.5204,
  "longitude": 73.8567,
  "notes": "Boarded at north gate"
}
```

## Suggested Laravel Backend Files

### Routes

- `routes/modules/api.php`
- `routes/modules/api/transport.php`

### Controllers

- `app/Http/Controllers/Api/V1/Transport/DriverTransportController.php`

### Services

- `app/Modules/Transport/Services/DriverTransportService.php`

### Validation

- `app/Http/Requests/Api/V1/Transport/StoreVehicleLocationRequest.php`
- `app/Http/Requests/Api/V1/Transport/DriverRouteActionRequest.php`

### API Resources

- `app/Http/Resources/Driver/DriverTransportResource.php`
- `app/Http/Resources/Transport/RouteStopResource.php`

### Permissions

- `driver.transport.view`
- `driver.transport.location`
- `driver.transport.shift`
- `driver.transport.pickup`
- `driver.transport.drop`

## Notes

- The Expo app already handles parent and driver roles through a shared auth store.
- The transport screens can consume either the parent transport assignment payload or the driver live transport payload.
- The backend should return the same `{ success, message, data }` wrapper used elsewhere in the ERP.