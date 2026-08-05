import type { BrandingData, ThemeColors } from "@/types/branding";

export const DEFAULT_BRANDING: BrandingData = {
  schoolName: "School ERP",
  schoolLogo: null,
  favicon: null,
  primaryColor: "#2563eb",
  secondaryColor: "#64748b",
  schoolWebsite: "",
  schoolAddress: "",
  schoolPhone: "",
  appName: "School ERP",
};

export const DEFAULT_THEME: ThemeColors = {
  primary: "#2563eb",
  primaryLight: "rgba(37,99,235,0.08)",
  secondary: "#64748b",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0ea5e9",
  background: "#f8fafc",
  backgroundCard: "#ffffff",
  text: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
};

export const BRANDING_CACHE_KEY = "school_parent_branding";
export const BRANDING_CACHE_TTL_MS = 30 * 60 * 1000;
