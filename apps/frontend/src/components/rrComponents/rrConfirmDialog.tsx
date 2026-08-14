"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, HelpCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Props for the generic RrConfirmDialog component.
 */
export interface RrConfirmDialogProps {
  /** Controls whether the confirmation alert dialog is visible */
  open: boolean;
  /** Callback fired when the open state changes */
  onOpenChange: (open: boolean) => void;
  /** Title of the confirmation dialog */
  title: React.ReactNode;
  /** Optional detailed description explaining the consequences of the action */
  description?: React.ReactNode;
  /** Label for the confirmation action button (defaults to localized "Confirm") */
  confirmText?: string;
  /** Label for the cancel button (defaults to localized "Cancel") */
  cancelText?: string;
  /** Async or sync callback fired when the user confirms the action */
  onConfirm: () => Promise<void> | void;
  /** Whether the confirmation action is currently executing */
  isSubmitting?: boolean;
  /** Visual variant of the confirm button ("default" | "destructive" | "warning") */
  variant?: "default" | "destructive" | "warning";
  /** Optional custom icon to display in the header */
  icon?: React.ReactNode;
  /** Optional additional content rendered in the dialog body */
  children?: React.ReactNode;
}

/**
 * A reusable, pessimistic confirmation alert dialog component used across Runa.
 * Built on top of Radix UI and shadcn AlertDialog primitives.
 *
 * Supports loading states, customizable variants, icons, and inline children descriptions.
 *
 * @example
 * ```tsx
 * <RrConfirmDialog
 *   open={isRevokeOpen}
 *   onOpenChange={setIsRevokeOpen}
 *   title="Revoke Device?"
 *   description="This device will be immediately logged out."
 *   variant="destructive"
 *   onConfirm={handleRevoke}
 * />
 * ```
 */
export function RrConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  isSubmitting = false,
  variant = "default",
  icon,
  children,
}: RrConfirmDialogProps): React.JSX.Element {
  const { t } = useTranslation();

  /**
   * Handles user action confirmation.
   * Prevents default Radix auto-close behavior so async workflows can complete.
   */
  const handleConfirm = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    e.preventDefault();
    try {
      await onConfirm();
    } catch {
      // Errors handled by caller toast
    }
  };

  /**
   * Determines the icon to display in the header based on the variant if not explicitly provided.
   */
  const renderIcon = (): React.ReactNode => {
    if (icon) return icon;
    if (variant === "destructive" || variant === "warning") {
      return <AlertTriangle className="size-5" />;
    }
    return <HelpCircle className="size-5" />;
  };

  /**
   * Resolves visual styles (colors, background badges, button styling) based on the variant.
   */
  const getVariantStyles = (): {
    iconBg: string;
    iconColor: string;
    buttonClass: string;
  } => {
    switch (variant) {
      case "destructive":
        return {
          iconBg: "bg-destructive/10 border-destructive/20",
          iconColor: "text-destructive",
          buttonClass:
            "bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold",
        };
      case "warning":
        return {
          iconBg: "bg-warning/10 border-warning/20",
          iconColor: "text-warning",
          buttonClass:
            "bg-warning hover:bg-warning/90 text-warning-foreground font-bold",
        };
      default:
        return {
          iconBg: "bg-primary/10 border-primary/20",
          iconColor: "text-primary",
          buttonClass:
            "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-sm sm:max-w-sm bg-card border border-border shadow-2xl p-6 rounded-2xl text-left overflow-hidden">
        <AlertDialogHeader className="flex flex-col gap-2 text-left sm:text-left items-start sm:items-start w-full min-w-0 pb-2">
          <div className="flex items-center gap-3 w-full min-w-0">
            <div
              className={cn(
                "size-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors",
                styles.iconBg,
                styles.iconColor,
              )}
            >
              {renderIcon()}
            </div>
            <AlertDialogTitle
              className={cn(
                "text-base font-bold text-left flex-1 min-w-0 wrap-break-word [text-wrap:normal]",
                variant === "destructive"
                  ? "text-destructive"
                  : "text-foreground",
              )}
            >
              {title}
            </AlertDialogTitle>
          </div>
          {description && (
            <AlertDialogDescription className="text-xs text-muted-foreground text-left leading-relaxed w-full min-w-0 wrap-break-word [text-wrap:normal] md:[text-wrap:normal]">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {children && <div className="py-2 w-full min-w-0">{children}</div>}

        <AlertDialogFooter className="flex flex-row justify-end gap-3 pt-4 border-t border-border/40 mt-2 w-full">
          <AlertDialogCancel
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
          >
            {cancelText || t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={cn(
              "rounded-xl px-5 text-xs h-9 cursor-pointer transition-all",
              styles.buttonClass,
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Spinner className="size-3.5" />
                <span>{t("processing")}</span>
              </div>
            ) : (
              confirmText || t("confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
