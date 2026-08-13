import * as React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Info, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Props for the generic RrConfirmDialog component.
 */
export interface RrConfirmDialogProps {
  /** Controls whether the confirmation dialog is visible */
  open: boolean;
  /** Callback fired when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Title of the confirmation dialog */
  title: React.ReactNode;
  /** Optional detailed description explaining the consequences of the action */
  description?: React.ReactNode;
  /** Label for the confirmation button (defaults to "Confirm") */
  confirmText?: string;
  /** Label for the cancel button (defaults to "Cancel") */
  cancelText?: string;
  /** Async or sync callback fired when user confirms the action */
  onConfirm: () => Promise<void> | void;
  /** Whether the confirm action is currently executing */
  isSubmitting?: boolean;
  /** Visual variant of the confirm button ("default" | "destructive" | "warning") */
  variant?: "default" | "destructive" | "warning";
  /** Optional custom icon to display in the header */
  icon?: React.ReactNode;
  /** Optional additional content rendered in the dialog body */
  children?: React.ReactNode;
}

/**
 * A reusable, pessimistic confirmation dialog component used across Runa.
 * Supports loading states, custom variants, icons, and inline descriptions.
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

  const handleConfirm = async (): Promise<void> => {
    try {
      await onConfirm();
    } catch {
      // Errors handled by caller toast
    }
  };

  // Determine icon based on variant if not explicitly provided
  const renderIcon = (): React.ReactNode => {
    if (icon) return icon;
    if (variant === "destructive" || variant === "warning") {
      return <AlertTriangle className="size-5" />;
    }
    return <HelpCircle className="size-5" />;
  };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-2xl p-6 rounded-2xl text-left">
        <DialogHeader className="pb-2">
          <div
            className={cn(
              "size-10 rounded-xl border flex items-center justify-center mb-2 shrink-0 transition-colors",
              styles.iconBg,
              styles.iconColor,
            )}
          >
            {renderIcon()}
          </div>
          <DialogTitle
            className={cn(
              "text-md font-bold text-left",
              variant === "destructive"
                ? "text-destructive"
                : "text-foreground",
            )}
          >
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground mt-1 text-left leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children && <div className="py-2">{children}</div>}

        <div className="flex justify-end gap-3 pt-4 border-t border-border/40 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
            disabled={isSubmitting}
          >
            {cancelText || t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={cn(
              "rounded-xl px-5 text-xs h-9 cursor-pointer transition-all",
              styles.buttonClass,
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Spinner className="size-3.5" />
                <span>{t("processing", "Processing...")}</span>
              </div>
            ) : (
              confirmText || t("confirm", "Confirm")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
