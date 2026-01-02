import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DashboardState {
  isTrained: boolean;
  setTrained: (status: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      isTrained: false,
      setTrained: (status) => set({ isTrained: status }),
    }),
    {
      name: 'dashboard-storage', 
    }
  )
);