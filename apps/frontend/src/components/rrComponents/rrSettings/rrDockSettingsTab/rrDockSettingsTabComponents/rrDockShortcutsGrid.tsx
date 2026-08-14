"use client";

import type React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { hasPermission } from "@runa/permissions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RrDockShortcutsGridProps } from "./types";

/**
 * Grid rendering all available navigation shortcuts for the active application.
 */
export function RrDockShortcutsGrid({
  groupedItems,
  tempPositions,
  focusedSlot,
  onSelectItem,
  userPermissions,
}: RrDockShortcutsGridProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(groupedItems).map(([secName, items]) => (
        <div key={secName} className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
            {secName}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map((item) => {
              const itemKey =
                item.href ||
                (item.component ? `label:${item.label}` : undefined);
              const hasChildren = item.children && item.children.length > 0;
              const visibleChildren = (item.children || []).filter((child) => {
                return (
                  !child.permissions ||
                  hasPermission(userPermissions, child.permissions, "any")
                );
              });

              if (!itemKey && visibleChildren.length === 0) return null;

              if (hasChildren && visibleChildren.length > 0) {
                const parentAssignedPos = itemKey
                  ? Object.keys(tempPositions).find(
                      (key) => tempPositions[key] === itemKey,
                    )
                  : undefined;

                const assignedChildrenPositions = visibleChildren
                  .map((child) => {
                    const childKey =
                      child.href ||
                      (child.component ? `label:${child.label}` : undefined);
                    const pos = childKey
                      ? Object.keys(tempPositions).find(
                          (key) => tempPositions[key] === childKey,
                        )
                      : undefined;
                    return pos ? { label: child.label, pos } : null;
                  })
                  .filter((c): c is { label: string; pos: string } => !!c);

                const isAnyAssigned =
                  !!parentAssignedPos || assignedChildrenPositions.length > 0;

                let assignedPositionsText = "";
                if (parentAssignedPos && assignedChildrenPositions.length > 0) {
                  assignedPositionsText = `${t("sidebar.posLabel")} ${parentAssignedPos}, ${assignedChildrenPositions.map((c) => c.pos).join(", ")}`;
                } else if (parentAssignedPos) {
                  assignedPositionsText = `${t("sidebar.posLabel")} ${parentAssignedPos}`;
                } else if (assignedChildrenPositions.length > 0) {
                  assignedPositionsText = `${t("sidebar.posLabel")} ${assignedChildrenPositions.map((c) => c.pos).join(", ")}`;
                }

                return (
                  <DropdownMenu key={itemKey || `parent:${item.label}`}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={!focusedSlot}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all duration-200 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 w-full justify-between",
                          isAnyAssigned
                            ? "bg-muted/30 border-border text-muted-foreground font-semibold"
                            : "bg-background/80 border-border/70 hover:bg-muted/40 hover:border-border text-foreground shadow-2xs",
                        )}
                      >
                        <span className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="size-6 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center shrink-0 opacity-80 [&>svg]:size-3.5">
                            {item.icon}
                          </span>
                          <span className="truncate flex-1 font-semibold">
                            {item.label}
                          </span>
                        </span>

                        <span className="flex items-center gap-1.5 shrink-0 ml-1">
                          {assignedPositionsText && (
                            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-md font-bold uppercase">
                              {assignedPositionsText}
                            </span>
                          )}
                          <ChevronDown className="size-3.5 opacity-60" />
                        </span>
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="start"
                      className="w-56 bg-card border border-border shadow-xl rounded-xl p-1 z-200"
                    >
                      <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                        {t("sidebar.addToPosition", { pos: focusedSlot })}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-border/40" />

                      {itemKey && (
                        <DropdownMenuItem
                          disabled={!focusedSlot}
                          onClick={() => onSelectItem(itemKey)}
                          className="text-xs flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer hover:bg-muted font-medium"
                        >
                          <span className="font-semibold">
                            {item.label} (Main)
                          </span>
                          {parentAssignedPos && (
                            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold uppercase">
                              {t("sidebar.posLabel")} {parentAssignedPos}
                            </span>
                          )}
                        </DropdownMenuItem>
                      )}

                      {itemKey && visibleChildren.length > 0 && (
                        <DropdownMenuSeparator className="bg-border/40" />
                      )}

                      {visibleChildren.map((child) => {
                        const childKey =
                          child.href ||
                          (child.component
                            ? `label:${child.label}`
                            : undefined);
                        if (!childKey) return null;
                        const childAssignedPos = Object.keys(tempPositions).find(
                          (key) => tempPositions[key] === childKey,
                        );

                        return (
                          <DropdownMenuItem
                            key={childKey}
                            disabled={!focusedSlot}
                            onClick={() => onSelectItem(childKey)}
                            className="text-xs flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer hover:bg-muted"
                          >
                            <span className="flex items-center gap-2">
                              <span className="size-5 rounded bg-muted/50 border border-border/40 flex items-center justify-center shrink-0 opacity-70 [&>svg]:size-3">
                                {child.icon}
                              </span>
                              <span>{child.label}</span>
                            </span>
                            {childAssignedPos && (
                              <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold uppercase">
                                {t("sidebar.posLabel")} {childAssignedPos}
                              </span>
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              if (itemKey) {
                const assignedPos = Object.keys(tempPositions).find(
                  (key) => tempPositions[key] === itemKey,
                );
                const isAssigned = !!assignedPos;
                return (
                  <button
                    key={itemKey}
                    type="button"
                    disabled={!focusedSlot}
                    onClick={() => onSelectItem(itemKey)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all duration-200 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                      isAssigned
                        ? "bg-muted/30 border-border text-muted-foreground font-semibold"
                        : "bg-background/80 border-border/70 hover:bg-muted/40 hover:border-border text-foreground shadow-2xs",
                    )}
                  >
                    <span className="size-6 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center shrink-0 opacity-80 [&>svg]:size-3.5">
                      {item.icon}
                    </span>
                    <span className="truncate flex-1 font-semibold">
                      {item.label}
                    </span>
                    {isAssigned && (
                      <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-md font-bold uppercase shrink-0">
                        {t("sidebar.posLabel")} {assignedPos}
                      </span>
                    )}
                  </button>
                );
              }

              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
