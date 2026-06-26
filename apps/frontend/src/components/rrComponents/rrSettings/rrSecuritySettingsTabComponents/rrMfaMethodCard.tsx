import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface RrMfaMethodCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isActive: boolean;
  statusText: string;
  actionText: string;
  onAction: () => void;
  actionVariant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  actionClassName?: string;
}

export function RrMfaMethodCard({
  title,
  description,
  icon,
  isActive,
  statusText,
  actionText,
  onAction,
  actionVariant,
  actionClassName,
}: RrMfaMethodCardProps): React.JSX.Element {
  return (
    <Card className="flex flex-col justify-between text-left">
      <CardHeader className="flex flex-col gap-2 pb-2">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            {icon}
          </div>
          <Badge variant={isActive ? "default" : "outline"}>
            {statusText}
          </Badge>
        </div>
        <CardTitle className="text-sm font-bold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 pb-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button
          onClick={onAction}
          variant={actionVariant ?? (isActive ? "outline" : "default")}
          className={cn(
            "w-full h-9 rounded-xl font-semibold text-xs transition-all cursor-pointer",
            isActive && "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30",
            actionClassName
          )}
        >
          {actionText}
        </Button>
      </CardFooter>
    </Card>
  );
}
