"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useAppStore } from "@/stores/app-store";
import { LandingPage } from "@/components/landing/landing-page";
import { AuthModal } from "@/components/landing/auth-modal";
import { AppShell } from "@/components/app/app-shell";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const authModal = useAppStore((s) => s.authModal);
  const setView = useAppStore((s) => s.setView);

  // Whenever auth changes, sync the active view.
  useEffect(() => {
    if (user && (useAppStore.getState().view === "landing")) {
      setView("dashboard");
    }
    if (!user && useAppStore.getState().view !== "landing") {
      setView("landing");
    }
  }, [user, setView]);

  // Avoid SSR/hydration flash
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {user ? <AppShell /> : <LandingPage />}
      <AuthModal open={authModal !== "none"} />
    </>
  );
}
