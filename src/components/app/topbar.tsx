"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppStore, type AppView } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { useAuthActions, useApiClient } from "@/hooks/use-api";
import { relativeTime } from "@/lib/relative-time";
import { useI18n, availableLocales } from "@/i18n";
import {
  Store as StoreIcon,
  ChevronDown,
  Plus,
  Languages,
  Check,
} from "lucide-react";
import {
  Menu,
  Moon,
  Sun,
  Bell,
  Settings,
  ShieldHalf,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  Search,
  Command,
} from "lucide-react";

const VIEW_TITLES: Record<AppView, string> = {
  landing: "nav.dashboard",
  dashboard: "nav.dashboard",
  hunter: "nav.hunter",
  "ai-assistant": "nav.aiAssistant",
  "product-research": "nav.productResearch",
  "listing-generator": "nav.listingGenerator",
  "image-studio": "nav.imageStudio",
  "seo-studio": "nav.seoStudio",
  "profit-calculator": "nav.profitCalculator",
  "trend-analysis": "nav.trendAnalysis",
  "saved-projects": "nav.savedProjects",
  memory: "nav.memory",
  intelligence: "nav.intelligence",
  advisor: "nav.advisor",
  opportunities: "nav.opportunities",
  automation: "nav.automation",
  "competitor-monitor": "nav.competitorMonitor",
  "export-center": "nav.exportCenter",
  stores: "nav.stores",
  pipeline: "nav.pipeline",
  "listing-studio": "nav.listingGenerator",
  "media-studio": "nav.imageStudio",
  settings: "nav.settings",
  admin: "nav.adminPanel",
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  readAt?: string | null;
  createdAt: string;
};

export function Topbar() {
  const view = useAppStore((s) => s.view);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const setView = useAppStore((s) => s.setView);
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const setActiveStoreId = useAppStore((s) => s.setActiveStoreId);
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const impersonatedBy = useAuthStore((s) => s.impersonatedBy);
  const exitImpersonation = useAuthStore((s) => s.exitImpersonation);
  const { logout } = useAuthActions();
  const { apiFetch } = useApiClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stores, setStores] = useState<Array<{ id: string; name: string; marketplace: string }>>([]);

  useEffect(() => {
    setMounted(true);
    // Load stores
    (async () => {
      try {
        const data = await apiFetch<{ stores: Array<{ id: string; name: string; marketplace: string }> }>("/api/stores");
        setStores(data.stores || []);
        // Auto-select first store if none selected
        if (data.stores?.length > 0 && !activeStoreId) {
          setActiveStoreId(data.stores[0].id);
        }
      } catch {
        // ignore
      }
    })();
  }, [apiFetch, activeStoreId, setActiveStoreId]);

  const initials = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";
  const unread = notifications.filter((n) => !n.readAt).length;

  const loadNotifications = async () => {
    setLoadingNotif(true);
    try {
      const data = await apiFetch<{
        notifications: Notification[];
        unreadCount: number;
      }>("/api/notifications");
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotif(false);
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications?action=mark-all-read", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch (err: any) {
      // ignore
    }
  };

  const onBellClick = () => {
    setNotifOpen(true);
    loadNotifications();
  };

  const openCommand = () => {
    // Simulate the global Cmd+K hotkey
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true })
    );
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
      {impersonatedBy && (
        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
          <span className="font-medium">
            Viewing as {user?.email}
          </span>
          <span className="opacity-70 hidden sm:inline">
            (impersonated by {impersonatedBy})
          </span>
          <button
            type="button"
            onClick={exitImpersonation}
            className="ml-1 rounded bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 font-medium transition-colors"
            aria-label="Exit impersonation"
          >
            Exit
          </button>
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open sidebar"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="size-4" />
      </Button>
      <h1 className="text-base sm:text-lg font-semibold">
        {t(VIEW_TITLES[view] || "nav.dashboard")}
      </h1>

      {/* Store Switcher */}
      {stores.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-md border bg-muted/40 hover:bg-accent transition-colors px-2.5 py-1.5 text-sm">
              <StoreIcon className="size-3.5 text-primary" />
              <span className="font-medium max-w-[120px] truncate hidden sm:inline">
                {stores.find((s) => s.id === activeStoreId)?.name || "Select store"}
              </span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {stores.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => setActiveStoreId(s.id)}
                className={s.id === activeStoreId ? "bg-accent" : ""}
              >
                <StoreIcon className="size-3.5 mr-2" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{s.marketplace}</p>
                </div>
                {s.id === activeStoreId && (
                  <span className="size-2 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView("stores")}>
              <Plus className="size-3.5 mr-2" />
              <span>Manage stores</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="ml-auto flex items-center gap-1">
        {/* Command palette trigger (desktop) */}
        <button
          onClick={openCommand}
          className="hidden md:flex items-center gap-2 rounded-md border bg-muted/40 hover:bg-accent transition-colors px-2.5 py-1.5 text-sm text-muted-foreground"
          aria-label="Open command palette"
        >
          <Search className="size-3.5" />
          <span className="text-xs">Search…</span>
          <kbd className="ml-2 hidden lg:inline-flex items-center gap-0.5 rounded border bg-background px-1 text-[10px] font-mono">
            {mounted && (navigator.platform.includes("Mac") ? (
              <Command className="size-2.5" />
            ) : (
              "Ctrl"
            ))}
            <span className="opacity-60">K</span>
          </kbd>
        </button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 hidden dark:block" />
          <Moon className="size-4 dark:hidden" />
        </Button>

        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Switch language"
            >
              <Languages className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableLocales.map((l) => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => useI18n.getState().setLocale(l.code)}
                className={useI18n.getState().locale === l.code ? "bg-accent" : ""}
              >
                <span className="mr-2 text-base">{l.flag}</span>
                <span>{l.name}</span>
                {useI18n.getState().locale === l.code && (
                  <Check className="size-3.5 ml-auto text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
          onClick={onBellClick}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-primary" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full hover:bg-accent p-1 pr-2 transition-colors"
              aria-label="User menu"
            >
              <Avatar className="size-7">
                {user?.image ? <AvatarImage src={user.image} alt="" /> : null}
                <AvatarFallback className="text-xs brand-gradient text-white">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                {user?.name || "User"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span className="text-sm font-medium truncate">{user?.name || "User"}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView("settings")}>
              <UserIcon className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setView("settings")}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView("admin")}>
                  <ShieldHalf className="size-4" />
                  Admin Panel
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => logout()}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Notifications Sheet */}
      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>Notifications</SheetTitle>
              {notifications.some((n) => !n.readAt) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={markAllRead}
                >
                  Mark all as read
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto scroll-thin p-4">
            {loadingNotif ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-md bg-accent animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <CheckCircle2 className="size-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  All caught up.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We'll let you know when something happens.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {notifications.map((n) => {
                  const isUnread = !n.readAt;
                  return (
                    <li
                      key={n.id}
                      className={
                        "rounded-lg border p-3 transition-colors " +
                        (isUnread
                          ? "bg-primary/5 border-primary/30 hover:bg-primary/10"
                          : "hover:bg-accent/50")
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={
                            "capitalize " +
                            (n.type === "error"
                              ? "border-destructive/40 text-destructive"
                              : n.type === "success"
                              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                              : n.type === "warning"
                              ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                              : "")
                          }
                        >
                          {n.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {n.message}
                      </p>
                      {isUnread && (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary">
                          <span className="size-1.5 rounded-full bg-primary" />
                          New
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
