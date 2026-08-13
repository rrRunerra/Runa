"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export interface RrPrivacySettingsTabProps {
  /** Callback to close parent settings modal */
  onOpenChange: (open: boolean) => void;
}

/**
 * Component managing user profile, list, connection, and friend privacy settings.
 */
export const RrPrivacySettingsTab = ({
  onOpenChange,
}: RrPrivacySettingsTabProps): React.JSX.Element => {
  const { data: session } = useSession();
  const { t } = useTranslation();

  // Privacy states
  const [profilePrivate, setProfilePrivate] = useState<boolean>(false);
  const [animeListPrivate, setAnimeListPrivate] = useState<boolean>(false);
  const [mangaListPrivate, setMangaListPrivate] = useState<boolean>(false);
  const [tvListPrivate, setTvListPrivate] = useState<boolean>(false);
  const [movieListPrivate, setMovieListPrivate] = useState<boolean>(false);
  const [connectionsPrivate, setConnectionsPrivate] = useState<boolean>(false);
  const [friendsPrivate, setFriendsPrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    data: privacyData,
    isLoading: privacyLoading,
    mutate: refetchPrivacy,
  } = useSWR<any>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/users/me/privacy`, session.accessToken]
      : null,
    fetcher
  );

  useEffect(() => {
    if (privacyData) {
      setProfilePrivate(privacyData.profile || false);
      setAnimeListPrivate(privacyData.animeList || false);
      setMangaListPrivate(privacyData.mangaList || false);
      setTvListPrivate(privacyData.tvList || false);
      setMovieListPrivate(privacyData.movieList || false);
      setConnectionsPrivate(privacyData.connections || false);
      setFriendsPrivate(privacyData.friends || false);
    }
  }, [privacyData]);

  useEffect(() => {
    setLoading(privacyLoading);
  }, [privacyLoading]);

  const handleSaveSettings = async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error(t("privacy.mustBeLoggedIn"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/privacy`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            profile: profilePrivate,
            animeList: animeListPrivate,
            mangaList: mangaListPrivate,
            tvList: tvListPrivate,
            movieList: movieListPrivate,
            connections: connectionsPrivate,
            friends: friendsPrivate,
          }),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || t("privacy.failedSaveSettings"));
      }
      const updated = await res.json();
      refetchPrivacy(updated);

      toast.success(t("privacy.settingsSaved"));
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || t("privacy.failedSaveSettings"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="items-center justify-center py-12 flex flex-col gap-4">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">
          {t("privacy.loadingSettings")}
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("privacy.preferences")}</CardTitle>
          <CardDescription>
            {t("privacy.preferencesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-0 divide-y divide-border/40">
          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="profile-private"
              >
                {t("privacy.privateProfile")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("privacy.privateProfileDesc")}
              </p>
            </div>
            <Switch
              id="profile-private"
              checked={profilePrivate}
              onCheckedChange={setProfilePrivate}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="anime-private"
              >
                {t("privacy.privateAnimeList")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("privacy.privateAnimeListDesc")}
              </p>
            </div>
            <Switch
              id="anime-private"
              checked={animeListPrivate}
              onCheckedChange={setAnimeListPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="manga-private"
              >
                {t("privacy.privateMangaList")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("privacy.privateMangaListDesc")}
              </p>
            </div>
            <Switch
              id="manga-private"
              checked={mangaListPrivate}
              onCheckedChange={setMangaListPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="tv-private"
              >
                {t("privacy.privateTvList")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("privacy.privateTvListDesc")}
              </p>
            </div>
            <Switch
              id="tv-private"
              checked={tvListPrivate}
              onCheckedChange={setTvListPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="movie-private"
              >
                {t("privacy.privateMovieList")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("privacy.privateMovieListDesc")}
              </p>
            </div>
            <Switch
              id="movie-private"
              checked={movieListPrivate}
              onCheckedChange={setMovieListPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="connections-private"
              >
                {t("privacy.privateConnections")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("privacy.privateConnectionsDesc")}
              </p>
            </div>
            <Switch
              id="connections-private"
              checked={connectionsPrivate}
              onCheckedChange={setConnectionsPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>

          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="friends-private"
              >
                {t("privacy.privateFriends", t("polaris.user.friendPrivacyOption"))}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("privacy.privateFriendsDesc", "Hide your friends list from your public profile.")}
              </p>
            </div>
            <Switch
              id="friends-private"
              checked={friendsPrivate}
              onCheckedChange={setFriendsPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 pt-3 border-t border-border mt-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground rounded-xl h-9 cursor-pointer"
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer"
          >
            {isSubmitting ? t("saving") : t("saveChanges")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
