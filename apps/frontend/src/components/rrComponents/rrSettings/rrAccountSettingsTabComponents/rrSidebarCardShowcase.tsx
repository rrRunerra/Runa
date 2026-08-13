import * as React from "react";
import { useState } from "react";
import { RrSidebarUserCard } from "@/components/rrComponents/rrSidebarUserCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface RrSidebarCardShowcaseProps {
  sidebarCardBackgroundUrl: string;
  avatarUrl: string;
  displayName: string;
  username: string;
  email: string;
}

export function RrSidebarCardShowcase({
  sidebarCardBackgroundUrl,
  avatarUrl,
  displayName,
  username,
  email,
}: RrSidebarCardShowcaseProps): React.JSX.Element {
  const [showEmail, setShowEmail] = useState<boolean>(true);

  return (
    <div className="flex flex-col items-center justify-center gap-3 w-full py-3">
      {/* Preview Email Toggle Control */}
      <div className="flex items-center gap-2.5 self-end text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border/40">
        <Switch
          id="show-email-toggle"
          checked={showEmail}
          onCheckedChange={setShowEmail}
          className="scale-85 cursor-pointer"
        />
        <Label
          htmlFor="show-email-toggle"
          className="text-xs font-semibold cursor-pointer select-none"
        >
          Show Email
        </Label>
      </div>

      <RrSidebarUserCard
        sidebarCardBackgroundUrl={sidebarCardBackgroundUrl}
        avatarUrl={avatarUrl}
        displayName={displayName}
        username={username}
        email={email}
        showEmail={showEmail}
        showChevrons
        className="h-20 sm:h-24 w-full max-w-120 hover:scale-[1.02] shadow-xl border-border/80 bg-card/70 px-5 py-4"
        avatarClassName="size-12 sm:size-14 border-2"
      />
    </div>
  );
}
