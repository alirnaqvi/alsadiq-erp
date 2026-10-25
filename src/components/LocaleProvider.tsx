"use client";

import { createContext, useContext, type ReactNode } from "react";
import { t, type Locale, type MessageKey } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("ur");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return (key: MessageKey, vars?: Record<string, string | number>) => t(locale, key, vars);
}
