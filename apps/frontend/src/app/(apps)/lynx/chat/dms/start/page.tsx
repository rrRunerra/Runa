"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission, LynxFlags } from "@runa/permissions";
import { Suspense, useEffect } from "react";
import AccessDenied from "@/components/lynx/AccessDenied";
import { useTranslation } from "react-i18next";

function StartDmContent(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const { data: session, status } = useSession();
  if (status === "unauthenticated" || !hasPermission(session?.user?.permissions, LynxFlags.DM_CHAT)) {
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
    <div className="flex items-center justify-center min-h-screen text-muted-foreground bg-background relative z-10 select-none">
      <div className="flex flex-col items-center gap-4 bg-card/20 backdrop-blur-xl p-8 border border-border/50 rounded-2xl shadow-xl">
        <div className="size-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-semibold animate-pulse text-muted-foreground">
          {t("initializingDm")}
        </p>
      </div>
    </div>
  );
}

export default function StartDmPage(): React.JSX.Element {
  return (
    <Suspense>
      <StartDmContent />
    </Suspense>
  );
}
