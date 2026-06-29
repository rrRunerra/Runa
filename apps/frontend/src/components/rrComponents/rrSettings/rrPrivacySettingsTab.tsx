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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface RrPrivacySettingsTabProps {
  onOpenChange: (open: boolean) => void;
}

export const RrPrivacySettingsTab = ({
  onOpenChange,
}: RrPrivacySettingsTabProps): React.JSX.Element => {
  const { data: session } = useSession();

  // Privacy states
  const [profilePrivate, setProfilePrivate] = useState<boolean>(false);
  const [animeListPrivate, setAnimeListPrivate] = useState<boolean>(false);
  const [mangaListPrivate, setMangaListPrivate] = useState<boolean>(false);
  const [tvListPrivate, setTvListPrivate] = useState<boolean>(false);
  const [movieListPrivate, setMovieListPrivate] = useState<boolean>(false);
  const [connectionsPrivate, setConnectionsPrivate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    data: privacyData,
    isLoading: privacyLoading,
    mutate: refetchPrivacy,
  } = useSWR<any>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/user/privacy`, session.accessToken]
      : null,
    fetcher,
  );

  useEffect(() => {
    if (privacyData) {
      setProfilePrivate(privacyData.profile || false);
      setAnimeListPrivate(privacyData.animeList || false);
      setMangaListPrivate(privacyData.mangaList || false);
      setTvListPrivate(privacyData.tvList || false);
      setMovieListPrivate(privacyData.movieList || false);
      setConnectionsPrivate(privacyData.connections || false);
    }
  }, [privacyData]);

  useEffect(() => {
    setLoading(privacyLoading);
  }, [privacyLoading]);

  const handleSaveSettings = async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to save settings.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/privacy`,
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
          }),
        },
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Failed to save privacy settings.");
      }
      const updated = await res.json();
      refetchPrivacy(updated);

      toast.success("Privacy settings saved successfully!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save privacy settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="items-center justify-center py-12 flex flex-col gap-4">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">
          Loading privacy settings...
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Preferences</CardTitle>
          <CardDescription>
            Manage who can view your profile and media lists.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-0 divide-y divide-border/40">
          {/* Profile Privacy Toggle */}
          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="profile-private"
              >
                Private Profile
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides your entire profile page, public details, and all list
                entries from other users.
              </p>
            </div>
            <Switch
              id="profile-private"
              checked={profilePrivate}
              onCheckedChange={setProfilePrivate}
              disabled={isSubmitting}
            />
          </div>

          {/* Anime List Privacy Toggle */}
          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="anime-private"
              >
                Private Anime List
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides your anime list entries from other users on your profile
                list page.
              </p>
            </div>
            <Switch
              id="anime-private"
              checked={animeListPrivate}
              onCheckedChange={setAnimeListPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>

          {/* Manga List Privacy Toggle */}
          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="manga-private"
              >
                Private Manga List
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides your manga list entries from other users on your profile
                list page.
              </p>
            </div>
            <Switch
              id="manga-private"
              checked={mangaListPrivate}
              onCheckedChange={setMangaListPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>

          {/* TV List Privacy Toggle */}
          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="tv-private"
              >
                Private TV Show List
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides your TV list entries from other users on your profile list
                page.
              </p>
            </div>
            <Switch
              id="tv-private"
              checked={tvListPrivate}
              onCheckedChange={setTvListPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>

          {/* Movie List Privacy Toggle */}
          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="movie-private"
              >
                Private Movie List
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides your movie list entries from other users on your profile
                list page.
              </p>
            </div>
            <Switch
              id="movie-private"
              checked={movieListPrivate}
              onCheckedChange={setMovieListPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>

          {/* Connections Privacy Toggle */}
          <div className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-0.5 pr-8 text-left">
              <Label
                className="text-sm font-medium text-foreground cursor-pointer"
                htmlFor="connections-private"
              >
                Private Connections
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides all of your linked third-party integrations/connections
                from your public profile page.
              </p>
            </div>
            <Switch
              id="connections-private"
              checked={connectionsPrivate}
              onCheckedChange={setConnectionsPrivate}
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
            Cancel
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-5 shadow-lg text-xs sm:text-sm h-9 cursor-pointer"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
