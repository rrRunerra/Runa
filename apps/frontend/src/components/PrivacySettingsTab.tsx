"use client";

import type React from "react";
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface PrivacySettingsTabProps {
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
}

export interface PrivacySettingsTabRef {
  handleSave: () => void;
}

export const PrivacySettingsTab = forwardRef<PrivacySettingsTabRef, PrivacySettingsTabProps>(
  ({ onOpenChange, isSubmitting, setIsSubmitting }, ref) => {
    const { data: session } = useSession();

    // Privacy states
    const [profilePrivate, setProfilePrivate] = useState(false);
    const [animeListPrivate, setAnimeListPrivate] = useState(false);
    const [mangaListPrivate, setMangaListPrivate] = useState(false);
    const [tvListPrivate, setTvListPrivate] = useState(false);
    const [movieListPrivate, setMovieListPrivate] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (session?.accessToken) {
        setLoading(true);
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/privacy`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error("Failed to fetch privacy settings");
          })
          .then((data) => {
            setProfilePrivate(data.profile || false);
            setAnimeListPrivate(data.animeList || false);
            setMangaListPrivate(data.mangaList || false);
            setTvListPrivate(data.tvList || false);
            setMovieListPrivate(data.movieList || false);
          })
          .catch((err) => {
            console.error("Error fetching privacy settings:", err);
            toast.error("Failed to load privacy settings.");
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }, [session]);

    const handleSaveSettings = async () => {
      if (!session?.accessToken) {
        toast.error("You must be logged in to save settings.");
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/privacy`, {
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
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to save privacy settings.");
        }

        toast.success("Privacy settings saved successfully!");
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to save privacy settings.");
      } finally {
        setIsSubmitting(false);
      }
    };

    useImperativeHandle(ref, () => ({
      handleSave: handleSaveSettings,
    }));

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground">Loading privacy settings...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Privacy Preferences
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage who can view your profile and media lists.
          </p>
        </div>

        <div className="space-y-5 divide-y divide-border/40">
          {/* Profile Privacy Toggle */}
          <div className="flex items-center justify-between py-4">
            <div className="space-y-0.5 pr-8">
              <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="profile-private">
                Private Profile
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides your entire profile page, public details, and all list entries from other users.
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
            <div className="space-y-0.5 pr-8">
              <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="anime-private">
                Private Anime List
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides your anime list entries from other users on your profile list page.
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
            <div className="space-y-0.5 pr-8">
              <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="manga-private">
                Private Manga List
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides your manga list entries from other users on your profile list page.
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
            <div className="space-y-0.5 pr-8">
              <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="tv-private">
                Private TV Show List
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides your TV list entries from other users on your profile list page.
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
            <div className="space-y-0.5 pr-8">
              <Label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="movie-private">
                Private Movie List
              </Label>
              <p className="text-xs text-muted-foreground">
                Hides your movie list entries from other users on your profile list page.
              </p>
            </div>
            <Switch
              id="movie-private"
              checked={movieListPrivate}
              onCheckedChange={setMovieListPrivate}
              disabled={isSubmitting || profilePrivate}
            />
          </div>
        </div>
      </div>
    );
  }
);

PrivacySettingsTab.displayName = "PrivacySettingsTab";
