"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/stores/app-store";
import { useI18n } from "@/i18n";
import {
  Sparkles,
  Moon,
  Sun,
  Menu,
  Brain,
  Search,
  FileText,
  TrendingUp,
  Calculator,
  Image,
  Truck,
  Target,
  ArrowRight,
  Bot,
  Zap,
  ShieldCheck,
  LineChart,
  Globe,
  ChevronRight,
  Layers,
  Cpu,
  Crosshair,
  Store,
  Clock,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Agents", href: "#agents" },
  { label: "Pricing", href: "#pricing" },
];

const FEATURES = [
  { icon: Crosshair, title: "Product Hunter", desc: "Search by natural language — 'I want premium dog decor' — and find products across 7 marketplaces." },
  { icon: Zap, title: "One-Click Pipeline", desc: "Autonomous workflow: research → supplier → profit → decision → SEO → listing → save." },
  { icon: Search, title: "Market Research", desc: "Comprehensive intelligence: sales, demand, competition, saturation, reviews, keywords, and more." },
  { icon: FileText, title: "AI Listing Studio", desc: "Generate marketplace-ready titles, tags, descriptions, and meta data." },
  { icon: Target, title: "SEO Engine", desc: "SEO scores, keyword density, missing keywords, and optimization suggestions." },
  { icon: Calculator, title: "Profit Engine", desc: "Compute true margins with fees, shipping, taxes, and AI profit forecasts." },
  { icon: TrendingUp, title: "Trend Intelligence", desc: "Spot rising niches, seasonality, and demand shifts in real time." },
  { icon: Image, title: "Media Studio", desc: "Generate, edit, and analyze product images with AI-powered visual tools." },
  { icon: Truck, title: "Supplier Intelligence", desc: "Compare suppliers: MOQ, lead time, certifications, Trade Assurance, and reliability." },
  { icon: Brain, title: "Business Advisor", desc: "AI business consultant: should I sell this? Should I raise price? What's next?" },
  { icon: Store, title: "Multi-Store", desc: "Manage unlimited stores across Etsy, Shopify, Amazon, and more — fully isolated." },
  { icon: Clock, title: "Automation Center", desc: "Schedule daily trend scans, weekly supplier scans, and profit reports automatically." },
];

const AGENTS = [
  { name: "Research Agent", icon: Search, desc: "Finds product opportunities, validates demand, scores competition." },
  { name: "SEO Agent", icon: Target, desc: "Generates titles, tags, and long-tail keywords for listings." },
  { name: "Trend Agent", icon: TrendingUp, desc: "Tracks momentum and seasonality across marketplaces." },
  { name: "Listing Agent", icon: FileText, desc: "Writes high-converting listing copy with marketplace formatting." },
  { name: "Supplier Agent", icon: Truck, desc: "Suggests suppliers, MOQs, lead times, and reliability scores." },
  { name: "Profit Agent", icon: Calculator, desc: "Models margins, fees, and break-even across marketplaces." },
  { name: "Pricing Agent", icon: Zap, desc: "Recommends anchor and psychological pricing strategies." },
  { name: "Strategy Agent", icon: Brain, desc: "Builds long-term strategy with milestones and KPIs." },
];

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "For trying the platform.",
    features: ["100 AI calls / month", "3 projects", "1 marketplace", "Community support"],
    cta: "Start free",
    highlight: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For serious sellers.",
    features: ["5,000 AI calls / month", "50 projects", "3 marketplaces", "All AI agents", "Priority support"],
    cta: "Choose Pro",
    highlight: true,
  },
  {
    key: "business",
    name: "Business",
    price: "$99",
    period: "/mo",
    description: "For growing teams.",
    features: ["50,000 AI calls / month", "500 projects", "10 marketplaces", "Custom agents", "API access"],
    cta: "Choose Business",
    highlight: false,
  },
];

// Feature comparison matrix data (true = checkmark, false = dash, string = text)
const COMPARISON: { feature: string; values: [string | boolean, string | boolean, string | boolean] }[] = [
  { feature: "AI calls / month", values: ["100", "5,000", "50,000"] },
  { feature: "Projects", values: ["3", "50", "500"] },
  { feature: "Marketplaces", values: ["1", "3", "10"] },
  { feature: "All 12 AI agents", values: [true, true, true] },
  { feature: "Image Studio (AI image gen)", values: [true, true, true] },
  { feature: "SEO Studio", values: [true, true, true] },
  { feature: "Trend Analysis", values: [true, true, true] },
  { feature: "Profit Calculator", values: [true, true, true] },
  { feature: "AI Memory browser", values: [true, true, true] },
  { feature: "Project export (CSV/JSON)", values: [true, true, true] },
  { feature: "Command palette (⌘K)", values: [true, true, true] },
  { feature: "Custom agents", values: [false, false, true] },
  { feature: "API access", values: [false, false, true] },
  { feature: "Priority support", values: [false, true, true] },
  { feature: "Team collaboration", values: [false, false, true] },
];

const TRUST_ICONS = [
  { icon: Globe, label: "Etsy" },
  { icon: Layers, label: "Shopify" },
  { icon: Cpu, label: "Amazon" },
  { icon: Bot, label: "AI-native" },
  { icon: ShieldCheck, label: "SOC2-ready" },
  { icon: LineChart, label: "Real-time" },
];

