# Parent App Branding Review

## Release 1 — 2026-08-05

## Overview
This document reviews the dynamic branding integration for the Parent App, covering the BrandingService, caching strategy, fallback logic, applied touchpoints, and verification results.

---

## 1. Branding Service

### Files Created
| File | Purpose |
|------|---------|
| `src/types/branding.ts` | TypeScript types for `BrandingData`, `BrandingApiResponse`, `BrandingCacheEntry`, `ThemeColors` |
| `src/constants/branding.ts` | `DEFAULT_BRANDING`, `DEFAULT_THEME`, cache key + TTL constants |
| `src/services/branding.ts` | `BrandingService` class — fetch, sanitize, cache, fallback |
| `src/store/branding.store.ts` | Zustand store with `persist` → AsyncStorage |

### BrandingService Responsibilities
- **Fetch**: `GET /api/v1/branding` with optional `X-School-Id` header + `school_id` param
- **Sanitize**: `sanitizeBranding()` validates/normalizes all fields (never accepts broken data)
- **Cache**: stores branding in AsyncStorage with 30-minute TTL
- **Fallback**: returns cached branding when fetch fails; `DEFAULT_BRANDING` when no cache
- **Refresh**: `refreshBranding()` clears cache then fetches fresh

### Color Normalization
`normalizeColor()` validates hex (7/4-digit), rgb(), rgba() formats. Invalid/missing colors fall back to `#2563eb`. This prevents UI breakage from malformed ERP values.

### Theme Builder
`buildTheme(branding)` derives:
- `primary` → normalized primary color
- `secondary` → normalized secondary color
- `primaryLight` → `primary + "14"` (8% alpha tint for backgrounds)

---

## 2. Caching Strategy

| Aspect | Detail |
|--------|--------|
| Storage | AsyncStorage (via `src/utils/storage.ts`) |
| Key | `school_parent_branding` |
| Entry Shape | `{ data: BrandingData, cachedAt: number }` |
| TTL | 30 minutes (`BRANDING_CACHE_TTL_MS`) |
| Persist | Zustand store also persists branding + theme under `school_parent_branding_store` |

### Cache Flow
```
1. App start → loadBranding() (root _layout)
   ├── Cache valid → use cached branding
   ├── Cache expired/missing → fetch from ERP
   │     ├── Fetch OK → cache + apply
   │     └── Fetch fail → use stale cache OR DEFAULT_BRANDING
2. Login → refreshBranding() (login screen)
3. Pull-to-refresh → refreshBranding() (dashboard onRefresh)
```

---

## 3. Fallback Logic (Multi-layer)

```
ERP branding available  → Use ERP values (sanitized)
ERP branding missing    → DEFAULT_BRANDING (server-side)
Logo null/empty         → Show 🏫 emoji / school initial letter placeholder
Primary color invalid   → #2563eb (default blue)
App name empty          → "School ERP"
API unreachable         → Cached branding (if any) else DEFAULT_BRANDING
First install (no cache)→ DEFAULT_BRANDING
```

### Never Broken / Blank
- `<Image>` only renders when `schoolLogo` is a non-empty string (`hasLogo` guard).
- `sanitizeBranding` coerces empty logos to `null`.
- Text fields always have a non-empty fallback via sanitizer.

---

## 4. Applied Branding Touchpoints

| Touchpoint | File | What Changed |
|------------|------|--------------|
| Splash / Welcome | `src/app/index.tsx` | Dynamic `appName`, `schoolName`, logo image or `🏫` fallback, background uses `branding.primaryColor` |
| Login | `src/app/(auth)/login.tsx` | Dynamic logo, `Welcome to {schoolName}`, `{appName}` in form + footer, brand color icon |
| Header Logo | `src/app/(tabs)/(home)/index.tsx` | School logo + school name in dashboard header; pull-to-refresh also refreshes branding |
| Profile | `src/app/(tabs)/profile/index.tsx` | School logo / initial placeholder, school name |
| Loading | `src/components/ui/Loading.tsx` | Spinner uses `theme.primary` |
| Offline | `src/components/ui/OfflineState.tsx` | Retry button uses `theme.primary` |
| Empty States | `src/components/ui/EmptyState.tsx` | Icon + tint use `theme.primary` / `primaryLight` |
| Buttons | `src/components/ui/Button.tsx` | Primary/secondary/ghost use `theme.primary` |
| Inputs | `src/components/ui/Input.tsx` | Focus border/icon/selection use `theme.primary` |
| Bottom Tab Bar | `src/components/BottomTabBar.tsx` | Active tab icon + label use `theme.primary` |
| App Init | `src/app/_layout.tsx` | `loadBranding()` on mount (app restart) |

### Not Applicable (Documented)
- **Drawer Header**: The Parent App uses bottom tabs, no drawer exists.
- **About Screen**: No dedicated About screen exists (Privacy + Help only).

---

## 5. Non-Goals Respected
- ✅ No backend recreated — existing `/api/v1/branding` consumed.
- ✅ No duplicate branding API.
- ✅ Authentication, navigation, API architecture, business logic unchanged.
- ✅ Design system preserved — hardcoded slate/green/amber/red semantic colors remain; only brand-blue touchpoints are now dynamic.
- ✅ Offline component (`OfflineState`) behavior preserved (visual color now dynamic).
- ✅ No white-label builds, no launcher icon changes, no package name changes, no Expo config changes.

---

## 6. Verification Matrix

| Scenario | Expected | Result |
|----------|----------|--------|
| ERP branding available | School name, logo, colors applied | ✅ Implemented (splash/login/profile/header) |
| ERP branding missing | Defaults: "School ERP", `🏫` logo, `#2563eb` | ✅ Fallback chain |
| Offline mode | Cached branding used; no broken images | ✅ Cache-first + fallback |
| Cache | Branding cached 30-min TTL in AsyncStorage | ✅ |
| App restart | `loadBranding()` re-fetches/applies | ✅ |
| Logo fallback | Emoji/initial placeholder, no broken `<Image>` | ✅ |
| School name fallback | "School ERP" when empty | ✅ |

---

## 7. Verification Execution

- **TypeScript**: `npx tsc --noEmit` → PASSED (0 errors)
- **Files Modified**: 15
- **New Files**: 4 (types, constants, service, store)
