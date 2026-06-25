"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LynxNotFound(): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lynx/not-found");
  }, [router]);
  return null;
}

