"use client";

import * as React from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

interface RrI18nProviderProps {
  children: React.ReactNode;
  /** Language code resolved server-side from the cookie. Ensures SSR and
   *  client hydration both use the same locale, avoiding hydration mismatches. */
  initialLang?: string;
}

export function RrI18nProvider({
  children,
  initialLang,
}: RrI18nProviderProps): React.JSX.Element {
  // Synchronously switch to the server-detected language before the first
  // render. With HttpBackend the resources may not be loaded yet on the very
  // first call, but changeLanguage() queues the switch and fires once the
  // fetch completes — components using useTranslation will re-render
  // automatically. This removes the SSR/client text mismatch because both
  // sides now start from the same initialLang value.
  if (initialLang && i18n.language !== initialLang) {
    void i18n.changeLanguage(initialLang);
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
