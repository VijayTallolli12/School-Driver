import type { BrandingData, BrandingApiResponse } from "@/types/branding";
import { DEFAULT_BRANDING, DEFAULT_THEME, BRANDING_CACHE_KEY, BRANDING_CACHE_TTL_MS } from "@/constants/branding";
import { storage } from "@/utils/storage";
import apiClient from "@/services/api";

export function normalizeColor(color: string | null | undefined): string {
  if (!color || color.trim() === "") return DEFAULT_THEME.primary;
  const trimmed = color.trim();
  if (trimmed.startsWith("#") && (trimmed.length === 7 || trimmed.length === 4)) return trimmed;
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(trimmed)) return trimmed;
  if (/^rgba?\([\d\s,.]+\)$/.test(trimmed)) return trimmed;
  return DEFAULT_THEME.primary;
}

export function sanitizeBranding(data: Partial<BrandingData> | null | undefined): BrandingData {
  if (!data) return { ...DEFAULT_BRANDING };
  return {
    schoolName: data.schoolName && data.schoolName.trim() !== "" ? data.schoolName.trim() : DEFAULT_BRANDING.schoolName,
    schoolLogo: data.schoolLogo && data.schoolLogo.trim() !== "" ? data.schoolLogo.trim() : null,
    favicon: data.favicon && data.favicon.trim() !== "" ? data.favicon.trim() : null,
    primaryColor: normalizeColor(data.primaryColor),
    secondaryColor: normalizeColor(data.secondaryColor),
    schoolWebsite: data.schoolWebsite ?? DEFAULT_BRANDING.schoolWebsite,
    schoolAddress: data.schoolAddress ?? DEFAULT_BRANDING.schoolAddress,
    schoolPhone: data.schoolPhone ?? DEFAULT_BRANDING.schoolPhone,
    appName: data.appName && data.appName.trim() !== "" ? data.appName.trim() : DEFAULT_BRANDING.appName,
  };
}

export function buildTheme(branding: BrandingData) {
  const primary = normalizeColor(branding.primaryColor);
  const secondary = normalizeColor(branding.secondaryColor);
  return {
    ...DEFAULT_THEME,
    primary,
    secondary,
    primaryLight: `${primary}14`,
  };
}

class BrandingService {
  private cachedBranding: BrandingData | null = null;
  private cacheTimestamp = 0;

  async getBranding(schoolId?: number): Promise<BrandingData> {
    const cached = await this.getCachedBranding();

    if (cached && this.isCacheValid()) {
      this.cachedBranding = cached;
      this.cacheTimestamp = Date.now();
      return cached;
    }

    const fetched = await this.fetchBranding(schoolId);
    if (fetched) {
      await this.cacheBranding(fetched);
      this.cachedBranding = fetched;
      this.cacheTimestamp = Date.now();
      return fetched;
    }

    return cached ?? { ...DEFAULT_BRANDING };
  }

  async refreshBranding(schoolId?: number): Promise<BrandingData> {
    await this.clearCache();
    this.cachedBranding = null;
    this.cacheTimestamp = 0;
    return this.getBranding(schoolId);
  }

  getCachedBrandingSync(): BrandingData | null {
    return this.cachedBranding;
  }

  private async fetchBranding(schoolId?: number): Promise<BrandingData | null> {
    try {
      const params: Record<string, number> = {};
      const headers: Record<string, string> = {};
      if (schoolId && schoolId > 0) {
        params.school_id = schoolId;
        headers["X-School-Id"] = String(schoolId);
      }

      const response = await apiClient.get<BrandingApiResponse>(`/branding`, { params, headers, timeout: 10000 });
      const body = response.data;
      if (body?.success && body?.data) {
        return sanitizeBranding({
          schoolName: body.data.school_name,
          schoolLogo: body.data.school_logo,
          favicon: body.data.favicon,
          primaryColor: body.data.primary_color,
          secondaryColor: body.data.secondary_color,
          schoolWebsite: body.data.school_website,
          schoolAddress: body.data.school_address,
          schoolPhone: body.data.school_phone,
          appName: body.data.app_name,
        });
      }
      return null;
    } catch {
      return null;
    }
  }

  private async getCachedBranding(): Promise<BrandingData | null> {
    try {
      const entry = await storage.get<{ data: BrandingData; cachedAt: number }>(BRANDING_CACHE_KEY);
      if (!entry || !entry.data) return null;
      this.cacheTimestamp = entry.cachedAt ?? 0;
      return sanitizeBranding(entry.data);
    } catch {
      return null;
    }
  }

  private async cacheBranding(branding: BrandingData): Promise<void> {
    await storage.set(BRANDING_CACHE_KEY, { data: branding, cachedAt: Date.now() });
  }

  private async clearCache(): Promise<void> {
    await storage.remove(BRANDING_CACHE_KEY);
  }

  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < BRANDING_CACHE_TTL_MS;
  }
}

export const brandingService = new BrandingService();
