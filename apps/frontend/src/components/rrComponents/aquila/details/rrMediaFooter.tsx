"use client";

import React from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface ExternalProvider {
  name: string;
  url: string;
}

export interface RrMediaFooterProps {
  providers?: ExternalProvider[];
  updatedAt?: string | Date | number | null;
  className?: string;
}

export function RrMediaFooter({
  providers = [],
  updatedAt,
}: RrMediaFooterProps): React.JSX.Element {
  const { t } = useTranslation();

  const formattedDate = React.useMemo(() => {
    if (!updatedAt) return null;
    try {
      const date = new Date(updatedAt);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }, [updatedAt]);

  return (
    <footer className="w-full mt-12 pt-6 border-t border-border/40">
      <div className="bg-card/45 border border-border/40 backdrop-blur-xl rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground shadow-md">
        {/* Left: Data Providers */}
        {providers.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
            <span>{t("aquila.dataProvidedBy")}</span>
            {providers.map((provider, index) => (
              <React.Fragment key={provider.name}>
                <Link
                  href={provider.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-foreground hover:text-primary transition-colors underline underline-offset-2"
                >
                  {provider.name}
                </Link>
                {index < providers.length - 1 && <span>,</span>}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div />
        )}

        {/* Right: Last updated */}
        {formattedDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 shrink-0">
            <RefreshCw className="size-3 shrink-0" />
            <span>
              {t("aquila.lastUpdated")}: {formattedDate}
            </span>
          </div>
        )}
      </div>
    </footer>
  );
}
