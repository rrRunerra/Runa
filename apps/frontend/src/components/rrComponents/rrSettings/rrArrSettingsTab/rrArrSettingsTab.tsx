"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tv, Film, Save, RotateCcw } from "lucide-react";
import { RrPillNav } from "@/components/rrComponents/rrPillNav";
import { ArrCard } from "./rrArrCard";

export interface RrArrSettingsTabProps {
  /** Callback to close parent settings modal */
  onOpenChange: (open: boolean) => void;
  /** Optional callback to render custom action buttons into parent modal footer */
  setFooterContent?: (node: React.ReactNode | null) => void;
}

const ARR_NAV_ITEMS = [
  { id: "sonarr" as const, label: "Sonarr" },
  { id: "radarr" as const, label: "Radarr" },
];

const LIST_STATUS_OPTIONS = [
  { id: "PLANNING", label: "Planning" },
  { id: "WATCHING", label: "Watching" },
  { id: "COMPLETED", label: "Completed" },
  { id: "ON_HOLD", label: "On Hold" },
  { id: "DROPPED", label: "Dropped" },
];

const MOVIE_LIST_STATUS_OPTIONS = [
  { id: "PLANNING", label: "Planning" },
  { id: "COMPLETED", label: "Completed" },
  { id: "DROPPED", label: "Dropped" },
];

const TV_RELEASE_STATUS_OPTIONS = [
  { id: "RETURNING_SERIES", label: "Returning Series" },
  { id: "ENDED", label: "Ended" },
  { id: "CANCELED", label: "Canceled" },
  { id: "IN_PRODUCTION", label: "In Production" },
  { id: "UPCOMING", label: "Upcoming" },
];

const ANIME_RELEASE_STATUS_OPTIONS = [
  { id: "FINISHED", label: "Finished" },
  { id: "RELEASING", label: "Releasing" },
  { id: "NOT_YET_RELEASED", label: "Not Yet Released" },
  { id: "CANCELLED", label: "Cancelled" },
  { id: "HIATUS", label: "Hiatus" },
];

const MOVIE_RELEASE_STATUS_OPTIONS = [
  { id: "RELEASED", label: "Released" },
  { id: "IN_PRODUCTION", label: "In Production" },
  { id: "POST_PRODUCTION", label: "Post Production" },
  { id: "RUMORED", label: "Rumored" },
  { id: "CANCELLED", label: "Cancelled" },
];

const ANIME_FORMAT_OPTIONS = [
  { id: "TV", label: "TV" },
  { id: "TV_SHORT", label: "TV Short" },
  { id: "ONA", label: "ONA" },
  { id: "OVA", label: "OVA" },
  { id: "SPECIAL", label: "Special" },
];

const ANIME_MOVIE_FORMAT_OPTIONS = [
  { id: "MOVIE", label: "Movie" },
  { id: "SPECIAL", label: "Special" },
  { id: "OVA", label: "OVA" },
  { id: "ONA", label: "ONA" },
];

interface ArrSectionState {
  monitored: boolean;
  listStatuses: string[];
  [key: string]: any;
}

/**
 * Component managing integration settings for Sonarr and Radarr media automation services.
 */
