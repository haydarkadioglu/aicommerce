"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  roles: string[];
  permissions: string[];
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  // Impersonation tracking — set when an admin signs in as another user.
  // The admin's original email is preserved so they can exit impersonation.
  impersonatedBy: string | null;
  originalAdminUser: AuthUser | null;
  setUser: (
    user: AuthUser | null,
    tokens?: { accessToken: string; refreshToken: string }
  ) => void;
  startImpersonation: (
    targetUser: AuthUser,
    tokens: { accessToken: string; refreshToken: string },
    adminEmail: string
  ) => void;
  exitImpersonation: () => void;
  logout: () => void;
  isAdmin: () => boolean;
  hasPermission: (perm: string) => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      impersonatedBy: null,
      originalAdminUser: null,
      setUser: (user, tokens) =>
        set({
          user,
          accessToken: tokens?.accessToken ?? get().accessToken,
          refreshToken: tokens?.refreshToken ?? get().refreshToken,
        }),
      startImpersonation: (targetUser, tokens, adminEmail) =>
        set({
          // Save the current admin user so we can restore it on exit
          originalAdminUser: get().user,
          user: targetUser,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          impersonatedBy: adminEmail,
        }),
      exitImpersonation: () => {
        // Restore the original admin user. Tokens are stale but the user
        // will need to sign in again (their admin session was replaced).
        const admin = get().originalAdminUser;
        set({
          user: admin,
          impersonatedBy: null,
          originalAdminUser: null,
          // Clear tokens — admin needs to log back in as themselves
          accessToken: null,
          refreshToken: null,
        });
      },
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          impersonatedBy: null,
          originalAdminUser: null,
        }),
      isAdmin: () => !!get().user?.roles?.includes("admin"),
      hasPermission: (perm) => {
        const u = get().user;
        if (!u) return false;
        if (u.roles.includes("admin")) return true;
        return u.permissions.includes(perm);
      },
    }),
    {
      name: "ai-commerce-auth",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        impersonatedBy: s.impersonatedBy,
        originalAdminUser: s.originalAdminUser,
      }),
    }
  )
);
