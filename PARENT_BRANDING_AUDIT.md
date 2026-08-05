# Parent App Branding Audit

## Release 1 — 2026-08-05

## Objective
Audit the existing Branding API (backend) and the current Parent App branding (frontend), identifying all hardcoded values that must be replaced by runtime ERP branding.

---

## 1. Branding API (Backend — Already Exists)

### Endpoint
`GET /api/v1/branding`

### Route Definition
`routes/modules/api/branding.php`
```php
Route::get('branding', [BrandingController::class, 'show'])->name('branding.show');
```

### Controller
`app/Http/Controllers/Api/V1/BrandingController.php`

### API Response Shape
```json
{
  "success": true,
  "message": "Branding retrieved.",
  "data": {
    "school_name": "Example School",
    "school_logo": "https://example.com/storage/logo.png",
    "favicon": "https://example.com/storage/favicon.ico",
    "primary_color": "#2563eb",
    "secondary_color": "#64748b",
    "school_website": "https://example.com",
    "school_address": "123 Main St",
    "school_phone": "+1-555-0123",
    "app_name": "School ERP"
  }
}
```

### School Identification
- `X-School-Id` HTTP header
- `school_id` query parameter

### Fallback Behavior (Server-side)
| Condition | Response |
|-----------|----------|
| No `X-School-Id` / `school_id` | `defaultBranding()` |
| School not found | `defaultBranding()` |
| Missing settings | `config('app.name', 'School ERP')` etc. |

### Access
- Public (no authentication required)
- Mounted under `/api/v1/` prefix

---

## 2. Current Frontend Branding (Hardcoded Values)

### A. App Name
| File | Line | Value |
|------|------|-------|
| `src/constants/config.ts` | 2 | `APP_NAME = "School Parent"` (dead code — never imported) |
| `src/app/index.tsx` | 49 | `School Parent` (splash text) |
| `src/app/(auth)/login.tsx` | 183 | `School Parent App` (login footer) |
| `app.json` | 3 | `"name": "school-parent"` (build-time — not changed per requirements) |
| `package.json` | 2 | `"name": "school-parent"` |

### B. Logo / Icon / Splash
| File | Line | Value |
|------|------|-------|
| `src/app/index.tsx` | 45-46 | Hardcoded `🏫` emoji logo inside white box |
| `src/app/(auth)/login.tsx` | 115-116 | `Ionicons "school-outline"` + `color="#2563EB"` |
| `app.json` | 7, 11-13, 21-22, 28 | Static build-time icon/splash assets (NOT changed) |

### C. Brand Colors (Primary Blue Palette)
| Hex | Role | Locations (count) |
|-----|------|-------------------|
| `#3B82F6` | Primary 500 | 30+ locations |
| `#2563EB` | Primary 600 | 40+ locations |
| `#1D4ED8` | Primary 700 | theme |
| `#1E40AF` | Primary 800 | theme |
| `#1E3A8A` | Primary 900 | theme |
| `#60A5FA` | Primary 400 | theme |
| `#93C5FD` | Primary 300 | theme |
| `#BFDBFE` | Primary 200 | theme |
| `#DBEAFE` | Primary 100 | theme |
| `#EFF6FF` | Primary 50 | theme |

Defined in: `src/theme/colors.ts` (lines 2-12), `tailwind.config.js` (lines 8-18).

### D. Splash Screen Colors (`src/app/index.tsx`)
| Line | Value |
|------|-------|
| 40 | `bg-blue-600` (splash background) |
| 49 | `text-white` app name |
| 51 | `text-blue-200` subtitle |
| 59 | `text-blue-300` version |

### E. Other Hardcoded Branding
| File | Line | Value |
|------|------|-------|
| `src/app/(auth)/login.tsx` | 188 | `Powered by Folkslogic` |
| `src/app/(tabs)/profile/index.tsx` | 58 | `user?.email || "parent@school.com"` |
| `src/components/ui/Button.tsx` | 83 | `shadowColor: "#2563EB"` |
| `src/components/ui/Button.tsx` | 96 | `color: "#2563EB"` (secondary) |
| `src/components/ui/Input.tsx` | 59, 67, 89, 104 | `#3B82F6` (focus states) |
| `src/components/BottomTabBar.tsx` | 64, 71 | `#2563EB` (active tab) |
| `src/components/ui/Loading.tsx` | 13, 24 | `#3B82F6` (spinner) |
| `src/components/ui/OfflineState.tsx` | 33 | `bg-primary-600` (retry button) |

---

## 3. Branding Touchpoints Required (from Release Spec)

| Touchpoint | Current State | Action |
|------------|---------------|--------|
| Login Screen | Hardcoded icon + "School Parent App" | Replace with branding |
| Splash Content (inside app) | Hardcoded `🏫` + "School Parent" + `bg-blue-600` | Replace with branding |
| Header Logo | Dashboard header had no logo | Add school logo + name |
| Drawer Header | No drawer exists (bottom tabs) | N/A — documented |
| Welcome Screen | Splash acts as welcome | Covered by splash |
| About Screen | No dedicated About screen (Privacy/Help exist) | Documented |
| Profile Screen | Hardcoded initials + parent@school.com | Replace with school branding |
| Loading Screens | Hardcoded `#3B82F6` spinners | Use brand color |
| Offline Screen | `bg-primary-600` retry button | Use brand color |
| Empty States | `bg-slate-100` icon | Use brand color |

---

## 4. Gap Summary
1. App name is hardcoded in splash + login footer.
2. Splash background is hardcoded `bg-blue-600`.
3. Logo is a hardcoded emoji/ionicon — no runtime logo from ERP.
4. Brand color (`#2563EB` / `#3B82F6`) is hardcoded across 70+ UI locations.
5. No BrandingService, no cache, no branding store existed in the Parent App.
6. The `APP_NAME` constant exists but is unused.

---

## 5. Scope Constraints (not modified)
- Backend not recreated (existing Branding API consumed).
- No duplicate branding API created.
- Authentication, navigation, API architecture, business logic, design system, and offline component behavior preserved.
- No white-label builds, no launcher icon changes, no package name changes, no Expo config changes.
