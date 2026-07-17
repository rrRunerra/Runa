import * as React from "react";
import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export interface RrMailAccountCardProps {
  account: {
    id: string;
    accountName: string;
    emailAddress: string;
    loginEmail: string | null;
    imapHost: string;
    smtpHost: string;
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

  return (
    <div className="p-4 rounded-xl border border-border bg-card/40 flex items-center justify-between gap-3 text-left">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col gap-0.5 text-left min-w-0">
          <span className="text-xs font-bold text-foreground block truncate">
            {account.accountName}
          </span>
          <span className="text-[10px] text-muted-foreground block truncate">
            {account.emailAddress}
            {account.loginEmail && account.loginEmail !== account.emailAddress && (
              <span className="text-muted-foreground/50">
                {" "}
                · {t("mailSettings.login")}: {account.loginEmail}
              </span>
            )}
          </span>
          <span className="text-[9px] text-muted-foreground/60 block truncate">
            IMAP: {account.imapHost} | SMTP: {account.smtpHost}
          </span>
        </div>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button
          onClick={onEdit}
          variant="ghost"
          className="h-8 px-2.5 rounded-lg text-xs font-semibold text-foreground hover:bg-muted"
        >
          {t("mailSettings.editBtn")}
        </Button>
        <Button
          onClick={onDelete}
          variant="ghost"
          className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          aria-label={`Delete account ${account.accountName}`}
        >
          <Trash className="size-4" />
        </Button>
      </div>
    </div>
  );
}
