import * as React from "react";
import { Smartphone, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RrDeviceItemProps {
  device: {
    id: string;
    deviceName: string;
    userAgent: string | null;
    lastActiveAt: string;
  };
  onRevoke: (id: string) => void;
}

export function RrDeviceItem({
  device,
  onRevoke,
}: RrDeviceItemProps): React.JSX.Element {
  return (
    <div className="p-4 rounded-2xl border border-border bg-card/10 flex items-center justify-between gap-3 text-left">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
          <Smartphone className="size-4.5" />
        </div>
        
        <div className="flex flex-col gap-0.5 text-left min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-foreground truncate block">
              {device.deviceName}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground block truncate max-w-[200px] md:max-w-[300px]">
            {device.userAgent || "Unknown User Agent"}
          </span>
          <span className="text-[9px] text-muted-foreground/60 block">
            Last Active: {new Date(device.lastActiveAt).toLocaleString()}
          </span>
        </div>
      </div>
      
      <Button
        onClick={() => onRevoke(device.id)}
        variant="ghost"
        className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
        aria-label={`Revoke device ${device.deviceName}`}
      >
        <Trash className="size-4" />
      </Button>
    </div>
  );
}
