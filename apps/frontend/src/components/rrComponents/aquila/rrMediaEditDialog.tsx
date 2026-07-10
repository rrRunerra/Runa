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
import { BASE_CONNECTION_PROVIDERS } from "@/lib/providers";

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
        ? raw.title
        : {
            english: raw.titleEnglish || raw.titleString || "",
            romaji: raw.titleRomaji || raw.titleString || "",
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

    return {
      ...raw,
      title,
      coverImage,
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

  useEffect(() => {
    if (listEntryData) {
      setListStatus(listEntryData.status || "PLANNING");
      setScore(listEntryData.score ? listEntryData.score.toString() : "");

      if (mediaType === "manga" || mediaType === "book") {
        setProgress(
          listEntryData.chapters ? listEntryData.chapters.toString() : "",
        );
        setVolumes(
          listEntryData.volumes ? listEntryData.volumes.toString() : "",
        );
        setRewatches(
          listEntryData.reread ? listEntryData.reread.toString() : "0",
        );
      } else if (mediaType === "game") {
        setProgress(
          listEntryData.progress ? listEntryData.progress.toString() : "",
        );
      } else {
        setProgress(
          listEntryData.progress ? listEntryData.progress.toString() : "",
        );
        setRewatches(
          listEntryData.rewatched ? listEntryData.rewatched.toString() : "0",
        );
      }

      setNotes(listEntryData.notes || "");
      setStartDate(
        listEntryData.startDate
          ? new Date(listEntryData.startDate * 1000)
          : undefined,
      );
      setFinishDate(
        listEntryData.endDate
          ? new Date(listEntryData.endDate * 1000)
          : undefined,
      );

      if (mediaType === "tv") {
        setWatchedEpisodes(listEntryData.watchedEpisodes || []);
      }

      // Map connection overrides details
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
                ? listEntryData.chapters
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
          if (conn.volumesOffset !== undefined) {
            connVolumes = (
              Number(listEntryData.volumes || 0) + Number(conn.volumesOffset)
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
    } else {
      // Clean states on dialog close or entry not found
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
      toast.error("Failed to update episode progress");
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
              episodeNum: ep.number,
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
          checked ? "Season marked as watched" : "Season marked as unwatched",
        );
        mutateListEntry();
      }
    } catch {
      toast.error("Failed to update season progress");
    }
  };

  const handleToggleFavorite = async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to favorite items");
      return;
    }

    if (!hasListEntry) {
      setIsFavorited((prev) => !prev);
      toast.success(
        isFavorited
          ? "Removed from favorites locally!"
          : "Added to favorites locally!",
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
          toast.success("Removed from favorites!");
          mutateFavorite();
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.message || "Failed to remove from favorites");
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
          toast.success("Added to favorites!");
          mutateFavorite();
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data.message || "Failed to add to favorites");
        }
      }
    } catch {
      toast.error("Failed to toggle favorite");
    } finally {
      setIsSubmittingFavorite(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to save entries");
      return;
    }

    setIsSubmitting(true);
    setSaveError(null);

    const basePayload: Record<string, any> = {
      status: listStatus,
      startDate: startDate ? Math.floor(startDate.getTime() / 1000) : undefined,
      endDate: finishDate ? Math.floor(finishDate.getTime() / 1000) : undefined,
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

        toast.success("Saved successfully!");
        onOpenChange(false);
        onSaved?.();
        mutateListEntry();
      } else {
        const errorMsg =
          data.message || data.error?.message || "Failed to save entry.";
        setSaveError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || "An unexpected error occurred while saving.");
      toast.error("Failed to save entry.");
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
        toast.success("Removed from list!");
        onOpenChange(false);
        setHasListEntry(false);
        onDeleted?.();
        mutateListEntry();
      } else {
        const errorMsg =
          data.message || data.error?.message || "Failed to remove entry.";
        setSaveError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      setSaveError(
        err.message || "An unexpected error occurred while removing.",
      );
      toast.error("Failed to remove.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSearchModal = (provider: string): void => {
    setActiveSearchProvider(provider);
    setIsConnectionSearchOpen(true);
  };

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
        episodes={media.episodes}
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
            if (mediaType === "anime" && media.episodes && !progress) {
              setProgress(media.episodes.toString());
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

    const currentCaps =
      mediaType === "anime"
        ? [BASE_CONNECTION_PROVIDERS[0].capabilities[0]] // anime capability
        : mediaType === "manga"
          ? [BASE_CONNECTION_PROVIDERS[0].capabilities[0]] // manga capability
          : [];

    const connectionsSection = (
      <RrMediaEditConnections
        mediaType={mediaType}
        updateConnection={updateConnection}
        onUpdateConnectionChange={setUpdateConnection}
        connections={connections}
        onConnectionsChange={setConnections}
        userConnections={userConnections}
        connectionProviders={BASE_CONNECTION_PROVIDERS}
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
          <TabsList className="bg-muted p-[3px] rounded-lg w-full sm:w-fit grid grid-cols-2">
            <TabsTrigger value="general" className="rounded-md">
              General
            </TabsTrigger>
            <TabsTrigger value="episodes" className="rounded-md">
              Episodes ({watchedEpisodes.length}/
              {media.seasons?.reduce(
                (acc: any, s: { episodeCount: any }) => acc + s.episodeCount,
                0,
              ) || 0}
              )
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
    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background/90 backdrop-blur-xl border border-border/60 text-foreground [&>button]:text-foreground [&>button]:z-60 [&>button]:hover:text-muted-foreground shadow-2xl rounded-2xl">
      <DialogTitle className="sr-only">
        {hasListEntry ? `Edit ${mediaType} Entry` : `Add ${mediaType} to List`}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Update progress, score, notes, dates and link external service
        connections.
      </DialogDescription>

      <RrMediaEditDialogHeader
        bannerImage={media.bannerImage}
        coverImageLarge={media.coverImage?.large ?? ""}
        title={media.title?.english || media.title?.romaji || ""}
        mediaType={mediaType}
        isFavorited={isFavorited}
        isSubmittingFavorite={isSubmittingFavorite}
        isSubmitting={isSubmitting}
        onToggleFavorite={handleToggleFavorite}
        onSave={handleSave}
      />

      <div className="p-6 pt-4 bg-transparent flex flex-col gap-4">
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
            mediaTitle={media.title.english || media.title.romaji}
            activeSearchProvider={activeSearchProvider}
            connectionProviders={BASE_CONNECTION_PROVIDERS}
            onSelectResult={handleSelectSearchResult}
          />
        )}

        {hasListEntry && (
          <div className="mt-4 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="outline"
                    disabled={isSubmitting}
                    className="bg-transparent hover:bg-destructive hover:text-destructive-foreground border-border hover:border-destructive/50 text-muted-foreground text-xs font-semibold rounded-xl cursor-pointer px-4 h-9 transition-colors"
                  >
                    Delete
                  </Button>
                </motion.div>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl text-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Confirm Deletion
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-muted-foreground/80">
                    This action cannot be undone. This will permanently remove
                    this {mediaType} entry from your list and erase all local
                    progress, score, and notes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                  <AlertDialogCancel className="bg-transparent hover:bg-muted border-border text-foreground text-xs font-bold rounded-xl cursor-pointer h-9 px-4">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/95 text-xs font-bold rounded-xl cursor-pointer h-9 px-4"
                  >
                    Delete
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
