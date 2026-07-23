import React from "react";
import { cn } from "@/lib/utils";

interface RrMediaInfoRowProps {
  label: string;
  value?: React.ReactNode | null;
  className?: string;
}

export function RrMediaInfoRow({
  label,
  value,
  className,
}: RrMediaInfoRowProps): React.JSX.Element {
  if (value === undefined || value === null || value === "") {
    return <></>;
  }

  return (
    <div className="flex justify-between items-start text-sm border-b border-border/50 pb-2 gap-3">
      <span className="text-muted-foreground shrink-0 font-medium">
        {label}
      </span>
      <span
        className={cn(
          "font-medium text-foreground text-right min-w-0 wrap-break-word",
          className,
        )}
      >
        {value}
      </span>
    </div>
  );
}
