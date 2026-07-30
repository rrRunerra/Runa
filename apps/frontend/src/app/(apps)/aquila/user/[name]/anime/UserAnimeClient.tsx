"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  RrMediaListDisplay,
  RrMediaEntry as MediaEntry,
  UserListDisplayType as DisplayType,
} from "@/components/rrComponents/aquila/rrMediaListDisplay";
import { InfiniteScroll } from "../../../../../../components/aquila/media-list/InfiniteScroll";
import { useSession } from "next-auth/react";
import * as Lucide from "lucide-react";
import { motion } from "framer-motion";
import { RrUserListHeader } from "@/components/rrComponents/aquila/rrUserListHeader";
import { RrUserListTabs } from "@/components/rrComponents/aquila/rrUserListTabs";
import { RrMediaRoulette } from "@/components/rrComponents/aquila/rrMediaRoulette";
import { RrUserListSequelsTab } from "@/components/rrComponents/aquila/rrUserListSequelsTab";
import {
  RrUserListFilters,
  UserListSortType,
  RrUserListFilterState,
} from "@/components/rrComponents/aquila/rrUserListFilters";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { fetcher } from "@/lib/fetcher";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
} as const;

const ANIME_PRIORITY_STATUSES = [
  "Watching",
  "On Hold",
  "Completed",
  "Dropped",
  "Planning",
];

const SORT_OPTIONS = [
  { label: "Title", value: "title" },
  { label: "Score", value: "score" },
  { label: "Progress", value: "progress" },
  { label: "Last Updated", value: "last_updated" },
  { label: "Last Added", value: "last_added" },
];

