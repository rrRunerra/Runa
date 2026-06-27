"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LacertaNotFound(): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lacerta/not-found");
  }, [router]);
  return null;
}
