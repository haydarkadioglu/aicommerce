"use client";

import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { CommandPalette } from "@/components/app/command-palette";
import { useAppStore } from "@/stores/app-store";
import { Dashboard } from "@/components/user/dashboard";
import { AiAssistant } from "@/components/user/ai-assistant";
import { ProductResearch } from "@/components/user/product-research";
import { ListingGenerator } from "@/components/user/listing-generator";
import { ImageStudio } from "@/components/user/image-studio";
import { SeoStudio } from "@/components/user/seo-studio";
import { ProfitCalculator } from "@/components/user/profit-calculator";
import { TrendAnalysis } from "@/components/user/trend-analysis";
import { SavedProjects } from "@/components/user/saved-projects";
import { MemoryBrowser } from "@/components/user/memory-browser";
import { UserSettings } from "@/components/user/settings";
import { ProductIntelligence } from "@/components/intelligence/product-intelligence";
import { ProductHunter } from "@/components/intelligence/product-hunter";
import { Pipeline } from "@/components/intelligence/pipeline";
import { AdvisorModule } from "@/components/intelligence/advisor";
import { OpportunityScanner } from "@/components/intelligence/opportunity-scanner";
import { AutomationCenter } from "@/components/intelligence/automation-center";
import { CompetitorMonitor } from "@/components/intelligence/competitor-monitor";
import { ExportCenter } from "@/components/intelligence/export-center";
import { StoreManagement } from "@/components/stores/store-management";
import { AdminPanel } from "@/components/admin/admin-panel";
import { Skeleton } from "@/components/ui/skeleton";

function ViewFallback() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function renderView(view: string) {
  switch (view) {
    case "dashboard":
      return <Dashboard />;
    case "ai-assistant":
      return <AiAssistant />;
    case "product-research":
      return <ProductResearch />;
    case "listing-generator":
      return <ListingGenerator />;
    case "image-studio":
      return <ImageStudio />;
    case "seo-studio":
      return <SeoStudio />;
    case "profit-calculator":
      return <ProfitCalculator />;
    case "trend-analysis":
      return <TrendAnalysis />;
    case "saved-projects":
      return <SavedProjects />;
    case "memory":
      return <MemoryBrowser />;
    case "intelligence":
      return <ProductIntelligence />;
    case "hunter":
      return <ProductHunter />;
    case "pipeline":
      return <Pipeline />;
    case "advisor":
      return <AdvisorModule />;
    case "opportunities":
      return <OpportunityScanner />;
    case "automation":
      return <AutomationCenter />;
    case "competitor-monitor":
      return <CompetitorMonitor />;
    case "export-center":
      return <ExportCenter />;
    case "stores":
      return <StoreManagement />;
    case "settings":
      return <UserSettings />;
    case "admin":
      return <AdminPanel />;
    default:
      return <Dashboard />;
  }
}

function ActiveView() {
  const view = useAppStore((s) => s.view);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {renderView(view)}
      </motion.div>
    </AnimatePresence>
  );
}

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar />
          <main className="flex-1 overflow-y-auto scroll-thin">
            <Suspense fallback={<ViewFallback />}>
              <ActiveView />
            </Suspense>
          </main>
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}