export default function UserAnimePage({ initialData }: { initialData?: any }) {
  const { t } = useTranslation();
  const params = useParams();
  const username = params.name as string;
  const { data: session } = useSession();

  const getListNameTranslation = (name: string) => {
    switch (name.toUpperCase()) {
      case "ALL":
        return t("aquila.allTab");
      case "WATCHING":
        return t("aquila.watching");
      case "READING":
        return t("aquila.reading");
      case "PLAYING":
        return t("aquila.playing");
      case "PLANNING":
      case "PLAN TO WATCH":
      case "PLAN TO READ":
      case "PLAN TO PLAY":
        return t("aquila.planning");
      case "ON_HOLD":
      case "ON HOLD":
        return t("aquila.onHold");
      case "COMPLETED":
        return t("aquila.completed");
      case "DROPPED":
        return t("aquila.dropped");
      default:
        return name;
    }
  };

  if (!username) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Username not found
      </div>
    );
  }

  const isOwner = session?.user?.username === username;

  const [displayType, setDisplayType] = useState<DisplayType>("grid");
  const [searchVal, setSearchVal] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeList, setActiveList] = useState("All");
  const [filters, setFilters] = useState<RrUserListFilterState>({
    format: "",
    genres: [],
    year: "",
    mediaStatus: "",
  });
  const [sort, setSort] = useState<UserListSortType>("last_updated");

  const { data: userData } = useSWR<{
    username: string;
    displayName?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  }>(
    username ? `${process.env.NEXT_PUBLIC_API_URL}/users/${username}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    },
  );

  const [animeList, setAnimeList] = useState<MediaEntry[]>(
    initialData?.entries || [],
  );
  const [isPrivate, setIsPrivate] = useState(false);

  const getInitialPriorityState = () => {
    if (!initialData) {
      return { index: 0, cursor: undefined, hasMore: true };
    }
    const len = initialData.entries?.length || 0;
    const pageInfo = initialData.pageInfo;
    const initialHasMore = pageInfo?.hasMore ?? (len >= 30);
    const initialNextCursor = pageInfo?.nextCursor ?? null;

    if (!initialHasMore) {
      return { index: 1, cursor: undefined, hasMore: true };
    } else {
      return { index: 0, cursor: initialNextCursor, hasMore: true };
    }
  };

  const initialPState = getInitialPriorityState();
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(
    initialData?.pageInfo?.nextCursor
  );
  const [hasMore, setHasMore] = useState(initialPState.hasMore);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>(
    initialData?.counts || {},
  );
  const [priorityIdx, setPriorityIdx] = useState(initialPState.index);
  const [priorityCursor, setPriorityCursor] = useState<string | null | undefined>(
    initialPState.cursor
  );
  const isFetchingRef = useRef(false);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchVal);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const fetchAnimeList = (
    cursorToFetch?: string | null,
    isReset = false,
    statusOverride?: string,
    signal?: AbortSignal,
  ) => {
    if (!username) return;
    if (isFetchingRef.current && !isReset) return;
    isFetchingRef.current = true;
    setLoading(true);

    const headers: HeadersInit = {};
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }

    const effectiveStatus = statusOverride ?? activeList;

    const queryParams = new URLSearchParams({
      limit: "30",
      status: effectiveStatus,
      search: debouncedSearch,
      format: filters.format || "",
      genres: Array.isArray(filters.genres) ? filters.genres.join(",") : "",
      year: filters.year || "",
      mediaStatus: filters.mediaStatus || "",
      sort: sort,
    });

    if (cursorToFetch) {
      queryParams.set("cursor", cursorToFetch);
    }

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/list/anime/user/${username}?${queryParams}`,
      { headers, signal },
    )
      .then(async (res) => {
        if (res.status === 403) {
          setIsPrivate(true);
          return null;
        }
        if (res.ok) {
          return res.json();
        }
        throw new Error("Failed to fetch list");
      })
      .then((data) => {
        if (data && data.statusCode !== 404) {
          setIsPrivate(false);
          const newEntries = data.entries || [];
          const pageInfo = data.pageInfo || {
            nextCursor: null,
            hasMore: newEntries.length === 30,
          };

          setAnimeList((prev) => {
            if (isReset) return newEntries;
            const seen = new Set(prev.map((e) => e.id));
            return [...prev, ...newEntries.filter((e: any) => !seen.has(e.id))];
          });
          setCounts(data.counts || {});

          if (statusOverride !== undefined && activeList === "All") {
            if (!pageInfo.hasMore) {
              const pIdx = ANIME_PRIORITY_STATUSES.indexOf(statusOverride);
              const nextIdx = pIdx + 1;
              if (nextIdx < ANIME_PRIORITY_STATUSES.length) {
                setPriorityIdx(nextIdx);
                setPriorityCursor(undefined);
                setHasMore(true);
              } else {
                setHasMore(false);
              }
            } else {
              setPriorityCursor(pageInfo.nextCursor);
              setHasMore(true);
            }
          } else {
            setHasMore(pageInfo.hasMore);
            setNextCursor(pageInfo.nextCursor);
          }
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Failed to fetch anime list", err);
      })
      .finally(() => {
        if (!signal?.aborted) {
          setLoading(false);
          isFetchingRef.current = false;
        }
      });
  };

  useEffect(() => {
    if (isInitialMountRef.current && initialData) {
      isInitialMountRef.current = false;
      return;
    }
    const controller = new AbortController();
    setPriorityIdx(0);
    setPriorityCursor(undefined);
    setNextCursor(undefined);
    setHasMore(true);
    if (activeList === "All") {
      fetchAnimeList(undefined, true, ANIME_PRIORITY_STATUSES[0], controller.signal);
    } else {
      fetchAnimeList(undefined, true, undefined, controller.signal);
    }
    return () => {
      controller.abort();
    };
  }, [
    username,
    debouncedSearch,
    activeList,
    filters.format,
    Array.isArray(filters.genres) ? filters.genres.join(",") : "",
    filters.year,
    filters.mediaStatus,
    sort,
  ]);

  useEffect(() => {
    if (!userData) return;
    document.title = `Aquila > User > ${userData?.displayName || userData?.username} > Anime List`;
  }, [userData]);

  const lists = [
    "All",
    "Watching",
    "On Hold",
    "Completed",
    "Dropped",
    "Planning",
    "Similar",
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative flex flex-col w-full min-h-screen gap-6 p-4 lg:p-6 select-none"
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 h-125 w-125 bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* ── Main Content ────────────────────────── */}
      <motion.main
        variants={itemVariants}
        className="flex-1 flex flex-col gap-6 w-full z-10"
      >
        <RrUserListHeader userData={userData || null} listTitle="Anime List" entries={animeList} />

        {isPrivate ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card/20 backdrop-blur-xl border border-border/40 rounded-2xl shadow-xl text-center p-6 mt-4">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Lucide.Lock className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              This list is private
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              The owner of this list has set their privacy preferences to
              private.
            </p>
          </div>
        ) : (
          <>
            {/* Horizontal Lists Toolbar */}
            <div className="flex flex-col gap-4 w-full bg-card/20 backdrop-blur-xl border border-border/40 p-4 rounded-2xl shadow-xl">
              <RrUserListTabs
                lists={lists}
                activeList={activeList}
                setActiveList={setActiveList}
                counts={counts}
                mediaType="anime"
              />

              {activeList !== "Similar" && activeList !== "Sequels" && (
                <RrUserListFilters
                  username={username}
                  mediaType="anime"
                  searchVal={searchVal}
                  setSearchVal={setSearchVal}
                  sort={sort}
                  setSort={setSort}
                  sortOptions={SORT_OPTIONS}
                  filters={filters}
                  setFilters={setFilters}
                  searchPlaceholder={t("aquila.searchAnime")}
                />
              )}
            </div>

            {activeList === "Similar" || activeList === "Sequels" ? (
              <RrUserListSequelsTab username={username} mediaType="anime" />
            ) : (
              <>
                <header className="flex items-center justify-between mt-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/75" suppressHydrationWarning>
                    {getListNameTranslation(activeList)}{" "}
                    {t("aquila.anime")} (
                    {counts?.[activeList.toLowerCase().replace(/\s+/g, "_")] ??
                      animeList.length}
                    )
                  </h3>
                  <div className="flex items-center gap-2 ml-auto">
                    <RrMediaRoulette
                      username={username}
                      mediaType="anime"
                      baseUrl="/aquila/anime"
                    />
                    <div className="flex items-center gap-1.5 bg-muted/20 p-1 rounded-xl border border-border/30 shadow-inner">
                      {[
                        { type: "list", icon: <Lucide.List size={16} /> },
                        { type: "compact", icon: <Lucide.LayoutList size={16} /> },
                        { type: "grid", icon: <Lucide.LayoutGrid size={16} /> },
                      ].map((view) => (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          key={view.type}
                          onClick={() => setDisplayType(view.type as DisplayType)}
                          className={`flex items-center justify-center size-8 rounded-lg transition-all cursor-pointer ${displayType === view.type ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"}`}
                        >
                          {view.icon}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </header>

                <RrMediaListDisplay
                  lists={
                    activeList === "All"
                      ? ["Watching", "On Hold", "Completed", "Dropped", "Planning"]
                      : [activeList]
                  }
                  data={animeList}
                  displayType={displayType}
                  filters={{}}
                  sort={sort}
                  baseUrl="/aquila/anime"
                  isOwner={isOwner}
                  onRefresh={() => {
                    if (activeList === "All") {
                      setPriorityIdx(0);
                      setPriorityCursor(undefined);
                      fetchAnimeList(undefined, true, ANIME_PRIORITY_STATUSES[0]);
                    } else {
                      setNextCursor(undefined);
                      fetchAnimeList(undefined, true);
                    }
                  }}
                />

                <InfiniteScroll
                  onLoadMore={() => {
                    if (activeList === "All") {
                      fetchAnimeList(
                        priorityCursor,
                        false,
                        ANIME_PRIORITY_STATUSES[priorityIdx],
                      );
                    } else {
                      fetchAnimeList(nextCursor, false);
                    }
                  }}
                  hasMore={hasMore}
                  isLoading={loading}
                />
              </>
            )}
          </>
        )}
      </motion.main>
    </motion.div>
  );

}
