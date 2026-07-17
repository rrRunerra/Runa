"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  children,
  className,
}: PageHeaderProps) {
  const { t } = useTranslation();
  const displayBackLabel = backLabel || t("lynx.back");

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {displayBackLabel}
        </Link>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
