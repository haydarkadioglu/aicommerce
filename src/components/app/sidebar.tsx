"use client";

import { useAppStore, type AppView } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuthActions } from "@/hooks/use-api";
import {
  LayoutDashboard,
  Bot,
  Search,
  FileText,
  Image as ImageIcon,
  Calculator,
  TrendingUp,
  FolderKanban,
  Settings as SettingsIcon,
  ShieldHalf,
  Sparkles,
  LogOut,
  Tag,
  Brain,
  Radar,
  Lightbulb,
  Clock,
  Users,
  Database,
  Store as StoreIcon,
  Crosshair,
  Zap,
} from "lucide-react";

type NavItem = {
  key: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "hunter", label: "Product Hunter", icon: Crosshair },
  { key: "pipeline", label: "One-Click Pipeline", icon: Zap },
  { key: "intelligence", label: "Product Intelligence", icon: Radar },
  { key: "advisor", label: "Business Advisor", icon: Lightbulb },
  { key: "opportunities", label: "Opportunity Scanner", icon: TrendingUp },
  { key: "ai-assistant", label: "AI Assistant", icon: Bot },
  { key: "product-research", label: "Product Research", icon: Search },
  { key: "listing-generator", label: "Listing Generator", icon: FileText },
  { key: "image-studio", label: "Image Studio", icon: ImageIcon },
  { key: "seo-studio", label: "SEO Studio", icon: Tag },
  { key: "profit-calculator", label: "Profit Calculator", icon: Calculator },
  { key: "trend-analysis", label: "Trend Analysis", icon: TrendingUp },
  { key: "saved-projects", label: "Saved Projects", icon: FolderKanban },
  { key: "competitor-monitor", label: "Competitor Monitor", icon: Users },
  { key: "automation", label: "Automation Center", icon: Clock },
  { key: "export-center", label: "Export Center", icon: Database },
  { key: "stores", label: "Stores", icon: StoreIcon },
  { key: "memory", label: "AI Memory", icon: Brain },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

function SidebarContent() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const logout = useAuthActions();
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  const initials = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2 px-4 h-16 border-b">
        <span className="flex size-8 items-center justify-center rounded-lg brand-gradient text-white">
          <Sparkles className="size-4" />
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold">AI Commerce</span>
          <span className="text-xs text-muted-foreground">Operating System</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto scroll-thin" aria-label="Main">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = view === item.key;
            return (
              <li key={item.key}>
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2.5 font-medium",
                    active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                  )}
                  onClick={() => {
                    setView(item.key);
                    setSidebarOpen(false);
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>

        {isAdmin && (
          <>
            <Separator className="my-3" />
            <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Admin
            </p>
            <ul className="space-y-0.5">
              <li>
                <Button
                  variant={view === "admin" ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2.5 font-medium",
                    view === "admin" && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                  )}
                  onClick={() => {
                    setView("admin");
                    setSidebarOpen(false);
                  }}
                >
                  <ShieldHalf className="size-4" />
                  Admin Panel
                </Button>
              </li>
            </ul>
          </>
        )}
      </nav>

      <div className="px-2 pb-3 border-t pt-3">
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar className="size-8">
            {user?.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => logout.logout()}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-[260px] shrink-0 border-r bg-sidebar text-sidebar-foreground">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet
        open={sidebarOpen}
        onOpenChange={(o) => setSidebarOpen(o)}
      >
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
