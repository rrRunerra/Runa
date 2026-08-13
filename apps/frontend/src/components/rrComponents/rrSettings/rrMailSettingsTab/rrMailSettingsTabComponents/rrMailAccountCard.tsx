import type React from "react";
import { Mail, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RrMailAccountCardProps {
  account: {
    id: string;
    accountName: string;
    emailAddress: string;
    color?: string;
    imapHost?: string;
    smtpHost?: string;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export function RrMailAccountCard({
  account,
  onEdit,
  onDelete,
}: RrMailAccountCardProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-all text-left">
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
  );
}
