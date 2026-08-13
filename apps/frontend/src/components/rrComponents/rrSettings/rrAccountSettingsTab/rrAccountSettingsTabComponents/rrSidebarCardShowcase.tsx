import React from "react";
import { useTranslation } from "react-i18next";
import { RrSidebarUserCard } from "@/components/rrComponents/rrSidebarUserCard";

export interface RrSidebarCardShowcaseProps {
  sidebarCardBackgroundUrl: string;
  avatarUrl: string;
  displayName: string;
  username: string;
  email: string;
}

/**
 * Preview showcase component demonstrating how custom card background images will appear in the sidebar panel.
 * Renders the actual RrSidebarUserCard component to ensure 100% fidelity with the live sidebar card.
 */
export function RrSidebarCardShowcase({
  sidebarCardBackgroundUrl,
  avatarUrl,
  displayName,
  username,
  email,
}: RrSidebarCardShowcaseProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1.5 text-left w-full justify-center">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
        {t("account.livePreview", "Live Preview")}
      </span>
      <RrSidebarUserCard
        sidebarCardBackgroundUrl={sidebarCardBackgroundUrl}
        avatarUrl={avatarUrl}
        displayName={displayName}
        username={username}
        email={email}
        showEmail={true}
        showChevrons={true}
        className="w-full"
      />
    </div>
  );
}
