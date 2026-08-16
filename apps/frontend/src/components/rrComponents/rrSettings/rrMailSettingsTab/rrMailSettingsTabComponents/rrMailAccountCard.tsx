import type React from "react";
import { Mail, Edit3, Trash2, Clock, CheckCircle2, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export interface RrMailAccountCardProps {
  account: {
    id: string;
    accountName: string;
    emailAddress: string;
    color?: string;
    imapHost?: string;
    smtpHost?: string;
    syncEnabled?: boolean;
    syncTimeRangeEnabled?: boolean;
    syncStartTime?: string | null;
    syncEndTime?: string | null;
    syncDays?: number[] | null;
    syncTimezone?: string | null;
    syncIntervalMinutes?: number | null;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export function RrMailAccountCard({
  account,
  onEdit,
  onDelete,
}: RrMailAccountCardProps): React.JSX.Element {
  const { t } = useTranslation();

  const isSyncEnabled = account.syncEnabled !== false;
  const isTimeRangeEnabled = Boolean(account.syncTimeRangeEnabled);

  return (
    <div className="flex flex-col justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all text-left gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: account.color || "#8B00FF" }}
          >
            <Mail className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-bold text-foreground truncate block">
              {account.accountName}
            </span>
            <span className="text-[11px] text-muted-foreground truncate block">
              {account.emailAddress}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Edit3 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Sync Schedule Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px]">
        {!isSyncEnabled ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <PauseCircle className="size-3 text-amber-500/80" />
            <span>{t("mailSettings.wizard.syncBadgePaused", "Sync Paused")}</span>
          </div>
        ) : isTimeRangeEnabled ? (
          <div className="flex items-center gap-1.5 text-muted-foreground truncate max-w-full">
            <Clock className="size-3 text-primary shrink-0" />
            <span className="truncate">
              {account.syncStartTime || "08:00"} - {account.syncEndTime || "22:00"} (
              <span className="font-mono text-foreground/80">
                {account.syncTimezone || "UTC"}
              </span>
              )
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-emerald-500/90 font-medium">
            <CheckCircle2 className="size-3 text-emerald-500" />
            <span>
              {t("mailSettings.wizard.syncBadge247", "24/7")} (
              {account.syncIntervalMinutes || 5}m)
            </span>
          </div>
        )}

        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 h-4 border-border/50 bg-background/60 text-muted-foreground/80 shrink-0 font-mono"
        >
          {account.imapHost ? account.imapHost.split(".")[0] : "IMAP"}
        </Badge>
      </div>
    </div>
  );
}
