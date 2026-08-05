import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BrandingData, ThemeColors } from "@/types/branding";
import { DEFAULT_BRANDING, DEFAULT_THEME } from "@/constants/branding";
import { buildTheme, brandingService } from "@/services/branding";

interface BrandingState {
  branding: BrandingData;
  theme: ThemeColors;
  isLoaded: boolean;
  isLoading: boolean;
  hasError: boolean;
  loadBranding: (schoolId?: number) => Promise<void>;
  refreshBranding: (schoolId?: number) => Promise<void>;
  applyBranding: (branding: BrandingData) => void;
}

export const useBrandingStore = create<BrandingState>()(
  persist(
    (set) => ({
      branding: { ...DEFAULT_BRANDING },
      theme: { ...DEFAULT_THEME },
      isLoaded: false,
      isLoading: false,
      hasError: false,

      loadBranding: async (schoolId?: number) => {
        set({ isLoading: true, hasError: false });
        try {
          const branding = await brandingService.getBranding(schoolId);
          set({
            branding,
            theme: buildTheme(branding),
            isLoaded: true,
            isLoading: false,
            hasError: false,
          });
        } catch {
          set({ isLoading: false, hasError: true });
        }
      },

      refreshBranding: async (schoolId?: number) => {
        set({ isLoading: true, hasError: false });
        try {
          const branding = await brandingService.refreshBranding(schoolId);
          set({
            branding,
            theme: buildTheme(branding),
            isLoaded: true,
            isLoading: false,
            hasError: false,
          });
        } catch {
          set({ isLoading: false, hasError: true });
        }
      },

      applyBranding: (branding: BrandingData) =>
        set({
          branding,
          theme: buildTheme(branding),
          isLoaded: true,
          hasError: false,
        }),
    }),
    {
      name: "school_parent_branding_store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        branding: state.branding,
        theme: state.theme,
        isLoaded: state.isLoaded,
      }),
    },
  ),
);
