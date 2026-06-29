"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PegasusNotFound(): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    router.replace("/pegasus/not-found");
  }, [router]);
  return null;
}

