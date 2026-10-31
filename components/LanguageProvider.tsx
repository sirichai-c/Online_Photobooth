"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isLanguage, LANGUAGE_STORAGE_KEY } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("th");

  useEffect(() => {
    let initialLanguage: Language = "th";

    try {
      const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      initialLanguage = isLanguage(savedLanguage) ? savedLanguage : "th";
    } catch {
      initialLanguage = "th";
    }

    setLanguageState(initialLanguage);
    document.documentElement.lang = initialLanguage;
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    document.documentElement.lang = nextLanguage;

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // The language remains usable for this visit when storage is unavailable.
    }
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
