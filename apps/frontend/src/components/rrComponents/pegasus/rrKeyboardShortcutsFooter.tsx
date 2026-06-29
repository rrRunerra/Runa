"use client";

import React from "react";
import { Keyboard } from "lucide-react";

interface RrKeyboardShortcutsFooterProps {
  onClose: () => void;
}

export default function RrKeyboardShortcutsFooter({
  onClose,
}: RrKeyboardShortcutsFooterProps): React.JSX.Element {
  return (
    <div className="p-3 bg-card border-t border-border flex items-center justify-between text-[9px] text-muted-foreground font-sans tracking-wide shrink-0">
      <span className="flex items-center gap-1.5">
        <Keyboard className="size-3 text-muted-foreground" />
        <span>J/K Navigate • C Compose • R Reply • E Archive • Delete Trash</span>
      </span>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
      >
        Hide
      </button>
    </div>
  );
}
