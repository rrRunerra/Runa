"use client";

import React from "react";
import Image from "next/image";
import { User, X, UserCheck, Sparkles, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
}

interface RrSenderProfileCardProps {
  profile: UserProfile | null;
  loading: boolean;
  onClose: () => void;
}

export default function RrSenderProfileCard({
  profile,
  loading,
  onClose,
}: RrSenderProfileCardProps): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-2 text-muted-foreground p-6">
        <Loader2 className="size-5 text-primary animate-spin" />
        <span className="text-[10px]">{t("pegasus.senderCard.searching")}</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center space-y-3">
        <div className="size-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
          <User className="size-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-foreground">
            {t("pegasus.senderCard.noProfile")}
          </h4>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {t("pegasus.senderCard.notLinked")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar relative bg-card text-card-foreground">
      {/* Banner */}
      <div className="h-20 bg-muted w-full shrink-0 relative overflow-hidden">
        {profile.bannerUrl && (
          <Image
            src={profile.bannerUrl}
            alt="User Banner"
            fill
            sizes="280px"
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent" />
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-md bg-background/60 hover:bg-background border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
      >
        <X className="size-3.5" />
      </button>

      {/* Profile Details */}
      <div className="p-4 flex flex-col items-center -mt-10 relative z-20 space-y-4">
        <div className="size-16 rounded-full border-2 border-background bg-muted overflow-hidden relative shadow-lg">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt="Avatar"
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <User className="size-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold text-foreground">
            {profile.displayName || profile.username}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            @{profile.username}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full text-[9px] font-semibold tracking-wider uppercase">
          <UserCheck className="size-3" />
          <span>{t("pegasus.senderCard.verifiedContact")}</span>
        </div>

        <div className="pt-4 border-t border-border w-full space-y-3">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {t("pegasus.senderCard.quickActions")}
          </h4>
          <button
            onClick={() => router.push(`/polar?search=${profile.username}`)}
            className="w-full text-left px-3 py-2 bg-muted/40 hover:bg-muted border border-border text-[11px] rounded-xl text-foreground font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="size-3.5 text-primary" />
            {t("pegasus.senderCard.viewDashboard")}
          </button>
        </div>
      </div>
    </div>
  );
}
