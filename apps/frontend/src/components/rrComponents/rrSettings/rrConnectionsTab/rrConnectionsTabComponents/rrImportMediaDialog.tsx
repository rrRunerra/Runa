"use client";

import type React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ConnectionMetadata,
  ConnectionCapability,
} from "@runa/connections/metadata";

/**
 * Map of connection capabilities to display labels and query keys.
 */
export const IMPORTABLE_CAPABILITIES: Record<
  string,
  { label: string; key: string }
> = {
  [ConnectionCapability.ANIME]: { label: "Anime List", key: "anime" },
  [ConnectionCapability.MANGA]: { label: "Manga List", key: "manga" },
  [ConnectionCapability.MOVIES]: { label: "Movies List", key: "movie" },
  [ConnectionCapability.TV_SHOWS]: { label: "TV Shows List", key: "tv" },
};

/**
 * Props for RrImportMediaDialog.
 */
export interface RrImportMediaDialogProps {
  /** Provider ID for which the import dialog is opened, or null if closed */
  providerId: string | null;
  /** Metadata of the selected connection provider */
  provider?: ConnectionMetadata;
  /** List of media type keys currently selected for import */
  selectedMediaTypes: string[];
  /** Callback to toggle selection of a specific media type */
  onToggleMediaType: (key: string) => void;
  /** Callback fired when user initiates import */
  onStartImport: () => void;
  /** Callback fired when dialog open state changes */
  onClose: () => void;
}

/**
 * Modal dialog for selecting which media lists (Anime, Manga, Movies, TV Shows)
 * to synchronize/import from an external connection provider.
 */
export function RrImportMediaDialog({
  providerId,
  provider,
  selectedMediaTypes,
  onToggleMediaType,
  onStartImport,
  onClose,
}: RrImportMediaDialogProps): React.JSX.Element {
  const { t } = useTranslation();

  const availableCaps = (provider?.capabilities || []).filter(
    (cap: ConnectionCapability) => cap in IMPORTABLE_CAPABILITIES,
  );

  return (
    <Dialog open={!!providerId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-left overflow-hidden">
        <DialogHeader className="w-full min-w-0">
          <DialogTitle className="text-base font-semibold text-foreground">
            {t("connections.selectImportTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-3 w-full min-w-0">
          <div className="flex flex-col gap-2.5 w-full min-w-0">
            {availableCaps.map((cap: ConnectionCapability) => {
              const { key } = IMPORTABLE_CAPABILITIES[cap];
              const isChecked = selectedMediaTypes.includes(key);
              return (
                <div
                  key={key}
                  onClick={() => onToggleMediaType(key)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer select-none"
                >
                  <Checkbox
                    id={`media-type-${key}`}
                    checked={isChecked}
                    onCheckedChange={() => onToggleMediaType(key)}
                  />
                  <label
                    htmlFor={`media-type-${key}`}
                    className="text-xs font-semibold text-foreground select-none cursor-pointer flex-1"
                  >
                    {t(`mediaTypes.${key}`)}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="w-full flex justify-end gap-2.5 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl h-9 text-xs cursor-pointer"
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            disabled={selectedMediaTypes.length === 0}
            onClick={onStartImport}
            className="rounded-xl h-9 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/95 cursor-pointer"
          >
            {t("connections.startImportBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
