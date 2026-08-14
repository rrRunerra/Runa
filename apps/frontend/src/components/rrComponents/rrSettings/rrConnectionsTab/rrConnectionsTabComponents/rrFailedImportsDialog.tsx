"use client";

import type React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Representation of an individual item that failed during list import.
 */
export interface FailedImportItem {
  title: string;
  mediaType: string;
  providerId: string | number;
  reason: string;
}

/**
 * Props for RrFailedImportsDialog.
 */
export interface RrFailedImportsDialogProps {
  /** Payload of failed import items, or null when closed */
  failedImports: {
    providerId: string;
    items: FailedImportItem[];
  } | null;
  /** Callback fired when dialog is closed */
  onClose: () => void;
}

/**
 * Modal dialog presenting a detailed table of items that failed to import automatically.
 */
export function RrFailedImportsDialog({
  failedImports,
  onClose,
}: RrFailedImportsDialogProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Dialog open={!!failedImports} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[80vh] flex flex-col text-left overflow-hidden">
        <DialogHeader className="w-full min-w-0">
          <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <span className="inline-block size-2.5 rounded-full bg-warning animate-pulse shrink-0" />
            <span>
              {t("connections.failedItemsTitle", {
                count: failedImports?.items.length ?? 0,
              })}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-3 min-h-0 scrollbar-thin">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("connections.failedItemsDesc", {
              provider: failedImports?.providerId.toUpperCase() ?? "",
            })}
          </p>

          <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/10">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60 text-muted-foreground font-semibold text-[11px]">
                  <th className="p-3">{t("connections.tableTitle")}</th>
                  <th className="p-3 w-24">{t("connections.tableType")}</th>
                  <th className="p-3 w-28">{t("connections.tableId")}</th>
                  <th className="p-3">{t("connections.tableReason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {failedImports?.items.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td
                      className="p-3 font-medium text-foreground max-w-64 truncate"
                      title={item.title}
                    >
                      {item.title}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className="capitalize text-[10px] px-1.5 py-0 font-medium"
                      >
                        {t(`mediaTypes.${item.mediaType}`)}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-muted-foreground">
                      {item.providerId}
                    </td>
                    <td
                      className="p-3 text-warning font-medium max-w-64 truncate"
                      title={item.reason}
                    >
                      {item.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="w-full flex justify-end pt-3 border-t border-border/40">
          <Button
            size="sm"
            onClick={onClose}
            className="rounded-xl h-9 text-xs font-semibold px-5 cursor-pointer"
          >
            {t("connections.closeBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
