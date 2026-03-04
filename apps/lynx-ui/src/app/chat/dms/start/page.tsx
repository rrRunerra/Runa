"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function StartDmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  useEffect(() => {
    if (!userId) {
      router.push("/chat/dms");
      return;
    }

    fetch(`/api/chat/dms/start?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          router.replace(`/chat/dms/${data.id}`);
        } else {
          router.push("/chat/dms");
        }
      })
      .catch(() => router.push("/chat/dms"));
  }, [userId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-400">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-medium animate-pulse">
          Initializing Direct Message...
        </p>
      </div>
    </div>
  );
}

export default function StartDmPage() {
  return (
    <Suspense>
      <StartDmContent />
    </Suspense>
  );
}
