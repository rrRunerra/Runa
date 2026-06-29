"use client";

import React from "react";
import RrLapplandNotFound from "@/components/rrComponents/rrImages/rrLapplandNotFound";

export default function Page(): React.JSX.Element {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-[650px] aspect-square">
        <RrLapplandNotFound className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
