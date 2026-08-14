"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tv, Film, Save, RotateCcw } from "lucide-react";
import { RrPillNav } from "@/components/rrComponents/rrPillNav";
import { ArrCard } from "./rrArrCard";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

export interface RrArrSettingsTabProps {
  /** Callback to close parent settings modal */
  onOpenChange: (open: boolean) => void;
  /** Optional callback to render custom action buttons into parent modal footer */
  setFooterContent?: (node: React.ReactNode | null) => void;
}

const LIST_STATUS_OPTIONS = [
  { id: "PLANNING", labelKey: "arrSettings.statuses.planning" },
  { id: "WATCHING", labelKey: "arrSettings.statuses.watching" },
  { id: "COMPLETED", labelKey: "arrSettings.statuses.completed" },
  { id: "ON_HOLD", labelKey: "arrSettings.statuses.onHold" },
  { id: "DROPPED", labelKey: "arrSettings.statuses.dropped" },
];

const MOVIE_LIST_STATUS_OPTIONS = [
  { id: "PLANNING", labelKey: "arrSettings.statuses.planning" },
  { id: "COMPLETED", labelKey: "arrSettings.statuses.completed" },
  { id: "DROPPED", labelKey: "arrSettings.statuses.dropped" },
];

const TV_RELEASE_STATUS_OPTIONS = [
  { id: "RETURNING_SERIES", labelKey: "arrSettings.statuses.returningSeries" },
  { id: "ENDED", labelKey: "arrSettings.statuses.ended" },
  { id: "CANCELED", labelKey: "arrSettings.statuses.canceled" },
  { id: "IN_PRODUCTION", labelKey: "arrSettings.statuses.inProduction" },
  { id: "UPCOMING", labelKey: "arrSettings.statuses.upcoming" },
];

const ANIME_RELEASE_STATUS_OPTIONS = [
  { id: "FINISHED", labelKey: "arrSettings.statuses.finished" },
  { id: "RELEASING", labelKey: "arrSettings.statuses.releasing" },
  { id: "NOT_YET_RELEASED", labelKey: "arrSettings.statuses.notYetReleased" },
  { id: "CANCELLED", labelKey: "arrSettings.statuses.canceled" },
  { id: "HIATUS", labelKey: "arrSettings.statuses.hiatus" },
];

const MOVIE_RELEASE_STATUS_OPTIONS = [
  { id: "RELEASED", labelKey: "arrSettings.statuses.released" },
  { id: "IN_PRODUCTION", labelKey: "arrSettings.statuses.inProduction" },
  { id: "POST_PRODUCTION", labelKey: "arrSettings.statuses.postProduction" },
  { id: "RUMORED", labelKey: "arrSettings.statuses.rumored" },
  { id: "CANCELLED", labelKey: "arrSettings.statuses.canceled" },
];

const ANIME_FORMAT_OPTIONS = [
  { id: "TV", labelKey: "arrSettings.statuses.tv" },
  { id: "TV_SHORT", labelKey: "arrSettings.statuses.tvShort" },
  { id: "ONA", labelKey: "arrSettings.statuses.ona" },
  { id: "OVA", labelKey: "arrSettings.statuses.ova" },
  { id: "SPECIAL", labelKey: "arrSettings.statuses.special" },
];

