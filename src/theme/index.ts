import { colors } from "./colors";

export const theme = {
  colors,
  typography: {
    h1: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const, letterSpacing: -0.5 },
    h2: { fontSize: 24, lineHeight: 30, fontWeight: "700" as const, letterSpacing: -0.3 },
    h3: { fontSize: 20, lineHeight: 26, fontWeight: "600" as const, letterSpacing: -0.2 },
    h4: { fontSize: 17, lineHeight: 22, fontWeight: "600" as const, letterSpacing: -0.2 },
    body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
    bodySm: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const },
    caption: { fontSize: 11, lineHeight: 16, fontWeight: "500" as const, letterSpacing: 0.3 },
    metric: { fontSize: 26, lineHeight: 32, fontWeight: "700" as const, letterSpacing: -0.3 },
    "metric-sm": { fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: -0.2 },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    "2xl": 24,
    "3xl": 32,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 0.5 },
      shadowOpacity: 0.03,
      shadowRadius: 1.5,
      elevation: 0.5,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  },
} as const;
