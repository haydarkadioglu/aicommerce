"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import en from "@/locales/en.json";
import tr from "@/locales/tr.json";

export type Locale = "en" | "tr";

const messages: Record<Locale, typeof en> = {
  en,
  tr: tr as typeof en,
};

type I18nState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

/**
 * Lightweight i18n store — no URL-based routing needed.
 * Language preference is persisted in localStorage.
 * Use `t("nav.dashboard")` to translate strings.
 */
export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
      t: (key, params) => {
        const { locale } = get();
        const msg = messages[locale] || messages.en;

        // Navigate nested keys: "nav.dashboard" → msg.nav.dashboard
        const parts = key.split(".");
        let value: any = msg;
        for (const part of parts) {
          value = value?.[part];
          if (value === undefined) break;
        }

        let result = typeof value === "string" ? value : key;

        // Replace params: {count} → params.count
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            result = result.replace(`{${k}}`, String(v));
          }
        }

        return result;
      },
    }),
    {
      name: "ai-commerce-i18n",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ locale: s.locale }),
    }
  )
);

/**
 * Get available locales for the language switcher.
 */
export const availableLocales: Array<{
  code: Locale;
  name: string;
  flag: string;
}> = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
];