export function LandingPage() {
  const { theme, setTheme } = useTheme();
  const setAuthModal = useAppStore((s) => s.setAuthModal);
  const { t } = useI18n();
  const [mobileNav, setMobileNav] = useState(false);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 glass border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <a href="#" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg brand-gradient text-white">
              <Sparkles className="size-4" />
            </span>
            <span className="text-base">AI Commerce OS</span>
          </a>
          <nav className="ml-6 hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              <Sun className="size-4 hidden dark:block" />
              <Moon className="size-4 dark:hidden" />
            </Button>
            <Button
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={() => setAuthModal("login")}
            >
              Sign in
            </Button>
            <Button
              className="brand-gradient text-white hover:opacity-90"
              onClick={() => setAuthModal("register")}
            >
              Get started
              <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open nav"
              onClick={() => setMobileNav((v) => !v)}
            >
              <Menu className="size-4" />
            </Button>
          </div>
        </div>
        {mobileNav && (
          <div className="md:hidden border-t px-4 py-3">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileNav(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 mesh-bg pointer-events-none" />
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <Badge variant="outline" className="mb-5 gap-1.5">
            <Sparkles className="size-3" />
            Now in private beta
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            The AI Operating System for{" "}
            <span className="brand-text">E-commerce</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl">
            Discover profitable products, generate listings, optimize SEO, calculate margins, and build a
            data-driven commerce strategy — powered by a swarm of specialized AI agents.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="brand-gradient text-white hover:opacity-90 w-full sm:w-auto"
              onClick={() => setAuthModal("register")}
            >
              {t("landing.startFree")}
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setAuthModal("login")}
            >
              <Bot className="size-4" />
              {t("landing.liveDemo")}
            </Button>
          </div>

          {/* Agent grid background */}
          <div className="relative mt-16 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3 max-w-5xl mx-auto">
            {AGENTS.map((a, i) => (
              <div
                key={a.name}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card/60 p-3 backdrop-blur-sm hover:scale-[1.02] transition-transform"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <a.icon className="size-4" />
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">{a.name.replace(" Agent", "")}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground mb-6">
            Built for modern e-commerce
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
            {TRUST_ICONS.map((t) => (
              <div
                key={t.label}
                className="flex items-center gap-2 text-muted-foreground/80"
              >
                <t.icon className="size-5" />
                <span className="text-sm font-medium">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to <span className="brand-text">sell smarter</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Eight specialized tools. One unified workspace. All powered by AI agents.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="group relative overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader>
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </span>
                <CardTitle className="text-base mt-2">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{f.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="relative bg-muted/30 border-y">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="outline" className="mb-3">
              <Bot className="size-3" />
              Meet your swarm
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A team of <span className="brand-text">AI Agents</span> on your side
            </h2>
            <p className="mt-3 text-muted-foreground">
              Each agent is specialized for a commerce task — from research to strategy.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AGENTS.map((a) => (
              <Card key={a.name} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg brand-gradient text-white">
                      <a.icon className="size-4" />
                    </span>
                    <CardTitle className="text-base">{a.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{a.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, <span className="brand-text">scalable</span> pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start free. Upgrade when your store grows.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((p) => (
            <Card
              key={p.key}
              className={
                p.highlight
                  ? "relative border-primary shadow-lg ring-1 ring-primary/30"
                  : "relative"
              }
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="brand-gradient text-white">Most popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <CardDescription>{p.description}</CardDescription>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.features.map((feat) => (
                  <div key={feat} className="flex items-start gap-2 text-sm">
                    <ShieldCheck className="size-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{feat}</span>
                  </div>
                ))}
                <Button
                  className="w-full mt-4"
                  variant={p.highlight ? "default" : "outline"}
                  onClick={() => setAuthModal("register")}
                >
                  {p.cta}
                  <ChevronRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature comparison matrix */}
        <div className="mt-16 max-w-5xl mx-auto">
          <h3 className="text-center text-xl font-semibold mb-6">
            Compare <span className="brand-text">plans</span>
          </h3>
          <div className="overflow-x-auto scroll-thin rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Feature
                  </th>
                  <th className="text-center p-3 font-medium">Free</th>
                  <th className="text-center p-3 font-medium brand-text">Pro</th>
                  <th className="text-center p-3 font-medium">Business</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={
                      i % 2 === 0 ? "bg-transparent" : "bg-muted/20"
                    }
                  >
                    <td className="p-3 font-medium">{row.feature}</td>
                    {row.values.map((val, j) => (
                      <td key={j} className="text-center p-3">
                        {val === true ? (
                          <ShieldCheck className="size-4 text-emerald-500 mx-auto" />
                        ) : val === false ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : (
                          <span className="text-sm">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t">
        <div className="absolute inset-0 mesh-bg pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Launch your AI-powered store <span className="brand-text">today</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sign up free, no credit card required. Be live in under a minute.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              size="lg"
              className="brand-gradient text-white hover:opacity-90"
              onClick={() => setAuthModal("register")}
            >
              Get started free
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setAuthModal("login")}
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* Footer (sticky at bottom on short content) */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <a href="#" className="flex items-center gap-2 font-semibold">
                <span className="flex size-8 items-center justify-center rounded-lg brand-gradient text-white">
                  <Sparkles className="size-4" />
                </span>
                AI Commerce OS
              </a>
              <p className="mt-3 text-sm text-muted-foreground max-w-md">
                The AI Operating System for e-commerce. Build a smarter store with a swarm of specialized agents.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#agents" className="hover:text-foreground">Agents</a></li>
                <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Docs</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} AI Commerce OS. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by GLM-4.6 · Built with Next.js
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
