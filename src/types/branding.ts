export interface BrandingData {
  schoolName: string;
  schoolLogo: string | null;
  favicon: string | null;
  primaryColor: string;
  secondaryColor: string;
  schoolWebsite: string;
  schoolAddress: string;
  schoolPhone: string;
  appName: string;
}

export interface BrandingApiResponse {
  success: boolean;
  message: string;
  data: {
    school_name: string;
    school_logo: string | null;
    favicon: string | null;
    primary_color: string;
    secondary_color: string;
    school_website: string;
    school_address: string;
    school_phone: string;
    app_name: string;
  };
}

export interface BrandingCacheEntry {
  data: BrandingData;
  cachedAt: number;
}

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  background: string;
  backgroundCard: string;
  text: string;
  textSecondary: string;
  textMuted: string;
}
