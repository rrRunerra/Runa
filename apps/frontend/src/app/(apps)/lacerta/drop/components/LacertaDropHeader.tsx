"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

interface LacertaDropHeaderProps {
  username: string;
  isHidden: boolean;
  onToggleHidden: () => void;
}

export function LacertaDropHeader({
  username,
  isHidden,
  onToggleHidden,
}: LacertaDropHeaderProps): React.JSX.Element {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/lacerta")}
          className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Back to Lacerta"
          aria-label="Back to Lacerta dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Lacerta Drop
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            Direct Peer-to-Peer Encrypted File Sharing
          </p>
        </div>
      </div>

      {/* User Identity Panel */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Account</span>
          <span className="text-sm font-semibold text-foreground/80 font-mono">
            @{username || "signedin"}
          </span>
        </div>

        <button
          onClick={onToggleHidden}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold cursor-pointer ${
            isHidden
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
              : "bg-accent/50 border-border text-muted-foreground hover:bg-accent"
          }`}
          title={isHidden ? "Visible only to you" : "Visible to other network devices"}
        >
          {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {isHidden ? "Incognito" : "Visible"}
        </button>
      </div>
    </div>
  );
}
