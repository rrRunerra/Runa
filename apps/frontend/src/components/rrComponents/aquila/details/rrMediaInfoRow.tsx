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
    <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-foreground", className)}>
        {value}
      </span>
    </div>
  );
}
