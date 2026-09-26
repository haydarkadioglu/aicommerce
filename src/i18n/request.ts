import { getRequestConfig } from "next-intl/server";

export const locales = ["en", "tr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async () => {
  // We use a cookie/localStorage-based approach instead of URL-based routing
  // since the platform is a single-page app. Language is stored in the
  // app-store (Zustand) and passed via a cookie to the server.
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
