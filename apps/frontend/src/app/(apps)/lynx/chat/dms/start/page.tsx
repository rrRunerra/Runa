"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect } from "react";
import AccessDenied from "@/components/lynx/AccessDenied";

function StartDmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const { data: session, status } = useSession();
  if (status === "unauthenticated" || session?.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  useEffect(() => {
    if (!userId) {
      router.push("/lynx/chat/dms");
      return;
    }

    fetch(`/lynx/api/chat/dms/start?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          router.replace(`/lynx/chat/dms/${data.id}`);
        } else {
          router.push("/lynx/chat/dms");
        }
      })
      .catch(() => router.push("/lynx/chat/dms"));
  }, [userId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen text-zinc-400 bg-background relative z-10">
      <div className="flex flex-col items-center gap-4 bg-zinc-950/20 backdrop-blur-xl p-8 border border-zinc-900/50 rounded-2xl shadow-xl">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-semibold animate-pulse text-muted-foreground">
          Initializing Direct Message…
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
