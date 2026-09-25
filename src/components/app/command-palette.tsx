"use client";

import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAppStore, type AppView, type AdminSection } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  LayoutDashboard,
  Bot,
  Search,
  FileText,
  Image as ImageIcon,
  Calculator,
  TrendingUp,
  FolderKanban,
  Settings,
  Shield,
  Users,
  KeyRound,
  Boxes,
  ScrollText,
  Flag,
  Sliders,
  CreditCard,
  Briefcase,
  Activity,
  Bell,
  Tag,
  Brain,
  Radar,
  Lightbulb,
  Clock,
  Database,
  Store as StoreIcon,
  Crosshair,
  Zap,
  type LucideIcon,
} from "lucide-react";

type CommandEntry = {
  label: string;
  hint: string;
  icon: LucideIcon;
  group: "Navigate" | "Admin";
  action: () => void;
  keywords?: string[];
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const setView = useAppStore((s) => s.setView);
  const setAdminSection = useAppStore((s) => s.setAdminSection);
  const isAdmin = useAuthStore((s) => !!s.user?.roles?.includes("admin"));

  // Global hotkey: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navigate = (v: AppView) => {
    setView(v);
    setOpen(false);
  };
  const navigateAdmin = (s: AdminSection) => {
    setView("admin");
    setAdminSection(s);
    setOpen(false);
  };

  const navCommands: CommandEntry[] = [
    { label: "Dashboard", hint: "Overview & stats", icon: LayoutDashboard, group: "Navigate", action: () => navigate("dashboard"), keywords: ["home", "overview"] },
    { label: "Product Hunter", hint: "AI natural language search", icon: Crosshair, group: "Navigate", action: () => navigate("hunter"), keywords: ["hunter", "search", "find", "discover", "natural language", "keyword"] },
    { label: "One-Click Pipeline", hint: "Autonomous workflow", icon: Zap, group: "Navigate", action: () => navigate("pipeline"), keywords: ["pipeline", "workflow", "automated", "one-click", "research", "listing", "seo"] },
    { label: "Product Intelligence", hint: "Discover + analyze + decide", icon: Radar, group: "Navigate", action: () => navigate("intelligence"), keywords: ["discover", "analysis", "supplier", "competitor", "trend", "profit", "decision"] },
    { label: "Business Advisor", hint: "AI business recommendations", icon: Lightbulb, group: "Navigate", action: () => navigate("advisor"), keywords: ["advisor", "business", "recommendation", "should i", "consultant"] },
    { label: "Opportunity Scanner", hint: "Auto-detect opportunities", icon: TrendingUp, group: "Navigate", action: () => navigate("opportunities"), keywords: ["opportunities", "scanner", "trending", "low-competition", "high-roi", "seasonal"] },
    { label: "AI Assistant", hint: "Chat with AI agents", icon: Bot, group: "Navigate", action: () => navigate("ai-assistant"), keywords: ["chat", "ai", "gpt"] },
    { label: "Product Research", hint: "Find new opportunities", icon: Search, group: "Navigate", action: () => navigate("product-research"), keywords: ["research", "ideas"] },
    { label: "Listing Generator", hint: "Generate listings", icon: FileText, group: "Navigate", action: () => navigate("listing-generator"), keywords: ["listing", "etsy", "seo"] },
    { label: "Image Studio", hint: "Generate product images", icon: ImageIcon, group: "Navigate", action: () => navigate("image-studio"), keywords: ["image", "photo", "picture", "design"] },
    { label: "SEO Studio", hint: "Titles, tags, keywords", icon: Tag, group: "Navigate", action: () => navigate("seo-studio"), keywords: ["seo", "tags", "keywords", "search", "optimization"] },
    { label: "Profit Calculator", hint: "Model margins", icon: Calculator, group: "Navigate", action: () => navigate("profit-calculator"), keywords: ["profit", "margin"] },
    { label: "Trend Analysis", hint: "Market trends", icon: TrendingUp, group: "Navigate", action: () => navigate("trend-analysis"), keywords: ["trend", "market"] },
    { label: "Saved Projects", hint: "Manage projects", icon: FolderKanban, group: "Navigate", action: () => navigate("saved-projects"), keywords: ["projects", "folders"] },
    { label: "Competitor Monitor", hint: "Track competitor shops", icon: Users, group: "Navigate", action: () => navigate("competitor-monitor"), keywords: ["competitor", "monitor", "shops", "tracking"] },
    { label: "Automation Center", hint: "Scheduled workflows", icon: Clock, group: "Navigate", action: () => navigate("automation"), keywords: ["automation", "schedule", "workflow", "cron"] },
    { label: "Export Center", hint: "Export reports", icon: Database, group: "Navigate", action: () => navigate("export-center"), keywords: ["export", "report", "csv", "json", "download"] },
    { label: "Stores", hint: "Manage multi-store", icon: StoreIcon, group: "Navigate", action: () => navigate("stores"), keywords: ["stores", "marketplace", "shop", "multi-store", "switch"] },
    { label: "AI Memory", hint: "What the AI remembers", icon: Brain, group: "Navigate", action: () => navigate("memory"), keywords: ["memory", "brain", "facts", "preferences"] },
    { label: "Settings", hint: "Profile & preferences", icon: Settings, group: "Navigate", action: () => navigate("settings"), keywords: ["preferences", "profile"] },
  ];

  const adminCommands: CommandEntry[] = isAdmin
    ? [
        { label: "Admin · Users", hint: "Manage users", icon: Users, group: "Admin", action: () => navigateAdmin("users"), keywords: ["admin", "users"] },
        { label: "Admin · Roles & Permissions", hint: "RBAC", icon: KeyRound, group: "Admin", action: () => navigateAdmin("roles"), keywords: ["admin", "rbac"] },
        { label: "Admin · AI Providers", hint: "Provider settings", icon: Boxes, group: "Admin", action: () => navigateAdmin("providers"), keywords: ["admin", "providers", "openai"] },
        { label: "Admin · Prompts", hint: "Prompt versions", icon: FileText, group: "Admin", action: () => navigateAdmin("prompts"), keywords: ["admin", "prompts"] },
        { label: "Admin · Agents", hint: "Agent registry", icon: Bot, group: "Admin", action: () => navigateAdmin("agents"), keywords: ["admin", "agents"] },
        { label: "Admin · Logs", hint: "Audit & system logs", icon: ScrollText, group: "Admin", action: () => navigateAdmin("logs"), keywords: ["admin", "logs"] },
        { label: "Admin · Usage", hint: "AI usage analytics", icon: Activity, group: "Admin", action: () => navigateAdmin("usage"), keywords: ["admin", "usage", "analytics"] },
        { label: "Admin · Feature Flags", hint: "Toggle features", icon: Flag, group: "Admin", action: () => navigateAdmin("flags"), keywords: ["admin", "flags"] },
        { label: "Admin · Settings", hint: "Platform settings", icon: Sliders, group: "Admin", action: () => navigateAdmin("settings"), keywords: ["admin", "settings"] },
        { label: "Admin · Plans", hint: "Subscription plans", icon: CreditCard, group: "Admin", action: () => navigateAdmin("plans"), keywords: ["admin", "plans"] },
        { label: "Admin · Jobs", hint: "Background jobs", icon: Briefcase, group: "Admin", action: () => navigateAdmin("jobs"), keywords: ["admin", "jobs"] },
        { label: "Admin · System Status", hint: "Health & metrics", icon: Activity, group: "Admin", action: () => navigateAdmin("system"), keywords: ["admin", "system"] },
        { label: "Admin · Notifications", hint: "Broadcast", icon: Bell, group: "Admin", action: () => navigateAdmin("notifications"), keywords: ["admin", "notifications"] },
      ]
    : [];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search modules, admin pages, or actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {navCommands.map((c) => (
            <CommandItem
              key={c.label}
              value={`${c.label} ${c.hint} ${(c.keywords || []).join(" ")}`}
              onSelect={() => c.action()}
              className="group"
            >
              <c.icon className="mr-2 size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="font-medium">{c.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {c.hint}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        {adminCommands.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin">
              {adminCommands.map((c) => (
                <CommandItem
                  key={c.label}
                  value={`${c.label} ${c.hint} ${(c.keywords || []).join(" ")}`}
                  onSelect={() => c.action()}
                  className="group"
                >
                  <c.icon className="mr-2 size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium">{c.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {c.hint}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
