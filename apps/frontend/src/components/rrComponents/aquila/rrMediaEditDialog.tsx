"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  BASE_CONNECTION_PROVIDERS,
  ConnectionCapability,
} from "@/lib/providers";

// Import extracted sub-components
import { RrMediaEditDialogHeader } from "./media-edit/RrMediaEditDialogHeader";
import { RrMediaEditGeneralFields } from "./media-edit/RrMediaEditGeneralFields";
import { RrMediaEditTvEpisodes } from "./media-edit/RrMediaEditTvEpisodes";
import { RrMediaEditConnections } from "./media-edit/RrMediaEditConnections";
import { RrMediaConnectionSearchModal } from "./media-edit/RrMediaConnectionSearchModal";

interface MediaTitle {
  romaji: string;
  english?: string;
}

interface MediaCoverImage {
  large: string;
}

interface RrMediaEditDialogMedia {
  id: string;
  type: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  title: MediaTitle;
  coverImage: MediaCoverImage;
  bannerImage?: string;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  seasons?: any[];
}

export interface RrMediaEditDialogProps {
  media: RrMediaEditDialogMedia;
  hasListEntry: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function RrMediaEditDialog({
  media: initialMedia,
  hasListEntry: initialHasListEntry,
  onSaved,
  onDeleted,
  open,
  onOpenChange,
  trigger,
}: RrMediaEditDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const { data: session } = useSession();

  // SWR queries replacing sequential imperative fetching
  const { data: mediaDetails } = useSWR<any>(
    open
      ? `${process.env.NEXT_PUBLIC_API_URL}/${initialMedia.type}/${initialMedia.id}`
      : null,
    fetcher,
    { shouldRetryOnError: false },
  );

  const { data: favoriteData, mutate: mutateFavorite } = useSWR<any>(
    open && session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/${initialMedia.type}/${initialMedia.id}/status`,
          session.accessToken,
        ]
      : null,
    fetcher,
    { shouldRetryOnError: false },
  );

  const capParam =
    initialMedia.type === "tv"
      ? "TV_SHOWS"
      : initialMedia.type === "movie"
        ? "MOVIES"
        : initialMedia.type.toUpperCase();

  const { data: userConnectionsData } = useSWR<any[]>(
    open && session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/connections?capabilities=${capParam}`,
          session.accessToken,
        ]
      : null,
    fetcher,
  );

