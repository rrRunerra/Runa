"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AquilaNotFound(): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/aquila/not-found");
  }, [router]);
  return null;
}

