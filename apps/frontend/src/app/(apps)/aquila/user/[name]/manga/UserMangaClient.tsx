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
import {
  RrUserListFilters,
  UserListSortType,
  RrUserListFilterState,
} from "@/components/rrComponents/aquila/rrUserListFilters";
import useSWR from "swr";
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

const MANGA_PRIORITY_STATUSES = [
  "Reading",
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

export default function UserMangaPage() {
  const params = useParams();
  const username = params.name as string;
  const { data: session } = useSession();

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
    }
  );

  const [mangaList, setMangaList] = useState<MediaEntry[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [priorityIdx, setPriorityIdx] = useState(0);
  const [priorityOff, setPriorityOff] = useState(0);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchVal);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchVal]);



  const fetchMangaList = (
    currentOffset = 0,
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
      offset: currentOffset.toString(),
      status: effectiveStatus,
      search: debouncedSearch,
      format: filters.format || "",
      genres: (filters.genres || []).join(","),
      year: filters.year || "",
      mediaStatus: filters.mediaStatus || "",
      sort: sort,
    });

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/list/manga/user/${username}?${queryParams}`,
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
          setMangaList((prev) => {
            if (isReset) return newEntries;
            const seen = new Set(prev.map((e) => e.id));
            return [...prev, ...newEntries.filter((e: any) => !seen.has(e.id))];
          });
          setCounts(data.counts || {});
          if (statusOverride !== undefined && activeList === "All") {
            if (newEntries.length < 30) {
              const pIdx = MANGA_PRIORITY_STATUSES.indexOf(statusOverride);
              const nextIdx = pIdx + 1;
              if (nextIdx < MANGA_PRIORITY_STATUSES.length) {
                setPriorityIdx(nextIdx);
                setPriorityOff(0);
                setHasMore(true);
              } else {
                setHasMore(false);
              }
            } else {
              setPriorityOff(currentOffset + newEntries.length);
              setHasMore(true);
            }
          } else {
            setHasMore(newEntries.length === 30);
            setOffset(currentOffset + newEntries.length);
          }
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Failed to fetch manga list", err);
      })
      .finally(() => {
        setLoading(false);
        isFetchingRef.current = false;
      });
  };

  useEffect(() => {
    const controller = new AbortController();
    setPriorityIdx(0);
    setPriorityOff(0);
    setOffset(0);
    setHasMore(true);
    if (activeList === "All") {
      fetchMangaList(0, true, MANGA_PRIORITY_STATUSES[0], controller.signal);
    } else {
      fetchMangaList(0, true, undefined, controller.signal);
    }
    return () => {
      controller.abort();
    };
  }, [
    username,
    debouncedSearch,
    activeList,
    filters.format,
    filters.genres?.join(","),
    filters.year,
    filters.mediaStatus,
    sort,
  ]);

  useEffect(() => {
    if (!userData) return;
    document.title = `Aquila > User > ${userData?.displayName || userData?.username} > Manga List`;
  }, [userData]);

  const lists = [
    "All",
    "Reading",
    "On Hold",
    "Completed",
    "Dropped",
    "Planning",
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative flex flex-col w-full min-h-screen gap-6 p-4 lg:p-6 select-none"
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* ── Main Content ────────────────────────── */}
      <motion.main
        variants={itemVariants}
        className="flex-1 flex flex-col gap-6 w-full z-10"
      >
        <RrUserListHeader userData={userData || null} listTitle="Manga List" />

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
            {/* Horizontal Lists & Filters Toolbar */}
            <div className="flex flex-col gap-4 w-full bg-card/20 backdrop-blur-xl border border-border/40 p-4 rounded-2xl shadow-xl">
              <RrUserListTabs
                lists={lists}
                activeList={activeList}
                setActiveList={setActiveList}
                counts={counts}
                mediaType="manga"
              />

              <RrUserListFilters
                username={username}
                mediaType="manga"
                searchVal={searchVal}
                setSearchVal={setSearchVal}
                sort={sort}
                setSort={setSort}
                sortOptions={SORT_OPTIONS}
                filters={filters}
                setFilters={setFilters}
                searchPlaceholder="Search manga..."
              />
            </div>

            <header className="flex items-center justify-between mt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/75">
                {activeList} Manga (
                {counts?.[activeList.toLowerCase().replace(/\s+/g, "_")] ??
                  mangaList.length}
                )
              </h3>
              <div className="flex items-center gap-2 ml-auto">
                <RrMediaRoulette
                  username={username}
                  mediaType="manga"
                  baseUrl="/aquila/manga"
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
                  ? ["Reading", "On Hold", "Completed", "Dropped", "Planning"]
                  : [activeList]
              }
              data={mangaList}
              displayType={displayType}
              filters={{}}
              sort={sort}
              baseUrl="/aquila/manga"
              isOwner={isOwner}
              onRefresh={() => fetchMangaList(0, true)}
            />

            <InfiniteScroll
              onLoadMore={() => {
                if (activeList === "All") {
                  fetchMangaList(
                    priorityOff,
                    false,
                    MANGA_PRIORITY_STATUSES[priorityIdx],
                  );
                } else {
                  fetchMangaList(offset, false);
                }
              }}
              hasMore={hasMore}
              isLoading={loading}
            />
          </>
        )}
      </motion.main>
    </motion.div>
  );
}
