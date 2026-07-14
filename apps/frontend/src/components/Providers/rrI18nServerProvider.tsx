import { cookies } from "next/headers";
import { RrI18nProvider } from "./rrI18nProvider";

/** Server Component wrapper — reads the runa-language cookie and passes it to
 *  the client-side RrI18nProvider so SSR and hydration use the same locale. */
export async function RrI18nServerProvider({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const cookieStore = await cookies();
  const lang = cookieStore.get("runa-language")?.value ?? "en";

  return <RrI18nProvider initialLang={lang}>{children}</RrI18nProvider>;
}
