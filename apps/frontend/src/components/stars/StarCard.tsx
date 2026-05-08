"use client";

import { cn } from "@/lib/utils";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StarBackground } from "@/components/stars/StarBackground";

interface StarCardProps extends React.ComponentProps<typeof Card> {
  children: React.ReactNode;
}

export function StarCard({ className, children, ...props }: StarCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden group border-(--star-card-border,var(--color-zinc-800)) bg-(--star-card-bg,rgba(0,0,0,0.4)) backdrop-blur-xl transition-colors hover:border-(--star-card-border-hover,var(--color-zinc-700))",
        className,
      )}
      {...props}
    >
      <StarBackground />
      <div className="relative z-10">{children}</div>
    </Card>
  );
}

// Re-export Card sub-components so they can be used directly with StarCard if desired,
// or users can import them from ui/card. Ideally, StarCard should work as a drop-in replacement for Card.
export { CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
