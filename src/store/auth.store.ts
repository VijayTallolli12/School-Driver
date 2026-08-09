import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User, Student, LoginPayload, LoginResponse, AuthState } from "@/types";

interface AuthActions {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setStudents: (students: Student[]) => void;
  setLoading: (loading: boolean) => void;
  hydrateFromApi: (data: LoginResponse) => void;
  setParentUuid: (uuid: string | null) => void;
  setSelectedStudentUuid: (uuid: string | null) => void;
  setDriverUuid: (uuid: string | null) => void;
  setAssignedVehicleId: (vehicleId: number | null) => void;
  setAssignedRouteId: (routeId: number | null) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      students: [],
      token: null,
      isAuthenticated: false,
      isLoading: false,
      parentUuid: null,
      selectedStudentUuid: null,
      driverUuid: null,
      assignedVehicleId: null,
      assignedRouteId: null,

      login: async (_payload: LoginPayload) => {
        set({ isLoading: true });
        set({ isLoading: false });
      },

      logout: () => {
        set({
          user: null,
          students: [],
          token: null,
          isAuthenticated: false,
          parentUuid: null,
          selectedStudentUuid: null,
          driverUuid: null,
          assignedVehicleId: null,
          assignedRouteId: null,
        });
      },

      setUser: (user: User) => set({ user }),

      setToken: (token: string) =>
        set({ token, isAuthenticated: !!token }),

      setStudents: (students: Student[]) => set({ students }),

      setLoading: (isLoading: boolean) => set({ isLoading }),

      hydrateFromApi: (data: LoginResponse) =>
        set({
          user: data.user,
          students: data.students,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
          parentUuid: data.parent_uuid ?? null,
          selectedStudentUuid: data.user.role === "parent" ? data.students?.[0]?.uuid ?? null : null,
          driverUuid: data.driver_uuid ?? null,
          assignedVehicleId: data.vehicle_id ?? null,
          assignedRouteId: data.route_id ?? null,
        }),

      setParentUuid: (uuid: string | null) => set({ parentUuid: uuid }),

      setSelectedStudentUuid: (uuid: string | null) => set({ selectedStudentUuid: uuid }),

      setDriverUuid: (uuid: string | null) => set({ driverUuid: uuid }),

      setAssignedVehicleId: (vehicleId: number | null) => set({ assignedVehicleId: vehicleId }),

      setAssignedRouteId: (routeId: number | null) => set({ assignedRouteId: routeId }),
    }),
    {
      name: "school_parent_auth_store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        students: state.students,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        parentUuid: state.parentUuid,
        selectedStudentUuid: state.selectedStudentUuid,
        driverUuid: state.driverUuid,
        assignedVehicleId: state.assignedVehicleId,
        assignedRouteId: state.assignedRouteId,
      }),
    },
  ),
);
