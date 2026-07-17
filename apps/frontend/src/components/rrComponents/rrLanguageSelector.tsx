"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

export interface RrLanguageSelectorProps {
  variant?: "floating" | "submenu";
  className?: string;
}

const flagMap: Record<string, string> = {
  en: "us",
  ja: "jp",
  ko: "kr",
  "zh-CN": "cn",
  "zh-TW": "tw",
  pl: "pl",
  ru: "ru",
  no: "no",
  fi: "fi",
  es: "es",
  de: "de",
  cs: "cz",
  tr: "tr",
  vi: "vn",
  th: "th",
  ms: "my",
};

const languages = [
  { code: "en", label: "English (US)" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "pl", label: "Polski" },
  { code: "ru", label: "Русский" },
  { code: "no", label: "Norsk" },
  { code: "fi", label: "Suomi" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "cs", label: "Čeština" },
  { code: "tr", label: "Türkçe" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" },
  { code: "ms", label: "Bahasa Melayu" },
];

export function RrLanguageSelector({
  variant = "floating",
  className,
}: RrLanguageSelectorProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language || "en";
  const normalizedLang = currentLang === "zh" ? "zh-CN" : currentLang;
  const activeLang =
    languages.find((lang) => lang.code === normalizedLang) ||
    languages.find((lang) => lang.code === normalizedLang.split("-")[0]) ||
    languages[0];

  const handleLanguageChange = (value: string): void => {
    void i18n.changeLanguage(value);
    localStorage.setItem("runa-language", value);
    document.cookie = `runa-language=${value};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
  };

  const menuItems = (
    <DropdownMenuRadioGroup value={activeLang.code} onValueChange={handleLanguageChange}>
      {languages.map((lang) => (
        <DropdownMenuRadioItem key={lang.code} value={lang.code}>
          <span className="flex items-center gap-2">
            <Image
              src={`/flags/${flagMap[lang.code] || lang.code}.svg`}
              alt={lang.label}
              width={16}
              height={12}
              className="rounded-xs object-cover border border-border/40"
            />
            <span>{lang.label}</span>
          </span>
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );

  if (variant === "submenu") {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className={className}>
          <Languages className="h-4 w-4 shrink-0" />
          <span>{t("language")}</span>
          {activeLang && (
            <div className="ml-auto mr-1 flex items-center gap-2 shrink-0 text-muted-foreground text-xs font-normal">
              <Image
                src={`/flags/${flagMap[activeLang.code] || activeLang.code}.svg`}
                alt=""
                width={14}
                height={10}
                className="rounded-xs object-cover border border-border/40"
              />
              <span>{activeLang.label}</span>
            </div>
          )}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="max-h-60 overflow-y-auto no-scrollbar">
          {menuItems}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  // Floating variant (glassmorphic style for login/register pages)
  return (
    <div className={cn("fixed top-4 right-4 z-50", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 gap-2 bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800/80 hover:border-zinc-700/80 text-zinc-300 hover:text-white backdrop-blur-md shadow-lg transition-all duration-200 rounded-xl"
          >
            <Languages className="h-4 w-4 opacity-75" />
            <Image
              src={`/flags/${flagMap[activeLang.code] || activeLang.code}.svg`}
              alt=""
              width={16}
              height={12}
              className="rounded-xs object-cover border border-zinc-700"
            />
            <span className="text-xs font-medium hidden sm:inline">{activeLang.label}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto no-scrollbar bg-zinc-950/95 border-zinc-800 text-zinc-300">
          {menuItems}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
