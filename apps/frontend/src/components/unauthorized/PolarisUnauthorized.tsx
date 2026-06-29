"use client";

import React from "react";

import RrLapplandUnauthorized from "@/components/rrComponents/rrImages/rrLapplandUnauthorized";

interface PolarisUnauthorizedProps {
  message?: string;
  returnUrl?: string;
}

export default function PolarisUnauthorized({}: PolarisUnauthorizedProps): React.JSX.Element {
  return (
    <div className="relative min-h-screen w-full  flex items-center justify-center p-4">
      <div className="w-full max-w-[650px] aspect-square ">
        <RrLapplandUnauthorized className="w-full h-full object-contain" />
      </div>
    </div>
  );
}