  const { data: listEntryData, mutate: mutateListEntry } = useSWR<any>(
    open && session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/list/${initialMedia.type}/entry/${initialMedia.id}`,
          session.accessToken,
        ]
      : null,
    fetcher,
    { shouldRetryOnError: false },
  );

  const media = useMemo(() => {
    const raw = mediaDetails
      ? { ...mediaDetails, type: initialMedia.type }
      : initialMedia;

    const title =
      typeof raw.title === "object" && raw.title !== null
        ? {
            english:
              raw.title.english ||
              raw.titlePrimary ||
              raw.titleEnglish ||
              raw.titleString ||
              raw.title.romaji ||
              "",
            romaji:
              raw.title.romaji ||
              raw.titleSecondary ||
              raw.titleRomaji ||
              raw.titleString ||
              "",
            native: (raw.title as any).native || raw.titleNative || "",
          }
        : {
            english:
              raw.titlePrimary ||
              raw.titleEnglish ||
              raw.titleSecondary ||
              raw.titleString ||
              "",
            romaji:
              raw.titleSecondary ||
              raw.titleRomaji ||
              raw.titlePrimary ||
              raw.titleString ||
              "",
            native: raw.titleNative || "",
          };

    const coverImage =
      typeof raw.coverImage === "object" && raw.coverImage !== null
        ? raw.coverImage
        : {
            large:
              typeof raw.coverImage === "string"
                ? raw.coverImage
                : raw.coverImageLarge || "",
          };

    // Group flat episodes into their seasons so RrMediaEditTvEpisodes can render them.
    // The parent may have already done this (initialMedia.seasons[].episodes populated),
    // or we may need to do it ourselves from the raw API response.
    let seasons = raw.seasons;
    if (
      Array.isArray(initialMedia.seasons) &&
      initialMedia.seasons.length > 0 &&
      Array.isArray((initialMedia.seasons[0] as any)?.episodes)
    ) {
      // Parent already pre-processed seasons with nested episodes — use them.
      seasons = initialMedia.seasons;
    } else if (Array.isArray(raw.seasons) && Array.isArray(raw.episodes)) {
      // Group the flat episodes into each season ourselves.
      seasons = raw.seasons.map((s: any) => ({
        ...s,
        // normalise season number field — API uses seasonNumber, legacy used number
        number: s.seasonNumber ?? s.number,
        name: s.titlePrimary ?? s.name,
        image: s.posterImage ?? s.image,
        episodes: raw.episodes
          .filter((ep: any) => ep.seasonNumber === (s.seasonNumber ?? s.number))
          .map((ep: any) => ({
            id: ep.id,
            number: ep.episodeNumber ?? ep.number,
            name: ep.titlePrimary ?? ep.name,
            overview: ep.description ?? ep.overview,
            image: ep.thumbnail ?? ep.image,
            airDate: ep.airDate,
          })),
      }));
    }

    return {
      ...raw,
      title,
      coverImage,
      seasons,
    };
  }, [mediaDetails, initialMedia]);

  const mediaType = media.type;
  const scoreMax = mediaType === "game" ? 100 : 10;

  const [hasListEntry, setHasListEntry] =
    useState<boolean>(initialHasListEntry);
  const [listStatus, setListStatus] = useState<string>("PLANNING");
  const [score, setScore] = useState<string>("");
  const [progress, setProgress] = useState<string>("");
  const [volumes, setVolumes] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [finishDate, setFinishDate] = useState<Date | undefined>();
  const [rewatches, setRewatches] = useState<string>("0");

  const [watchedEpisodes, setWatchedEpisodes] = useState<
    { seasonNum: number; episodeNum: number }[]
  >([]);
  const [activeTab, setActiveTab] = useState<string>("general");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [initialFavorited, setInitialFavorited] = useState<boolean>(false);
  const [isSubmittingFavorite, setIsSubmittingFavorite] =
    useState<boolean>(false);
  const [expandedSeasonNum, setExpandedSeasonNum] = useState<number | null>(
    null,
  );

  const [saveError, setSaveError] = useState<string | null>(null);

  // Connection config state
  const [updateConnection, setUpdateConnection] = useState<boolean>(false);
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [activeSearchProvider, setActiveSearchProvider] = useState<
    string | null
  >(null);
  const [isConnectionSearchOpen, setIsConnectionSearchOpen] =
    useState<boolean>(false);

  // Sync SWR queries to local form state
  useEffect(() => {
    if (favoriteData) {
      setIsFavorited(favoriteData.favorited);
      setInitialFavorited(favoriteData.favorited);
    }
  }, [favoriteData]);

  // Reset form state only when the dialog closes — NOT when listEntryData is
  // transiently undefined while SWR is loading. Separating reset from population
  // prevents a race condition where the loading state wipes dates before they arrive.
  useEffect(() => {
    if (!open) {
      setListStatus("PLANNING");
      setScore("");
      setProgress("");
      setVolumes("");
      setNotes("");
      setStartDate(undefined);
      setFinishDate(undefined);
      setRewatches("0");
      setWatchedEpisodes([]);
      setConnections({});
      setUpdateConnection(false);
      setHasListEntry(false);
    }
  }, [open]);

  // Populate form state from the fetched list entry whenever it becomes available.
  useEffect(() => {
    if (!listEntryData) return;

    setListStatus(listEntryData.status || "PLANNING");
    setScore(listEntryData.score ? listEntryData.score.toString() : "");

    if (mediaType === "manga" || mediaType === "book") {
      const chapterVal =
        listEntryData.chaptersProgress ??
        listEntryData.progressChapters ??
        listEntryData.chapters ??
        listEntryData.progress;
      const volumeVal =
        listEntryData.volumesProgress ??
        listEntryData.progressVolumes ??
        listEntryData.volumes;

      setProgress(
        chapterVal !== undefined && chapterVal !== null
          ? chapterVal.toString()
          : "",
      );
      setVolumes(
        volumeVal !== undefined && volumeVal !== null
          ? volumeVal.toString()
          : "",
      );
      setRewatches(
        listEntryData.reread !== undefined && listEntryData.reread !== null
          ? listEntryData.reread.toString()
          : "0",
      );
    } else if (mediaType === "game") {
      setProgress(
        listEntryData.progress !== undefined && listEntryData.progress !== null
          ? listEntryData.progress.toString()
          : "",
      );
    } else {
      setProgress(
        listEntryData.progress !== undefined && listEntryData.progress !== null
          ? listEntryData.progress.toString()
          : "",
      );
      setRewatches(
        listEntryData.rewatched !== undefined &&
          listEntryData.rewatched !== null
          ? listEntryData.rewatched.toString()
          : "0",
      );
    }

    setNotes(listEntryData.notes || "");
    setStartDate(
      listEntryData.startDate ? new Date(listEntryData.startDate) : undefined,
    );
    setFinishDate(
      listEntryData.endDate ? new Date(listEntryData.endDate) : undefined,
    );

    if (mediaType === "tv") {
      setWatchedEpisodes(listEntryData.watchedEpisodes || []);
    }

    // Map connection override details
    const rawConnections = listEntryData.connections || {};
    const loadedConnections: Record<string, any> = {};
    for (const key of Object.keys(rawConnections)) {
      const conn = rawConnections[key];
      const cleanKey = key.toLowerCase();
      if (conn && typeof conn === "object") {
        let connProgress: string | undefined = undefined;
        const currentProgressNum =
          Number(
            mediaType === "manga" || mediaType === "book"
              ? (listEntryData.chaptersProgress ??
                  listEntryData.progressChapters ??
                  listEntryData.chapters ??
                  listEntryData.progress)
              : listEntryData.progress,
          ) || 0;

        if (conn.progressOffset !== undefined) {
          connProgress = (
            currentProgressNum + Number(conn.progressOffset)
          ).toString();
        } else if (conn.chaptersOffset !== undefined) {
          connProgress = (
            currentProgressNum + Number(conn.chaptersOffset)
          ).toString();
        } else if (conn.progress !== undefined) {
          connProgress = conn.progress.toString();
        } else if (conn.chapters !== undefined) {
          connProgress = conn.chapters.toString();
        }

        let connVolumes: string | undefined = undefined;
        const currentVolumesNum =
          Number(
            listEntryData.volumesProgress ??
              listEntryData.progressVolumes ??
              listEntryData.volumes,
          ) || 0;

        if (conn.volumesOffset !== undefined) {
          connVolumes = (
            currentVolumesNum + Number(conn.volumesOffset)
          ).toString();
        } else if (conn.volumes !== undefined) {
          connVolumes = conn.volumes.toString();
        }

        loadedConnections[cleanKey] = {
          id: conn.id,
          status: conn.status,
          progress: connProgress,
          volumes: connVolumes,
          startDate: conn.startDate
            ? new Date(conn.startDate * 1000)
            : undefined,
          endDate: conn.endDate ? new Date(conn.endDate * 1000) : undefined,
        };
      } else {
        loadedConnections[cleanKey] = conn;
      }
    }
    setConnections(loadedConnections);
    setUpdateConnection(Object.keys(loadedConnections).length > 0);
    setHasListEntry(true);
  }, [listEntryData, mediaType]);

  const userConnections = Array.isArray(userConnectionsData)
    ? userConnectionsData.map((c: any) => c.provider.toLowerCase())
    : [];

  const handleScoreChange = (val: string): void => {
    if (val === "") {
      setScore("");
      return;
    }
    let num = Number(val);
    if (isNaN(num)) return;
    if (num > scoreMax) {
      num = scoreMax;
    }
    if (num < 0) {
      num = 0;
    }
    setScore(num.toString());
  };

  const triggerAutoCompleteDates = (targetStatus: string): void => {
    if (targetStatus === "COMPLETED") {
      const today = new Date();
      if (!finishDate) setFinishDate(today);
      if (!startDate) setStartDate(today);
    } else if (
      (targetStatus === "WATCHING" ||
        targetStatus === "READING" ||
        targetStatus === "PLAYING") &&
      !startDate
    ) {
      setStartDate(new Date());
    }
  };

  const handleProgressChange = (val: string): void => {
    setProgress(val);
    const num = Number(val);
    if (isNaN(num)) return;

    let maxVal: number | undefined = undefined;
    if (mediaType === "anime") maxVal = media.episodes;
    else if (mediaType === "manga" || mediaType === "book")
      maxVal = media.chapters;

    if (maxVal && num >= maxVal) {
      setListStatus("COMPLETED");
      triggerAutoCompleteDates("COMPLETED");
    }
  };

  const checkAllTvEpisodesWatched = (
    epsList: { seasonNum: number; episodeNum: number }[],
  ): boolean => {
    if (!media.seasons || media.seasons.length === 0) return false;
    const totalEps = media.seasons.reduce(
      (acc: number, season: any) => acc + season.episodeCount,
      0,
    );
    return totalEps > 0 && epsList.length >= totalEps;
  };

  const handleToggleEpisode = async (
    seasonNum: number,
    episodeNum: number,
  ): Promise<void> => {
    if (!session?.accessToken) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${media.id}/episode`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ seasonNum, episodeNum }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.watched) {
          const next = [...watchedEpisodes, { seasonNum, episodeNum }];
          setWatchedEpisodes(next);
          if (checkAllTvEpisodesWatched(next)) {
            setListStatus("COMPLETED");
            triggerAutoCompleteDates("COMPLETED");
          }
        } else {
          setWatchedEpisodes((prev) =>
            prev.filter(
              (ep) =>
                !(ep.seasonNum === seasonNum && ep.episodeNum === episodeNum),
            ),
          );
        }
        mutateListEntry();
      }
    } catch {
      toast.error(t("aquila.failedToUpdateEpisode"));
    }
  };

  const handleToggleSeason = async (
    seasonNum: number,
    checked: boolean,
  ): Promise<void> => {
    if (!session?.accessToken) return;
    const season = media.seasons?.find((s: any) => s.number === seasonNum);
    if (!season) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/tv/entry/${media.id}/season`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            seasonNum,
            episodes: season.episodes,
            watched: checked,
          }),
        },
      );
      if (res.ok) {
        if (checked) {
          const next = [
            ...watchedEpisodes.filter((ep) => ep.seasonNum !== seasonNum),
            ...season.episodes.map((ep: any) => ({
              seasonNum,
              episodeNum:
                typeof ep === "number"
                  ? ep
                  : (ep.number ?? ep.episodeNum ?? ep.episode_number),
            })),
          ];
          setWatchedEpisodes(next);
          if (checkAllTvEpisodesWatched(next)) {
            setListStatus("COMPLETED");
            triggerAutoCompleteDates("COMPLETED");
          }
        } else {
          setWatchedEpisodes((prev) =>
            prev.filter((ep) => ep.seasonNum !== seasonNum),
          );
        }
        toast.success(
          checked
            ? t("aquila.seasonMarkedWatched")
            : t("aquila.seasonMarkedUnwatched"),
        );
        mutateListEntry();
      }
    } catch {
      toast.error(t("aquila.failedToUpdateSeason"));
    }
  };

  const handleToggleFavorite = async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error(t("aquila.loginToFavorite"));
      return;
    }

    if (!hasListEntry) {
      setIsFavorited((prev) => !prev);
      toast.success(
        isFavorited
          ? t("aquila.removedFromFavoritesLocally")
          : t("aquila.addedToFavoritesLocally"),
      );
      return;
    }

    setIsSubmittingFavorite(true);
    const upperType = mediaType.toUpperCase();
    try {
      if (isFavorited) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/favorites/${mediaType}/${media.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          },
        );
        if (res.ok) {
          setIsFavorited(false);
          setInitialFavorited(false);
          toast.success(t("aquila.removedFromFavorites"));
          mutateFavorite();
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.message || t("aquila.failedToRemoveFavorite"));
        }
      } else {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/favorites`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({
              type: upperType,
              targetId: media.id.toString(),
            }),
          },
        );
        if (res.ok) {
          setIsFavorited(true);
          setInitialFavorited(true);
          toast.success(t("aquila.addedToFavorites"));
          mutateFavorite();
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.message || t("aquila.failedToAddFavorite"));
        }
      }
    } catch {
      toast.error(t("aquila.failedToToggleFavorite"));
    } finally {
      setIsSubmittingFavorite(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error(t("aquila.loginToSave"));
      return;
    }

    setIsSubmitting(true);
    setSaveError(null);

    const basePayload: Record<string, any> = {
      status: listStatus,
      startDate: startDate ? Math.floor(startDate.getTime() / 1000) : null,
      endDate: finishDate ? Math.floor(finishDate.getTime() / 1000) : null,
      score: score ? Number(score) : undefined,
      notes: notes || undefined,
      updateConnection,
      connections: Object.entries(connections).reduce(
        (acc, [key, val]) => {
          const uppercaseKey = key.toUpperCase();
          if (val && typeof val === "object") {
            const progressVal = Number(progress) || 0;
            const volumesVal = Number(volumes) || 0;

            acc[uppercaseKey] = {
              id: val.id,
              status: val.status,
              progressOffset:
                val.progress !== undefined && val.progress !== ""
                  ? Number(val.progress) - progressVal
                  : undefined,
              chaptersOffset:
                val.progress !== undefined && val.progress !== ""
                  ? Number(val.progress) - progressVal
                  : undefined,
              volumesOffset:
                val.volumes !== undefined && val.volumes !== ""
                  ? Number(val.volumes) - volumesVal
                  : undefined,
              startDate: val.startDate
                ? Math.floor(val.startDate.getTime() / 1000)
                : undefined,
              endDate: val.endDate
                ? Math.floor(val.endDate.getTime() / 1000)
                : undefined,
            };
          } else {
            acc[uppercaseKey] = val;
          }
          return acc;
        },
        {} as Record<string, any>,
      ),
    };

    if (mediaType === "anime") {
      basePayload.animeId = Number(media.id);
      basePayload.progress = progress ? Number(progress) : undefined;
      basePayload.rewatched = rewatches ? Number(rewatches) : undefined;
    } else if (mediaType === "manga") {
      basePayload.mangaId = Number(media.id);
      basePayload.chapters = progress ? Number(progress) : undefined;
      basePayload.volumes = volumes ? Number(volumes) : undefined;
      basePayload.reread = rewatches ? Number(rewatches) : undefined;
    } else if (mediaType === "tv") {
      basePayload.tvId = Number(media.id);
      basePayload.rewatched = rewatches ? Number(rewatches) : undefined;
      basePayload.episodes = watchedEpisodes;
    } else if (mediaType === "movie") {
      basePayload.movieId = Number(media.id);
      basePayload.rewatched = rewatches ? Number(rewatches) : undefined;
    } else if (mediaType === "game") {
      basePayload.gameId = Number(media.id);
      basePayload.progress = progress ? Number(progress) : undefined;
    } else if (mediaType === "book") {
      basePayload.bookId = Number(media.id);
      basePayload.chapters = progress ? Number(progress) : undefined;
      basePayload.volumes = volumes ? Number(volumes) : undefined;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/${mediaType}/entry/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify(basePayload),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setHasListEntry(true);

        if (!hasListEntry && isFavorited && !initialFavorited) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favorites`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.accessToken}`,
              },
              body: JSON.stringify({
                type: mediaType.toUpperCase(),
                targetId: media.id.toString(),
              }),
            });
            setInitialFavorited(true);
            mutateFavorite();
          } catch (favErr) {
            console.error("Failed to sync favorite on post-save", favErr);
          }
        }

        toast.success(t("aquila.savedSuccessfully"));
        onOpenChange(false);
        onSaved?.();
        mutateListEntry();
      } else {
        const errorMsg =
          data.message || data.error?.message || t("aquila.failedToSave");
        setSaveError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || t("aquila.unexpectedSaveError"));
      toast.error(t("aquila.failedToSave"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setSaveError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/list/${mediaType}/entry/${media.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        toast.success(t("aquila.removedFromList"));
        onOpenChange(false);
        setHasListEntry(false);
        onDeleted?.();
        mutateListEntry();
      } else {
        const errorMsg =
          data.message || data.error?.message || t("aquila.failedToRemove");
        setSaveError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || t("aquila.unexpectedRemoveError"));
      toast.error(t("aquila.failedToRemove"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSearchModal = (provider: string): void => {
    setActiveSearchProvider(provider);
    setIsConnectionSearchOpen(true);
  };

  const filteredConnectionProviders = useMemo(() => {
    const mediaTypeToCapability: Record<string, ConnectionCapability | null> = {
      anime: ConnectionCapability.ANIME,
      manga: ConnectionCapability.MANGA,
      tv: ConnectionCapability.TV_SHOWS,
      movie: ConnectionCapability.MOVIES,
      game: ConnectionCapability.GAME,
      book: ConnectionCapability.BOOKS,
    };
    const requiredCapability = mediaTypeToCapability[mediaType] ?? null;
    return requiredCapability
      ? BASE_CONNECTION_PROVIDERS.filter((p) =>
          p.capabilities.includes(requiredCapability),
        )
      : BASE_CONNECTION_PROVIDERS;
  }, [mediaType]);

  const handleSelectSearchResult = (
    provider: string,
    resultId: string,
  ): void => {
    setConnections((prev) => ({
      ...prev,
      [provider]: { id: resultId },
    }));
    setIsConnectionSearchOpen(false);
  };

  const getFormLayout = (): React.JSX.Element => {
    const isTV = mediaType === "tv";

    const generalFields = (
      <RrMediaEditGeneralFields
        mediaType={mediaType}
        scoreMax={scoreMax}
        episodes={media.episodeCount}
        chapters={media.chapters}
        volumesMax={media.volumes}
        listStatus={listStatus}
        onStatusChange={(val) => {
          setListStatus(val);
          triggerAutoCompleteDates(val);

          if (val === "COMPLETED" && isTV && media.seasons) {
            const allEps: { seasonNum: number; episodeNum: number }[] = [];
            for (const s of media.seasons) {
              for (const ep of s.episodes) {
                allEps.push({ seasonNum: s.number, episodeNum: ep.number });
              }
            }
            setWatchedEpisodes(allEps);
          }

          if (val === "COMPLETED") {
            if (mediaType === "anime" && media.episodeCount && !progress) {
              setProgress(media.episodeCount.toString());
            } else if (
              (mediaType === "manga" || mediaType === "book") &&
              media.chapters &&
              !progress
            ) {
              setProgress(media.chapters.toString());
            }
          }
        }}
        score={score}
        onScoreChange={handleScoreChange}
        rewatches={rewatches}
        onRewatchesChange={setRewatches}
        progress={progress}
        onProgressChange={handleProgressChange}
        volumes={volumes}
        onVolumesChange={setVolumes}
        startDate={startDate}
        onStartDateChange={setStartDate}
        finishDate={finishDate}
        onFinishDateChange={setFinishDate}
        notes={notes}
        onNotesChange={setNotes}
      />
    );

    const connectionsSection = (
      <RrMediaEditConnections
        mediaType={mediaType}
        updateConnection={updateConnection}
        onUpdateConnectionChange={setUpdateConnection}
        connections={connections}
        onConnectionsChange={setConnections}
        userConnections={userConnections}
        connectionProviders={filteredConnectionProviders}
        onOpenSearchModal={handleOpenSearchModal}
        listStatus={listStatus}
        progress={progress}
        volumes={volumes}
        startDate={startDate}
        finishDate={finishDate}
      />
    );

    if (isTV) {
      return (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full flex flex-col gap-4"
        >
          <TabsList className="bg-muted/60 backdrop-blur-xs p-1 rounded-xl w-full sm:w-fit grid grid-cols-2 border border-border/60 shadow-2xs">
            <TabsTrigger
              value="general"
              className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs"
            >
              {t("aquila.generalTab")}
            </TabsTrigger>
            <TabsTrigger
              value="episodes"
              className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs"
            >
              {t("aquila.episodesTab", {
                watched: watchedEpisodes.length,
                total:
                  media.seasons?.reduce(
                    (acc: any, s: { episodeCount: any }) =>
                      acc + s.episodeCount,
                    0,
                  ) || 0,
              })}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="general"
            className="mt-0 outline-hidden flex flex-col gap-4"
          >
            {generalFields}
            {connectionsSection}
          </TabsContent>
          <TabsContent value="episodes" className="mt-0 outline-hidden">
            <RrMediaEditTvEpisodes
              seasons={media.seasons}
              watchedEpisodes={watchedEpisodes}
              expandedSeasonNum={expandedSeasonNum}
              onExpandedSeasonNumChange={setExpandedSeasonNum}
              onToggleEpisode={handleToggleEpisode}
              onToggleSeason={handleToggleSeason}
              listStatus={listStatus}
              hasListEntry={hasListEntry}
            />
          </TabsContent>
        </Tabs>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {generalFields}
        {connectionsSection}
      </div>
    );
  };

  const handleOpenChange = (v: boolean): void => {
    onOpenChange(v);
    if (!v) {
      setSaveError(null);
    }
  };

  const dialogContent = (
    <DialogContent className="flex flex-col gap-0 max-h-[95dvh] sm:max-h-[90dvh] sm:max-w-180 p-0 overflow-hidden bg-background/90 backdrop-blur-2xl border border-border/60 text-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground shadow-2xl rounded-3xl">
      <DialogTitle className="sr-only">
        {hasListEntry
          ? t("aquila.editEntry", { type: mediaType })
          : t("aquila.addToList", { type: mediaType })}
      </DialogTitle>
      <DialogDescription className="sr-only">
        {t("aquila.editDialogDescription")}
      </DialogDescription>

      <RrMediaEditDialogHeader
        bannerImage={media.bannerImage}
        coverImageLarge={media.coverImage?.large ?? ""}
        title={
          media.title?.english ||
          media.title?.romaji ||
          media.titlePrimary ||
          media.titleSecondary ||
          ""
        }
        mediaType={mediaType}
        isFavorited={isFavorited}
        isSubmittingFavorite={isSubmittingFavorite}
        isSubmitting={isSubmitting}
        onToggleFavorite={handleToggleFavorite}
        onSave={handleSave}
      />

      <div className="p-5 sm:p-6 pt-4 bg-transparent flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar">
        {saveError && (
          <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="size-4 shrink-0" />
            <span className="font-semibold">{saveError}</span>
          </div>
        )}

        {getFormLayout()}

        {isConnectionSearchOpen && (
          <RrMediaConnectionSearchModal
            isOpen={isConnectionSearchOpen}
            onOpenChange={setIsConnectionSearchOpen}
            mediaType={mediaType}
            mediaTitle={
              media.title.english ||
              media.title.romaji ||
              (media.title as any).native ||
              ""
            }
            activeSearchProvider={activeSearchProvider}
            connectionProviders={filteredConnectionProviders}
            onSelectResult={handleSelectSearchResult}
          />
        )}

        {hasListEntry && (
          <div className="mt-2 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    disabled={isSubmitting}
                    className="bg-transparent hover:bg-destructive hover:text-destructive-foreground border-border/60 hover:border-destructive/50 text-muted-foreground text-xs font-semibold rounded-xl cursor-pointer px-4 h-9 transition-colors shadow-2xs"
                  >
                    {t("aquila.delete")}
                  </Button>
                </motion.div>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-background/95 backdrop-blur-2xl border border-border/60 rounded-2xl shadow-2xl text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {t("aquila.confirmDeletion")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-muted-foreground/80">
                    {t("aquila.confirmDeletionDescription", {
                      type: mediaType,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                  <AlertDialogCancel className="bg-transparent hover:bg-muted border-border/60 text-foreground text-xs font-bold rounded-xl cursor-pointer h-9 px-4">
                    {t("aquila.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/95 text-xs font-bold rounded-xl cursor-pointer h-9 px-4"
                  >
                    {t("aquila.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {dialogContent}
    </Dialog>
  );
}
