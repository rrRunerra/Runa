import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

const getInitialLanguage = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("runa-language") ?? "en";
  }
  return "en";
};

if (!i18n.isInitialized) {
  i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
      lng: getInitialLanguage(),
      fallbackLng: "en",
      // Only fetch the active locale — other languages are loaded on demand
      // when changeLanguage() is called.
      ns: ["translation"],
      defaultNS: "translation",
      backend: {
        loadPath: "/locales/{{lng}}/translation.json",
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
