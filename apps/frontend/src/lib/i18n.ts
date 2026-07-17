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
  const isServer = typeof window === "undefined";

  if (!isServer) {
    i18n.use(HttpBackend);
  }

  i18n.use(initReactI18next).init({
    lng: getInitialLanguage(),
    fallbackLng: {
      "zh-CN": ["zh-CN", "en"],
      "zh-TW": ["zh-TW", "en"],
      zh: ["zh-CN", "en"],
      default: ["en"],
    },
    load: "currentOnly",
    // Only fetch the active locale on client — other languages are loaded on demand.
    // On the server, load all resources locally to enable synchronous SSR translation.
    ns: ["translation"],
    defaultNS: "translation",
    ...(isServer
      ? {
          resources: {
            en: { translation: require("../locales/en.json") },
            ja: { translation: require("../locales/ja.json") },
            ko: { translation: require("../locales/ko.json") },
            "zh-CN": { translation: require("../locales/zh-CN.json") },
            "zh-TW": { translation: require("../locales/zh-TW.json") },
            pl: { translation: require("../locales/pl.json") },
            ru: { translation: require("../locales/ru.json") },
            no: { translation: require("../locales/no.json") },
            fi: { translation: require("../locales/fi.json") },
            es: { translation: require("../locales/es.json") },
            de: { translation: require("../locales/de.json") },
            cs: { translation: require("../locales/cs.json") },
            tr: { translation: require("../locales/tr.json") },
            vi: { translation: require("../locales/vi.json") },
            th: { translation: require("../locales/th.json") },
            ms: { translation: require("../locales/ms.json") },
          },
        }
      : {
          backend: {
            loadPath: "/locales/{{lng}}/translation.json",
          },
        }),
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