const ANIME_MOVIE_FORMAT_OPTIONS = [
  { id: "MOVIE", labelKey: "arrSettings.statuses.movie" },
  { id: "SPECIAL", labelKey: "arrSettings.statuses.special" },
  { id: "OVA", labelKey: "arrSettings.statuses.ova" },
  { id: "ONA", labelKey: "arrSettings.statuses.ona" },
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
  const { t } = useTranslation();

  const username = session?.user?.username;
  const { data: userData, isLoading: userLoading } = useSWR(
    username
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/users/${username}`,
          session?.accessToken,
        ]
      : null,
    fetcher,
  );

  const [rawProfileSettings, setRawProfileSettings] = useState<
    Record<string, any>
  >({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
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

  const arrNavItems = useMemo(
    () => [
      { id: "sonarr" as const, label: t("arrSettings.sonarr", { defaultValue: "Sonarr" }) },
      { id: "radarr" as const, label: t("arrSettings.radarr", { defaultValue: "Radarr" }) },
    ],
    [t],
  );

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
    setter: (items: string[]) => void,
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
        errJson?.message || `Request failed with status ${res.status}`,
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
    toast.info(t("arrSettings.resetToast", { defaultValue: "Reset settings to default values" }));
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
        },
      );

      toast.success(t("arrSettings.saveSuccess", { defaultValue: "Arr Services settings saved successfully!" }));
    } catch (err: any) {
      toast.error(err.message || t("arrSettings.saveFailed", { defaultValue: "Failed to save Arr Services settings" }));
    } finally {
      setIsSaving(false);
    }
  };

  // Synchronize footer actions with parent settings modal
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
          className="text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground shrink-0 px-3 h-9 rounded-xl"
        >
          <RotateCcw className="size-3.5" />
          <span className="hidden sm:inline">
            {t("arrSettings.resetDefaults", { defaultValue: "Reset Defaults" })}
          </span>
          <span className="sm:hidden">
            {t("arrSettings.resetShort", { defaultValue: "Reset" })}
          </span>
        </Button>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="text-xs cursor-pointer px-3 h-9 rounded-xl"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="text-xs px-4 sm:px-5 gap-1.5 cursor-pointer h-9 rounded-xl font-semibold"
          >
            {isSaving ? (
              <>
                <Spinner className="size-3.5" />
                <span>{t("arrSettings.saving", { defaultValue: "Saving..." })}</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>{t("arrSettings.saveSettings", { defaultValue: "Save Settings" })}</span>
              </>
            )}
          </Button>
        </div>
      </div>,
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
    t,
  ]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center p-12 h-full">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 h-full text-left overflow-y-auto pr-1 scrollbar-thin">
      <div className="flex justify-end w-full">
        <RrPillNav
          items={arrNavItems}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as "sonarr" | "radarr")}
          layoutId="arrSettingsCategoryHighlight"
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "sonarr" ? (
          <motion.div
            key="sonarr-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-4 w-full"
          >
            <ArrCard
              title={t("arrSettings.sonarrTv", { defaultValue: "Sonarr TV" })}
              endpoint="/list/sonarr/tv"
              icon={Tv}
              monitoredId="sonarr-tv-monitored"
              monitored={sonarrTv.monitored}
              onMonitoredChange={(checked) =>
                setSonarrTv((prev) => ({ ...prev, monitored: checked }))
              }
              groups={[
                {
                  label: t("arrSettings.listStatuses", { defaultValue: "List Statuses" }),
                  options: LIST_STATUS_OPTIONS,
                  selectedValues: sonarrTv.listStatuses,
                  onToggle: (id) =>
                    toggleArrayItem(sonarrTv.listStatuses, id, (items) =>
                      setSonarrTv((prev) => ({ ...prev, listStatuses: items })),
                    ),
                },
                {
                  label: t("arrSettings.seriesReleaseStatuses", { defaultValue: "Series Release Statuses" }),
                  options: TV_RELEASE_STATUS_OPTIONS,
                  selectedValues: sonarrTv.tvStatuses,
                  onToggle: (id) =>
                    toggleArrayItem(sonarrTv.tvStatuses, id, (items) =>
                      setSonarrTv((prev) => ({ ...prev, tvStatuses: items })),
                    ),
                },
              ]}
            />

            <ArrCard
              title={t("arrSettings.sonarrAnime", { defaultValue: "Sonarr Anime" })}
              endpoint="/list/sonarr/anime"
              icon={Tv}
              monitoredId="sonarr-anime-monitored"
              monitored={sonarrAnime.monitored}
              onMonitoredChange={(checked) =>
                setSonarrAnime((prev) => ({ ...prev, monitored: checked }))
              }
              groups={[
                {
                  label: t("arrSettings.listStatuses", { defaultValue: "List Statuses" }),
                  options: LIST_STATUS_OPTIONS,
                  selectedValues: sonarrAnime.listStatuses,
                  onToggle: (id) =>
                    toggleArrayItem(sonarrAnime.listStatuses, id, (items) =>
                      setSonarrAnime((prev) => ({
                        ...prev,
                        listStatuses: items,
                      })),
                    ),
                },
                {
                  label: t("arrSettings.animeFormats", { defaultValue: "Anime Formats" }),
                  options: ANIME_FORMAT_OPTIONS,
                  selectedValues: sonarrAnime.animeFormats,
                  onToggle: (id) =>
                    toggleArrayItem(sonarrAnime.animeFormats, id, (items) =>
                      setSonarrAnime((prev) => ({
                        ...prev,
                        animeFormats: items,
                      })),
                    ),
                },
                {
                  label: t("arrSettings.animeReleaseStatuses", { defaultValue: "Anime Release Statuses" }),
                  options: ANIME_RELEASE_STATUS_OPTIONS,
                  selectedValues: sonarrAnime.animeStatuses,
                  onToggle: (id) =>
                    toggleArrayItem(sonarrAnime.animeStatuses, id, (items) =>
                      setSonarrAnime((prev) => ({
                        ...prev,
                        animeStatuses: items,
                      })),
                    ),
                },
              ]}
            />
          </motion.div>
        ) : (
          <motion.div
            key="radarr-tab"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-4 w-full"
          >
            <ArrCard
              title={t("arrSettings.radarrMovies", { defaultValue: "Radarr Movies" })}
              endpoint="/list/radarr/movie"
              icon={Film}
              monitoredId="radarr-movie-monitored"
              monitored={radarrMovie.monitored}
              onMonitoredChange={(checked) =>
                setRadarrMovie((prev) => ({ ...prev, monitored: checked }))
              }
              groups={[
                {
                  label: t("arrSettings.listStatuses", { defaultValue: "List Statuses" }),
                  options: MOVIE_LIST_STATUS_OPTIONS,
                  selectedValues: radarrMovie.listStatuses,
                  onToggle: (id) =>
                    toggleArrayItem(radarrMovie.listStatuses, id, (items) =>
                      setRadarrMovie((prev) => ({
                        ...prev,
                        listStatuses: items,
                      })),
                    ),
                },
                {
                  label: t("arrSettings.movieReleaseStatuses", { defaultValue: "Movie Release Statuses" }),
                  options: MOVIE_RELEASE_STATUS_OPTIONS,
                  selectedValues: radarrMovie.movieStatuses,
                  onToggle: (id) =>
                    toggleArrayItem(radarrMovie.movieStatuses, id, (items) =>
                      setRadarrMovie((prev) => ({
                        ...prev,
                        movieStatuses: items,
                      })),
                    ),
                },
              ]}
            />

            <ArrCard
              title={t("arrSettings.radarrAnimeMovies", { defaultValue: "Radarr Anime Movies" })}
              endpoint="/list/radarr/anime"
              icon={Film}
              monitoredId="radarr-anime-monitored"
              monitored={radarrAnime.monitored}
              onMonitoredChange={(checked) =>
                setRadarrAnime((prev) => ({ ...prev, monitored: checked }))
              }
              groups={[
                {
                  label: t("arrSettings.listStatuses", { defaultValue: "List Statuses" }),
                  options: LIST_STATUS_OPTIONS,
                  selectedValues: radarrAnime.listStatuses,
                  onToggle: (id) =>
                    toggleArrayItem(radarrAnime.listStatuses, id, (items) =>
                      setRadarrAnime((prev) => ({
                        ...prev,
                        listStatuses: items,
                      })),
                    ),
                },
                {
                  label: t("arrSettings.animeFormats", { defaultValue: "Anime Formats" }),
                  options: ANIME_MOVIE_FORMAT_OPTIONS,
                  selectedValues: radarrAnime.animeMovieFormats,
                  onToggle: (id) =>
                    toggleArrayItem(radarrAnime.animeMovieFormats, id, (items) =>
                      setRadarrAnime((prev) => ({
                        ...prev,
                        animeMovieFormats: items,
                      })),
                    ),
                },
                {
                  label: t("arrSettings.animeReleaseStatuses", { defaultValue: "Anime Release Statuses" }),
                  options: ANIME_RELEASE_STATUS_OPTIONS,
                  selectedValues: radarrAnime.animeStatuses,
                  onToggle: (id) =>
                    toggleArrayItem(radarrAnime.animeStatuses, id, (items) =>
                      setRadarrAnime((prev) => ({
                        ...prev,
                        animeStatuses: items,
                      })),
                    ),
                },
              ]}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
