"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PolarisNotFound(): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/polaris/not-found");
  }, [router]);
  return null;
}

