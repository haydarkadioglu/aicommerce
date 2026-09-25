"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AppView =
  | "landing"
  | "dashboard"
  | "hunter"
  | "ai-assistant"
  | "product-research"
  | "listing-generator"
  | "image-studio"
  | "seo-studio"
  | "profit-calculator"
  | "trend-analysis"
  | "saved-projects"
  | "memory"
  | "intelligence"
  | "advisor"
  | "opportunities"
  | "automation"
  | "competitor-monitor"
  | "export-center"
  | "stores"
  | "pipeline"
  | "listing-studio"
  | "media-studio"
  | "settings"
  | "admin";

export type AdminSection =
  | "users"
  | "roles"
  | "providers"
  | "prompts"
  | "agents"
  | "logs"
  | "usage"
  | "flags"
  | "settings"
  | "plans"
  | "jobs"
  | "system"
  | "notifications";

type AppState = {
  view: AppView;
  adminSection: AdminSection;
  authModal: "none" | "login" | "register";
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  activeStoreId: string | null;
  setView: (v: AppView) => void;
  setAdminSection: (s: AdminSection) => void;
  setAuthModal: (m: "none" | "login" | "register") => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (t: "light" | "dark" | "system") => void;
  setActiveStoreId: (id: string | null) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: "landing",
      adminSection: "users",
      authModal: "none",
      sidebarOpen: false,
      theme: "system",
      activeStoreId: null,
      setView: (view) => set({ view }),
      setAdminSection: (adminSection) => set({ adminSection }),
      setAuthModal: (authModal) => set({ authModal }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setTheme: (theme) => set({ theme }),
      setActiveStoreId: (activeStoreId) => set({ activeStoreId }),
    }),
    {
      name: "ai-commerce-app",
      partialize: (s) => ({
        activeStoreId: s.activeStoreId,
        theme: s.theme,
      }),
    }
  )
);
