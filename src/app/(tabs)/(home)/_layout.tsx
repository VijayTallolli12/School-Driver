import { Stack } from "expo-router";

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="student-profile" />
      <Stack.Screen name="fees" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="notifications/index" />
      <Stack.Screen name="notifications/[id]" />
      <Stack.Screen name="timetable" />
      <Stack.Screen name="results" />
      <Stack.Screen name="homework" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="documents" />
      <Stack.Screen name="circulars" />
      <Stack.Screen name="circulars/[id]" />
      <Stack.Screen name="leave" />
      <Stack.Screen name="leave/apply" />
      <Stack.Screen name="leave/[id]" />
      <Stack.Screen name="transport/index" />
      <Stack.Screen name="transport/emergency" />
      <Stack.Screen name="transport/live-trip" />
      <Stack.Screen name="transport/stop-attendance" />
      <Stack.Screen name="transport/trip-success" />
      <Stack.Screen name="transport/live-gps" />
      <Stack.Screen name="transport/trip-history" />
    </Stack>
  );
}
