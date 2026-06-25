"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import RrLapplandNotFound from "@/components/rrComponents/rrImages/rrLapplandNotFound";

export default function NotFound(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/polaris") && pathname !== "/polaris/not-found") {
      router.replace("/polaris/not-found");
    } else if (pathname.startsWith("/lynx") && pathname !== "/lynx/not-found") {
      router.replace("/lynx/not-found");
    } else if (pathname.startsWith("/pegasus") && pathname !== "/pegasus/not-found") {
      router.replace("/pegasus/not-found");
    } else if (pathname.startsWith("/aquila") && pathname !== "/aquila/not-found") {
      router.replace("/aquila/not-found");
    }
  }, [pathname, router]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-[650px] aspect-square">
        <RrLapplandNotFound className="w-full h-full object-contain" />
      </div>
    </div>
  );
}

