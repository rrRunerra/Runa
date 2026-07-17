"use client";

import React from "react";
import useSWR from "swr";
import Link from "next/link";
import { Users, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Session } from "next-auth";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { fetcher } from "@/lib/fetcher";

interface FriendUser {
  id?: string;
  friendId?: string; // from /friends
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface RrProfileFriendsCardProps {
  username: string;
  session: Session | null;
  isOwner: boolean;
}

export function RrProfileFriendsCard({
  username,
  session,
  isOwner,
}: RrProfileFriendsCardProps): React.JSX.Element | null {
  const { t } = useTranslation();

  // If owner, fetch detailed friends endpoint. Otherwise fetch public user list.
  const fetchUrl = isOwner
    ? `${process.env.NEXT_PUBLIC_API_URL}/friends`
    : `${process.env.NEXT_PUBLIC_API_URL}/friends/user/${encodeURIComponent(username)}`;

  const {
    data: friends,
    isLoading,
    error,
  } = useSWR<FriendUser[]>(
    username && (isOwner || session?.accessToken)
      ? [fetchUrl, session?.accessToken]
      : null,
    fetcher,
    {
      shouldRetryOnError: false,
    }
  );

  // If there's an error (e.g. 403 Forbidden because friends list is private)
  const isPrivate = error && error.status === 403;

  if (isPrivate && !isOwner) {
    return null; // Hide the card entirely if private and not owner
  }

  return (
    <Card className="bg-card border border-border/50 shadow-xs hover:shadow-sm transition-all duration-200 rounded-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center gap-2">
        <Users className="size-4 text-primary shrink-0" />
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("polaris.user.friends", "Friends")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 justify-center py-4 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            <span>{t("polaris.user.privateFriendsDesc", "This friend list is private.")}</span>
          </div>
        ) : !friends || friends.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground italic">
            {t("polaris.user.noFriends", "No friends added yet")}
          </div>
        ) : (
          <ScrollArea className="max-h-[300px] pr-2">
            <div className="grid grid-cols-2 gap-2">
              {friends.map((friend) => {
                const targetUsername = friend.username;
                const displayName = friend.displayName || friend.username;

                return (
                  <Link
                    key={friend.username}
                    href={`/polaris/user/${targetUsername}`}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border/10 bg-muted/20 hover:bg-muted/65 hover:border-border/30 transition-all duration-200 min-w-0"
                  >
                    <Avatar className="h-7 w-7 border shrink-0">
                      <AvatarImage
                        src={friend.avatarUrl ? getSafeImageUrl(friend.avatarUrl) : ""}
                        alt={targetUsername}
                      />
                      <AvatarFallback className="text-[10px] font-bold uppercase">
                        {targetUsername.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 leading-tight">
                      <span className="text-[11px] font-bold text-foreground truncate block">
                        {displayName}
                      </span>
                      <span className="text-[9px] text-muted-foreground truncate block">
                        @{targetUsername}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
