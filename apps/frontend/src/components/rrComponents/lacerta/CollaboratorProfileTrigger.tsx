"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import UserProfileCard, { UserProfileInfo } from "./UserProfileCard";

interface CollaboratorProfileTriggerProps {
  userId: string;
  username: string;
  accessToken: string;
  isMe?: boolean;
}

export default function CollaboratorProfileTrigger({
  userId,
  username,
  accessToken,
  isMe = false,
}: CollaboratorProfileTriggerProps): React.JSX.Element {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMouseEnter = async () => {
    if (profile || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${username}`,
        {
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : {},
        },
      );
      if (res.ok) {
        const data = await res.json();
        setProfile({
          id: data.id,
          username: data.username,
          email: data.email || `${data.username}@runerra.org`,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          bannerUrl: data.bannerUrl,
          bio: data.profileSettings?.bio || "",
        });
      }
    } catch (err) {
      console.error("Failed to load collaborator profile:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      {profile ? (
        <UserProfileCard user={profile}>
          <button className="w-full text-left flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground">
            <span className="truncate flex items-center gap-1.5">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isMe ? "bg-primary" : "bg-success",
                )}
              />
              {profile.displayName || profile.username} {isMe && `(${t("lacerta.canvasEditor.you", "You")})`}
            </span>
          </button>
        </UserProfileCard>
      ) : (
        <button
          disabled={loading}
          className="w-full text-left flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground"
        >
          <span className="truncate flex items-center gap-1.5">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full animate-pulse",
                isMe ? "bg-primary" : "bg-success",
              )}
            />
            {username} {isMe && `(${t("lacerta.canvasEditor.you", "You")})`} {loading && "..."}
          </span>
        </button>
      )}
    </div>
  );
}
