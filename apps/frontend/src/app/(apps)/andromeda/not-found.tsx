"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AndromedaNotFound(): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/andromeda/not-found");
  }, [router]);
  return null;
}
