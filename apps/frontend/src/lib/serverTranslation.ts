import { cookies } from "next/headers";
import en from "../locales/en.json";
import ja from "../locales/ja.json";
import ko from "../locales/ko.json";
import zhCN from "../locales/zh-CN.json";
import zhTW from "../locales/zh-TW.json";
import pl from "../locales/pl.json";
import ru from "../locales/ru.json";
import no from "../locales/no.json";
import fi from "../locales/fi.json";
import es from "../locales/es.json";
import de from "../locales/de.json";
import cs from "../locales/cs.json";
import tr from "../locales/tr.json";
import vi from "../locales/vi.json";
import th from "../locales/th.json";
import ms from "../locales/ms.json";

const dictionaries: Record<string, Record<string, string>> = {
  en,
  ja,
  ko,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  pl,
  ru,
  no,
  fi,
  es,
  de,
  cs,
  tr,
  vi,
  th,
  ms,
};

export async function getServerTranslation(): Promise<{
  t: (key: string, variables?: Record<string, string>) => string;
  lang: string;
}> {
  const cookieStore = await cookies();
  const lang = cookieStore.get("runa-language")?.value || "en";
  const dictionary = dictionaries[lang] || en;

  return {
    t: (key: string, variables?: Record<string, string>) => {
      let text = dictionary[key] || (en as Record<string, string>)[key] || key;
      if (variables) {
        Object.entries(variables).forEach(([k, v]) => {
          text = text.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), v);
        });
      }
      return text;
    },
    lang,
  };
}
