# Parent App Functional Review

## Scope
- Reviewed remaining Parent App modules after authentication, login, and route guard work.
- Focused only on production issues, not UI redesign.
- Covered screens and services under `src/app/(tabs)/(home)` and related support code.

## Reviewed Modules
- Dashboard
- Attendance
- Calendar
- Fees
- Results
- Homework
- Timetable
- Documents
- Circulars
- Notifications
- Leave list
- Leave detail
- Apply leave
- Student profile
- Edit profile
- Change password

## Issues Found
1. Attendance/Calendar month navigation did not update year on rollover.
2. Some screen load guards returned early without clearing `refreshing`, causing stuck refresh state.
3. Leave detail screen could fail if `childUuid` was not present in route params.
4. `api.ts` unwrap helper assumed success and did not validate response wrapper consistently.
5. Dashboard and circulars early-return branches did not reset refresh state.

## Fixes Applied
- Attendance: added `selectedYear` state and fixed year rollover for previous/next month changes.
- Calendar: added `selectedYear` state and fixed year rollover for month navigation.
- Leave detail: added fallback from `useAuthStore` selected student UUID when route param is missing.
- Multiple screens: ensured invalid parent/child guard paths also clear `refreshing` state.
- API service: enhanced `unwrap()` to validate `success` and throw if response wrapper indicates failure.
- Dashboard and circulars: added refresh state cleanup on missing `parentUuid`.

## Validation
- Ran `npx tsc --noEmit` successfully with no compiler errors.
- Verified modified files have no diagnostics reported by workspace error checker.

## Notes
- All fixes are limited to functional stability; no screen behavior was redesigned.
- The auth/login/route guard area was intentionally excluded per scope.
- Remaining risk is primarily API contract dependence and runtime data availability for child/student selection.
