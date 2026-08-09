const DEFAULT_API_URL = "https://school-erp-production-e3a5.up.railway.app/api/v1";
const MAPS_KEY_PLACEHOLDER = "YOUR_ANDROID_GOOGLE_MAPS_API_KEY";

/**
 * Dynamic Expo config. Reads EXPO_PUBLIC_* vars (loaded from .env / .env.development /
 * .env.production / EAS build env) so native identifiers and API endpoints can be
 * swapped between dev and production without editing source.
 * ref https://docs.expo.dev/versions/v54.0.0/config/app/
 */
module.exports = ({ config }) => {
  const apiUrl =
    (process.env.EXPO_PUBLIC_API_URL || "").trim() || DEFAULT_API_URL;
  const mapsKey =
    (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim() ||
    (process.env.GOOGLE_MAPS_API_KEY || "").trim() ||
    MAPS_KEY_PLACEHOLDER;

  return {
    ...config,
    name: "School Driver App",
    slug: "school-driver",
    scheme: "schooldriver",
    version: config.version ?? "1.0.0",

    ios: {
      ...config.ios,
      bundleIdentifier: "com.school.driver",
      supportsTablet: true,
      infoPlist: {
        ...(config.ios?.infoPlist ?? {}),
        UIBackgroundModes: ["location", "fetch", "remote-notification"],
      },
    },

    android: {
      ...config.android,
      package: "com.school.driver",
      config: {
        ...(config.android?.config ?? {}),
        googleMaps: { apiKey: mapsKey },
      },
    },

    extra: {
      ...config.extra,
      apiUrl,
      googleMapsApiKey: mapsKey,
    },

    plugins: [
      ...(config.plugins ?? []),
      [
        "expo-notifications",
        {
          color: "#064E3B",
          defaultChannel: "trip-alerts",
          enableBackgroundRemoteNotifications: true,
        },
      ],
    ],
  };
};