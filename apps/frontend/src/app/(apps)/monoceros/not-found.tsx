"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MonocerosNotFound(): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/monoceros/not-found");
  }, [router]);
  return null;
}
