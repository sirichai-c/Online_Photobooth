"use client";

import { useLanguage } from "@/components/LanguageProvider";

export function LanguageSwitcher({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`language-switcher language-switcher-${tone}`} role="group" aria-label="ภาษา / Language">
      <button type="button" aria-label="ภาษาไทย" aria-pressed={language === "th"} onClick={() => setLanguage("th")}>
        TH
      </button>
      <button type="button" aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>
        EN
      </button>
    </div>
  );
}
