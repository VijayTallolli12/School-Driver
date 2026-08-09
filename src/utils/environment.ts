import Constants, { ExecutionEnvironment } from "expo-constants";

// Expo Go cannot run the remote-push and background-task APIs (SDK 53+).
// `isExpoGo()` lets us skip those calls so development in Expo Go stays quiet;
// the same code runs fully in development/production builds.
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function isDevBuild(): boolean {
  return !isExpoGo() && __DEV__;
}

// Dev/testing convenience: lets the driver finalize a trip from ANY stop
// (instead of only the last one), so a mistakenly-started trip or a test
// run can be stopped from the app. Production builds keep the last-stop gate.
export function allowForceEnd(): boolean {
  return __DEV__;
}