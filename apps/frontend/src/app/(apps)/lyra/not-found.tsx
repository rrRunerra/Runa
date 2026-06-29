"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LyraNotFound(): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lyra/not-found");
  }, [router]);
  return null;
}
