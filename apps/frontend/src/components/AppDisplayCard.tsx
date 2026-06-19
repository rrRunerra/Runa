import React from "react";
import { App } from "../../config/apps";

interface AppDisplayCardProps {
  app: App;
}

export default function AppDisplayCard({ app }: AppDisplayCardProps) {
  return (
    <>
      <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-md shrink-0">
        {app.logo}
      </div>
      <div className="grid flex-1 text-left text-sm leading-tight ml-1.5 min-w-0">
        <span className="truncate font-semibold text-foreground">
          {app.name}
        </span>
        <span className="truncate text-xs text-muted-foreground/80">
          {app.description}
        </span>
      </div>
    </>
  );
}
