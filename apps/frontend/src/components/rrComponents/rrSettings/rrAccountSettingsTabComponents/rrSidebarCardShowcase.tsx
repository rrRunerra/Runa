import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  return (
    <div className="flex flex-col justify-center items-center p-4 rounded-xl border border-dashed border-border bg-muted/10 relative overflow-hidden min-h-[90px]">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-2 font-bold select-none">
        {t("account.sidebarCardShowcase")}
      </div>

      <div className="h-12 w-full max-w-[240px] flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card/40 backdrop-blur-xl relative overflow-hidden transition-all duration-300 isolate transform-[translate3d(0,0,0)]">
        {sidebarCardBackgroundUrl && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center z-0"
              style={{
                backgroundImage: `url(${
                  sidebarCardBackgroundUrl.startsWith("blob:")
                    ? sidebarCardBackgroundUrl
                    : getSafeImageUrl(sidebarCardBackgroundUrl)
                })`,
              }}
            />
            <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/40 to-transparent z-0" />
          </>
        )}

        <div className="relative size-8 rounded-full border border-border shadow-sm shrink-0 overflow-hidden z-10 bg-muted">
          {avatarUrl ? (
            <img
              src={
                avatarUrl.startsWith("blob:")
                  ? avatarUrl
                  : getSafeImageUrl(avatarUrl)
              }
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
              {displayName
                ? displayName.charAt(0).toUpperCase()
                : username?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>

        <div className="grid flex-1 text-left text-xs leading-tight ml-1.5 z-10">
          <span
            className={cn(
              "truncate font-bold",
              sidebarCardBackgroundUrl ? "text-white" : "text-foreground",
            )}
          >
            {displayName || username || "Username"}
          </span>
          <span
            className={cn(
              "truncate text-[10px]",
              sidebarCardBackgroundUrl
                ? "text-zinc-300"
                : "text-muted-foreground/80",
            )}
          >
            {email || "email@example.com"}
          </span>
        </div>
        <ChevronsUpDown
          className={cn(
            "ml-auto size-3.5 z-10",
            sidebarCardBackgroundUrl
              ? "text-zinc-400"
              : "text-muted-foreground/60",
          )}
        />
      </div>
    </div>
  );
}
