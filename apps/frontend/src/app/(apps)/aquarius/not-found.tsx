"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AquariusNotFound(): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/aquarius/not-found");
  }, [router]);
  return null;
}
