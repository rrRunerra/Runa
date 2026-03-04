import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@runa/ui";

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
  backLabel = "Back",
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {backLabel}
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
