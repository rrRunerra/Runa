import { Button } from "@/components/ui/button";
import { RotateCcw, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface StarMapControlsProps {
  onReset: () => void;
  showCompass: boolean;
  onToggleCompass: () => void;
}

export function StarMapControls({
  onReset,
  showCompass,
  onToggleCompass,
}: StarMapControlsProps) {
  const { t } = useTranslation();
  return (
    <div className="absolute top-4 right-4 z-50">
      {/* Control Panel: StarCard style but using semantic classes */}
      <div className="bg-card/40 backdrop-blur-xl border border-border rounded-xl p-1.5 flex flex-col gap-1.5 shadow-lg">
        {/* Reset Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onReset}
          className="size-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-300"
          title={t("stars.resetView")}
        >
          <RotateCcw className="size-5" />
        </Button>

        {/* Divider */}
        <div className="h-px bg-border mx-1" />

        {/* Compass Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCompass}
          className={cn(
            "size-10 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-300 relative",
            showCompass ? "bg-accent text-accent-foreground shadow-[0_0_12px_rgba(255,255,255,0.1)] border-border" : "hover:bg-accent/50"
          )}
          title={showCompass ? t("stars.hideWaypoint") : t("stars.showWaypoint")}
        >
          <Compass className="size-5" />
          {showCompass && (
            <div className="absolute top-1 right-1 size-2 rounded-full bg-primary animate-pulse" />
          )}
        </Button>
      </div>
    </div>
  );
}

