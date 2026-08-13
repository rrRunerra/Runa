import React from "react";
import { Laptop, Smartphone, Globe, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export interface RrDeviceItemProps {
  device: {
    id: string;
    deviceName?: string;
    deviceType?: string;
    ipAddress?: string;
    lastActive?: string;
    isCurrent?: boolean;
  };
  onRevoke: (deviceId: string) => void;
  isRevoking?: boolean;
}

/**
 * Item component displaying information about a connected security device or session.
 */
export function RrDeviceItem({
  device,
  onRevoke,
  isRevoking = false,
}: RrDeviceItemProps): React.JSX.Element {
  const { t } = useTranslation();

  const getDeviceIcon = (): React.ReactNode => {
    const type = (device.deviceType || "").toLowerCase();
    if (type.includes("mobile") || type.includes("phone")) {
      return <Smartphone className="size-4 text-primary" />;
    }
    if (type.includes("desktop") || type.includes("laptop")) {
      return <Laptop className="size-4 text-primary" />;
    }
    return <Globe className="size-4 text-primary" />;
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          {getDeviceIcon()}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground truncate">
              {device.deviceName || t("securitySettings.unknownDevice")}
            </span>
            {device.isCurrent && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/25">
                {t("securitySettings.currentDevice")}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground truncate">
            {device.ipAddress || "0.0.0.0"} •{" "}
            {device.lastActive
              ? new Date(device.lastActive).toLocaleDateString()
              : t("securitySettings.recentlyActive")}
          </span>
        </div>
      </div>

      {!device.isCurrent && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRevoke(device.id)}
          disabled={isRevoking}
          className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0 ml-2"
          title={t("securitySettings.revokeAccess")}
        >
          {isRevoking ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}
