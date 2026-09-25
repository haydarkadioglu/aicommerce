"use client";

import { useAppStore, type AdminSection } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Users,
  ShieldHalf,
  Cpu,
  FileText,
  Bot,
  ScrollText,
  BarChart3,
  Flag,
  Settings,
  CreditCard,
  ListChecks,
  ServerCog,
  Bell,
} from "lucide-react";
import { AdminUsers } from "@/components/admin/users";
import { AdminRoles } from "@/components/admin/roles";
import { AdminProviders } from "@/components/admin/providers";
import { AdminPrompts } from "@/components/admin/prompts";
import { AdminAgents } from "@/components/admin/agents";
import { AdminLogs } from "@/components/admin/logs";
import { AdminUsage } from "@/components/admin/usage";
import { AdminFlags } from "@/components/admin/flags";
import { AdminSettings } from "@/components/admin/settings";
import { AdminPlans } from "@/components/admin/plans";
import { AdminJobs } from "@/components/admin/jobs";
import { AdminSystem } from "@/components/admin/system";
import { AdminNotifications } from "@/components/admin/notifications";

type SectionItem = {
  key: AdminSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SECTIONS: SectionItem[] = [
  { key: "users", label: "Users", icon: Users },
  { key: "roles", label: "Roles & Permissions", icon: ShieldHalf },
  { key: "providers", label: "AI Providers", icon: Cpu },
  { key: "prompts", label: "Prompts", icon: FileText },
  { key: "agents", label: "Agents", icon: Bot },
  { key: "logs", label: "Logs", icon: ScrollText },
  { key: "usage", label: "Usage", icon: BarChart3 },
  { key: "flags", label: "Feature Flags", icon: Flag },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "plans", label: "Plans", icon: CreditCard },
  { key: "jobs", label: "Jobs", icon: ListChecks },
  { key: "system", label: "System Status", icon: ServerCog },
  { key: "notifications", label: "Notifications", icon: Bell },
];

function ActiveSection({ section }: { section: AdminSection }) {
  switch (section) {
    case "users":
      return <AdminUsers />;
    case "roles":
      return <AdminRoles />;
    case "providers":
      return <AdminProviders />;
    case "prompts":
      return <AdminPrompts />;
    case "agents":
      return <AdminAgents />;
    case "logs":
      return <AdminLogs />;
    case "usage":
      return <AdminUsage />;
    case "flags":
      return <AdminFlags />;
    case "settings":
      return <AdminSettings />;
    case "plans":
      return <AdminPlans />;
    case "jobs":
      return <AdminJobs />;
    case "system":
      return <AdminSystem />;
    case "notifications":
      return <AdminNotifications />;
    default:
      return <AdminUsers />;
  }
}

export function AdminPanel() {
  const section = useAppStore((s) => s.adminSection);
  const setSection = useAppStore((s) => s.setAdminSection);

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="border-b p-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldHalf className="size-4" />
            </span>
            <span className="text-sm font-semibold">Admin Panel</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scroll-thin p-2">
          <ul className="space-y-0.5">
            {SECTIONS.map((s) => {
              const active = section === s.key;
              return (
                <li key={s.key}>
                  <Button
                    variant={active ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2.5 text-sm",
                      active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                    )}
                    onClick={() => setSection(s.key)}
                  >
                    <s.icon className="size-4" />
                    {s.label}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Mobile selector */}
      <div className="md:hidden absolute left-0 right-0 z-10 p-2 bg-background border-b">
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={section}
          onChange={(e) => setSection(e.target.value as AdminSection)}
          aria-label="Select admin section"
        >
          {SECTIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <main className="flex-1 overflow-y-auto scroll-thin pt-12 md:pt-0">
        <ActiveSection section={section} />
      </main>
    </div>
  );
}
