"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useCallback } from "react";

/**
 * useApiClient — small wrapper around fetch that:
 *  - injects the access token
 *  - handles 401 → refresh → retry once
 *  - parses JSON or throws
 */
export function useApiClient() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const setAuthModal = useAppStore((s) => s.setAuthModal);
  const { toast } = useToast();

  const refresh = useCallback(async (): Promise<string | null> => {
    if (!refreshToken) return null;
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        logout();
        setAuthModal("login");
        return null;
      }
      const data = await res.json();
      setUser(data.user, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      return data.accessToken;
    } catch {
      logout();
      setAuthModal("login");
      return null;
    }
  }, [refreshToken, setUser, logout, setAuthModal]);

  const apiFetch = useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      const tryRequest = async (token: string | null): Promise<Response> => {
        return fetch(path, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers || {}),
          },
        });
      };

      let res = await tryRequest(accessToken);
      if (res.status === 401 && refreshToken) {
        const newToken = await refresh();
        if (newToken) {
          res = await tryRequest(newToken);
        }
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let message = text;
        try {
          const json = JSON.parse(text);
          message = json.error || json.message || text;
        } catch {
          // keep raw
        }
        const err = new Error(message || `Request failed: ${res.status}`) as any;
        err.status = res.status;
        err.body = text;
        throw err;
      }
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return res.json() as Promise<T>;
      }
      return (await res.text()) as unknown as T;
    },
    [accessToken, refreshToken, refresh]
  );

  return { apiFetch, refresh };
}

/**
 * useAuthActions — register / login / logout helpers
 */
export function useAuthActions() {
  const setUser = useAuthStore((s) => s.setUser);
  const logoutStore = useAuthStore((s) => s.logout);
  const setAuthModal = useAppStore((s) => s.setAuthModal);
  const { toast } = useToast();

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data.user, {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    setAuthModal("none");
    toast({ title: "Welcome back!", description: data.user.email });
    return data.user;
  };

  const register = async (input: {
    email: string;
    password: string;
    name?: string;
  }) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user, {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    setAuthModal("none");
    toast({
      title: "Account created!",
      description: "Welcome to AI Commerce OS.",
    });
    return data.user;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // ignore
    }
    logoutStore();
    toast({ title: "Signed out" });
  };

  return { login, register, logout };
}