export function RrArrSettingsTab({
  onOpenChange,
  setFooterContent,
}: RrArrSettingsTabProps): React.JSX.Element {
  const { data: session } = useSession();

  const username = session?.user?.username;
  const { data: userData, isLoading: userLoading } = useSWR(
    username
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/users/${username}`,
          session?.accessToken,
        ]
      : null,
    fetcher
  );

  const [rawProfileSettings, setRawProfileSettings] = useState<
    Record<string, any>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"sonarr" | "radarr">("sonarr");

  // Endpoint states
  const [sonarrTv, setSonarrTv] = useState<ArrSectionState>({
    monitored: true,
    listStatuses: ["PLANNING", "WATCHING"],
    tvStatuses: ["RETURNING_SERIES", "ENDED"],
  });

  const [sonarrAnime, setSonarrAnime] = useState<ArrSectionState>({
    monitored: true,
    listStatuses: ["PLANNING", "WATCHING"],
    animeStatuses: ["FINISHED", "RELEASING"],
    animeFormats: ["TV", "TV_SHORT"],
  });

  const [radarrMovie, setRadarrMovie] = useState<ArrSectionState>({
    monitored: true,
    listStatuses: ["PLANNING"],
    movieStatuses: ["RELEASED"],
  });

  const [radarrAnime, setRadarrAnime] = useState<ArrSectionState>({
    monitored: true,
    listStatuses: ["PLANNING"],
    animeStatuses: ["FINISHED", "RELEASING"],
    animeMovieFormats: ["MOVIE"],
  });

  useEffect(() => {
    if (userData?.profileSettings) {
      const ps = userData.profileSettings;
      setRawProfileSettings(ps);
      const arr = ps.arrSettings;
      if (arr?.sonarrTv) {
        setSonarrTv({
          monitored: arr.sonarrTv.monitored ?? true,
          listStatuses: arr.sonarrTv.listStatuses ?? ["PLANNING", "WATCHING"],
          tvStatuses: arr.sonarrTv.tvStatuses ?? ["RETURNING_SERIES", "ENDED"],
        });
      }
      if (arr?.sonarrAnime) {
        setSonarrAnime({
          monitored: arr.sonarrAnime.monitored ?? true,
          listStatuses: arr.sonarrAnime.listStatuses ?? [
            "PLANNING",
            "WATCHING",
          ],
          animeStatuses: arr.sonarrAnime.animeStatuses ?? [
            "FINISHED",
            "RELEASING",
          ],
          animeFormats: arr.sonarrAnime.animeFormats ?? ["TV", "TV_SHORT"],
        });
      }
      if (arr?.radarrMovie) {
        setRadarrMovie({
          monitored: arr.radarrMovie.monitored ?? true,
          listStatuses: arr.radarrMovie.listStatuses ?? ["PLANNING"],
          movieStatuses: arr.radarrMovie.movieStatuses ?? ["RELEASED"],
        });
      }
      if (arr?.radarrAnime) {
        setRadarrAnime({
          monitored: arr.radarrAnime.monitored ?? true,
          listStatuses: arr.radarrAnime.listStatuses ?? ["PLANNING"],
          animeStatuses: arr.radarrAnime.animeStatuses ?? [
            "FINISHED",
            "RELEASING",
          ],
          animeMovieFormats: arr.radarrAnime.animeMovieFormats ?? ["MOVIE"],
        });
      }
    }
  }, [userData]);

  const toggleArrayItem = (
    current: string[],
    item: string,
    setter: (items: string[]) => void
  ) => {
    if (current.includes(item)) {
      if (current.length === 1) return;
      setter(current.filter((i) => i !== item));
    } else {
      setter([...current, item]);
    }
  };

  const apiMutate = async (url: string, method: string, body: any) => {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(
        errJson?.message || `Request failed with status ${res.status}`
      );
    }
    return res.json().catch(() => null);
  };

  const handleReset = () => {
    setSonarrTv({
      monitored: true,
      listStatuses: ["PLANNING", "WATCHING"],
      tvStatuses: ["RETURNING_SERIES", "ENDED"],
    });
    setSonarrAnime({
      monitored: true,
      listStatuses: ["PLANNING", "WATCHING"],
      animeStatuses: ["FINISHED", "RELEASING"],
      animeFormats: ["TV", "TV_SHORT"],
    });
    setRadarrMovie({
      monitored: true,
      listStatuses: ["PLANNING"],
      movieStatuses: ["RELEASED"],
    });
    setRadarrAnime({
      monitored: true,
      listStatuses: ["PLANNING"],
      animeStatuses: ["FINISHED", "RELEASING"],
      animeMovieFormats: ["MOVIE"],
    });
    toast.info("Reset settings to default values");
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const arrSettings = {
        sonarrTv,
        sonarrAnime,
        radarrMovie,
        radarrAnime,
      };

      await apiMutate(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/settings`,
        "PUT",
        {
          profileSettings: {
            ...rawProfileSettings,
            arrSettings,
          },
        }
      );

      toast.success("Arr Services settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save Arr Services settings");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!setFooterContent) return;

    setFooterContent(
      <div className="flex items-center justify-between w-full gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isSaving}
          className="text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground shrink-0 px-2.5 sm:px-3"
        >
          <RotateCcw className="size-3.5" />
          <span className="hidden sm:inline">Reset Defaults</span>
          <span className="sm:hidden">Reset</span>
        </Button>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-xs cursor-pointer px-2 sm:px-3"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="text-xs px-3 sm:px-5 gap-1.5 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Spinner className="size-3.5" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Save</span>
                <span className="hidden sm:inline"> Settings</span>
              </>
            )}
          </Button>
        </div>
      </div>
    );

    return () => {
      setFooterContent(null);
    };
  }, [
    isSaving,
    sonarrTv,
    sonarrAnime,
    radarrMovie,
    radarrAnime,
    setFooterContent,
    onOpenChange,
  ]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-2 h-full">
      <div className="flex justify-end w-full">
        <RrPillNav
          items={ARR_NAV_ITEMS}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id)}
          layoutId="arrSettingsCategoryHighlight"
        />
      </div>

      {activeTab === "sonarr" && (
        <div className="flex flex-col gap-5 w-full">
          <ArrCard
            title="Sonarr TV"
            endpoint="/list/sonarr/tv"
            description=""
            icon={Tv}
            monitoredId="sonarr-tv-monitored"
            monitored={sonarrTv.monitored}
            onMonitoredChange={(checked) =>
              setSonarrTv((prev) => ({ ...prev, monitored: checked }))
            }
            groups={[
              {
                label: "List Statuses",
                options: LIST_STATUS_OPTIONS,
                selectedValues: sonarrTv.listStatuses,
                onToggle: (id) =>
                  toggleArrayItem(sonarrTv.listStatuses, id, (items) =>
                    setSonarrTv((prev) => ({ ...prev, listStatuses: items }))
                  ),
              },
              {
                label: "Series Release Statuses",
                options: TV_RELEASE_STATUS_OPTIONS,
                selectedValues: sonarrTv.tvStatuses,
                onToggle: (id) =>
                  toggleArrayItem(sonarrTv.tvStatuses, id, (items) =>
                    setSonarrTv((prev) => ({ ...prev, tvStatuses: items }))
                  ),
              },
            ]}
          />

          <ArrCard
            title="Sonarr Anime"
            endpoint="/list/sonarr/anime"
            description=""
            icon={Tv}
            monitoredId="sonarr-anime-monitored"
            monitored={sonarrAnime.monitored}
            onMonitoredChange={(checked) =>
              setSonarrAnime((prev) => ({ ...prev, monitored: checked }))
            }
            groups={[
              {
                label: "List Statuses",
                options: LIST_STATUS_OPTIONS,
                selectedValues: sonarrAnime.listStatuses,
                onToggle: (id) =>
                  toggleArrayItem(sonarrAnime.listStatuses, id, (items) =>
                    setSonarrAnime((prev) => ({
                      ...prev,
                      listStatuses: items,
                    }))
                  ),
              },
              {
                label: "Anime Formats",
                options: ANIME_FORMAT_OPTIONS,
                selectedValues: sonarrAnime.animeFormats,
                onToggle: (id) =>
                  toggleArrayItem(sonarrAnime.animeFormats, id, (items) =>
                    setSonarrAnime((prev) => ({
                      ...prev,
                      animeFormats: items,
                    }))
                  ),
              },
              {
                label: "Anime Release Statuses",
                options: ANIME_RELEASE_STATUS_OPTIONS,
                selectedValues: sonarrAnime.animeStatuses,
                onToggle: (id) =>
                  toggleArrayItem(sonarrAnime.animeStatuses, id, (items) =>
                    setSonarrAnime((prev) => ({
                      ...prev,
                      animeStatuses: items,
                    }))
                  ),
              },
            ]}
          />
        </div>
      )}

      {activeTab === "radarr" && (
        <div className="flex flex-col gap-5 w-full">
          <ArrCard
            title="Radarr Movies"
            endpoint="/list/radarr/movie"
            description=""
            icon={Film}
            monitoredId="radarr-movie-monitored"
            monitored={radarrMovie.monitored}
            onMonitoredChange={(checked) =>
              setRadarrMovie((prev) => ({ ...prev, monitored: checked }))
            }
            groups={[
              {
                label: "List Statuses",
                options: MOVIE_LIST_STATUS_OPTIONS,
                selectedValues: radarrMovie.listStatuses,
                onToggle: (id) =>
                  toggleArrayItem(radarrMovie.listStatuses, id, (items) =>
                    setRadarrMovie((prev) => ({
                      ...prev,
                      listStatuses: items,
                    }))
                  ),
              },
              {
                label: "Movie Release Statuses",
                options: MOVIE_RELEASE_STATUS_OPTIONS,
                selectedValues: radarrMovie.movieStatuses,
                onToggle: (id) =>
                  toggleArrayItem(radarrMovie.movieStatuses, id, (items) =>
                    setRadarrMovie((prev) => ({
                      ...prev,
                      movieStatuses: items,
                    }))
                  ),
              },
            ]}
          />

          <ArrCard
            title="Radarr Anime Movies"
            endpoint="/list/radarr/anime"
            description=""
            icon={Film}
            monitoredId="radarr-anime-monitored"
            monitored={radarrAnime.monitored}
            onMonitoredChange={(checked) =>
              setRadarrAnime((prev) => ({ ...prev, monitored: checked }))
            }
            groups={[
              {
                label: "List Statuses",
                options: LIST_STATUS_OPTIONS,
                selectedValues: radarrAnime.listStatuses,
                onToggle: (id) =>
                  toggleArrayItem(radarrAnime.listStatuses, id, (items) =>
                    setRadarrAnime((prev) => ({
                      ...prev,
                      listStatuses: items,
                    }))
                  ),
              },
              {
                label: "Anime Formats",
                options: ANIME_MOVIE_FORMAT_OPTIONS,
                selectedValues: radarrAnime.animeMovieFormats,
                onToggle: (id) =>
                  toggleArrayItem(radarrAnime.animeMovieFormats, id, (items) =>
                    setRadarrAnime((prev) => ({
                      ...prev,
                      animeMovieFormats: items,
                    }))
                  ),
              },
              {
                label: "Anime Release Statuses",
                options: ANIME_RELEASE_STATUS_OPTIONS,
                selectedValues: radarrAnime.animeStatuses,
                onToggle: (id) =>
                  toggleArrayItem(radarrAnime.animeStatuses, id, (items) =>
                    setRadarrAnime((prev) => ({
                      ...prev,
                      animeStatuses: items,
                    }))
                  ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
