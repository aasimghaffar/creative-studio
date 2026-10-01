import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface UiState {
  /** Desktop sidebar expanded/collapsed (persisted). */
  sidebarOpen: boolean;
  /** Mobile sidebar drawer (never persisted). */
  mobileSidebarOpen: boolean;
  /** Optional right panel (persisted). */
  rightPanelOpen: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;

  /** Admin shell (separate from the user shell). */
  adminSidebarOpen: boolean;
  adminMobileSidebarOpen: boolean;
  toggleAdminSidebar: () => void;
  setAdminMobileSidebarOpen: (open: boolean) => void;
}

/**
 * Global UI state (Zustand v5) for the app shell.
 * Select narrowly in components: useUiStore((s) => s.sidebarOpen)
 */
export const useUiStore = create<UiState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        mobileSidebarOpen: false,
        rightPanelOpen: false,

        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen }), false, "ui/toggleSidebar"),
        setSidebarOpen: (open) => set({ sidebarOpen: open }, false, "ui/setSidebarOpen"),
        setMobileSidebarOpen: (open) =>
          set({ mobileSidebarOpen: open }, false, "ui/setMobileSidebarOpen"),
        toggleRightPanel: () =>
          set((s) => ({ rightPanelOpen: !s.rightPanelOpen }), false, "ui/toggleRightPanel"),
        setRightPanelOpen: (open) => set({ rightPanelOpen: open }, false, "ui/setRightPanelOpen"),

        adminSidebarOpen: true,
        adminMobileSidebarOpen: false,
        toggleAdminSidebar: () =>
          set((s) => ({ adminSidebarOpen: !s.adminSidebarOpen }), false, "ui/toggleAdminSidebar"),
        setAdminMobileSidebarOpen: (open) =>
          set({ adminMobileSidebarOpen: open }, false, "ui/setAdminMobileSidebarOpen"),
      }),
      {
        name: "ui-store",
        partialize: (s) => ({
          sidebarOpen: s.sidebarOpen,
          rightPanelOpen: s.rightPanelOpen,
          adminSidebarOpen: s.adminSidebarOpen,
        }),
      },
    ),
    { name: "UiStore", enabled: import.meta.env.DEV },
  ),
);
