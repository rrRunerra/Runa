"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { MediaListDisplay } from "../../../../../../components/aquila/media-list/MediaListDisplay";
import { InfiniteScroll } from "../../../../../../components/aquila/media-list/InfiniteScroll";
import {
  MediaEntry,
  DisplayType,
  MediaFilters,
} from "../../../../../../components/aquila/media-list/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import * as Lucide from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getSafeImageUrl } from "@/lib/inputValidation";

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

const MOVIES_PRIORITY_STATUSES = ["Completed", "Dropped", "Planning"];

export default function UserMoviesPage() {
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
  const [filters, setFilters] = useState<MediaFilters>({
    format: "",
    status: "",
    genres: [],
    country: "",
  });
  const [sort, setSort] = useState<
    "title" | "score" | "progress" | "last_updated" | "last_added"
  >("last_updated");

  const [userData, setUserData] = useState<{
    username: string;
    displayName?: string;
    avatarUrl?: string;
    bannerUrl?: string;
  } | null>(null);

  const [moviesList, setMoviesList] = useState<MediaEntry[]>([]);
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

  useEffect(() => {
    if (username) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${username}`)
        .then(async (res) => await res.json())
        .then((data) => setUserData(data))
        .catch((err) => console.error("Failed to fetch user data", err));
    }
  }, [username]);

  const fetchMoviesList = (
    currentOffset = 0,
    isReset = false,
    statusOverride?: string,
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
      sort: sort,
    });

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/list/movie/user/${username}?${queryParams}`,
      { headers },
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
          setMoviesList((prev) => {
            if (isReset) return newEntries;
            const seen = new Set(prev.map((e) => e.id));
            return [...prev, ...newEntries.filter((e: any) => !seen.has(e.id))];
          });
          setCounts(data.counts || {});
          if (statusOverride !== undefined && activeList === "All") {
            if (newEntries.length < 30) {
              const pIdx = MOVIES_PRIORITY_STATUSES.indexOf(statusOverride);
              const nextIdx = pIdx + 1;
              if (nextIdx < MOVIES_PRIORITY_STATUSES.length) {
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
      .catch((err) => console.error("Failed to fetch movies list", err))
      .finally(() => {
        setLoading(false);
        isFetchingRef.current = false;
      });
  };

  useEffect(() => {
    setPriorityIdx(0);
    setPriorityOff(0);
    setOffset(0);
    setHasMore(true);
    if (activeList === "All") {
      fetchMoviesList(0, true, MOVIES_PRIORITY_STATUSES[0]);
    } else {
      fetchMoviesList(0, true);
    }
  }, [
    username,
    session,
    debouncedSearch,
    activeList,
    filters.format,
    filters.status,
    sort,
  ]);

  useEffect(() => {
    if (!userData) return;
    document.title = `Aquila > User > ${userData?.displayName || userData?.username} > Movies List`;
  }, [userData]);

  const lists = ["All", "Completed", "Dropped", "Planning"];

  const resetFilters = () => {
    setSearchVal("");
    setActiveList("All");
    setFilters({
      format: "",
      status: "",
      genres: [],
      country: "",
    });
    setSort("last_updated");
  };

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
        {/* User Profile Header */}
        {userData && (
          <div className="relative w-full rounded-3xl overflow-hidden bg-zinc-950/20 border border-zinc-800/40 shadow-2xl mb-2">
            {/* Banner Image / Gradient */}
            <div className="relative h-44 sm:h-60 w-full overflow-hidden bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-pink-950/40 border-b border-zinc-800/30">
              {userData.bannerUrl ? (
                <img
                  src={getSafeImageUrl(userData.bannerUrl)}
                  alt={`${userData.displayName || userData.username}'s banner`}
                  className="w-full h-full object-cover opacity-90 transition-all duration-700 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-primary/20 via-violet-900/10 to-transparent relative">
                  <div className="absolute inset-0 bg-radial-at-t from-primary/10 via-transparent to-transparent" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>

            {/* User Info Container */}
            <div className="relative px-6 pb-6 pt-3 flex flex-col sm:flex-row sm:items-end gap-5">
              {/* Avatar - overlapping the banner */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0 self-start sm:self-auto z-20">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-zinc-950 ring-4 ring-primary/20 shadow-2xl rounded-full">
                  <AvatarImage
                    src={getSafeImageUrl(userData.avatarUrl)}
                    alt={userData.username}
                  />
                  <AvatarFallback className="text-3xl font-extrabold bg-zinc-900 text-primary border border-zinc-800">
                    {userData.displayName?.[0]?.toUpperCase() ||
                      userData.username?.[0]?.toUpperCase() ||
                      "?"}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Text info */}
              <div className="flex-1 flex flex-col gap-1 z-10 pb-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground drop-shadow-md">
                    {userData.displayName || userData.username}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold mt-0.5 uppercase tracking-wider">
                    Movies List
                  </span>
                </div>
                <p className="text-sm text-muted-foreground/80 font-medium">
                  @{userData.username}
                </p>
              </div>
            </div>
          </div>
        )}

        {isPrivate ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/20 backdrop-blur-xl border border-zinc-800/40 rounded-2xl shadow-xl text-center p-6 mt-4">
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
            <div className="flex flex-col gap-4 w-full bg-zinc-950/20 backdrop-blur-xl border border-zinc-800/40 p-4 rounded-2xl shadow-xl">
              {/* Lists Navigation */}
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3 overflow-x-auto no-scrollbar w-full">
                <div className="flex gap-2 flex-row flex-nowrap shrink-0">
                  {lists.map((list) => {
                    const isActive = activeList === list;
                    const countKey = list.toLowerCase().replace(/\s+/g, "_");
                    const count = counts?.[countKey] ?? 0;
                    return (
                      <button
                        key={list}
                        onClick={() => setActiveList(list)}
                        className={cn(
                          "relative flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none shrink-0",
                          isActive
                            ? "text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/20",
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeHorizontalListHighlight"
                            className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/20"
                            transition={{
                              type: "spring",
                              stiffness: 380,
                              damping: 30,
                            }}
                          />
                        )}
                        <span className="relative z-10">{list}</span>
                        <span
                          className={cn(
                            "relative z-10 text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800/50 text-muted-foreground transition-colors",
                            isActive &&
                              "bg-primary-foreground/20 text-primary-foreground",
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filters and Search controls */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 md:max-w-xs">
                  <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                  <Input
                    placeholder="Search movies..."
                    className="pl-9 h-9.5 bg-zinc-950/40 border border-zinc-800/50 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl placeholder:text-muted-foreground/40 text-xs"
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                  />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground/80 hidden sm:inline">
                      Sort
                    </span>
                    <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                      <SelectTrigger className="h-9.5 min-w-[130px] bg-zinc-950/40 border border-zinc-800/50 text-xs rounded-xl focus:ring-1 focus:ring-primary/30">
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-xl">
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="score">Score</SelectItem>
                        <SelectItem value="progress">Progress</SelectItem>
                        <SelectItem value="last_updated">
                          Last Updated
                        </SelectItem>
                        <SelectItem value="last_added">Last Added</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <header className="flex items-center justify-between mt-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/75">
                {activeList} Movies (
                {counts?.[activeList.toLowerCase().replace(/\s+/g, "_")] ??
                  moviesList.length}
                )
              </h3>
              <div className="flex items-center gap-1.5 bg-zinc-950/40 p-1 rounded-xl border border-zinc-850 shadow-inner ml-auto">
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
                    className={`flex items-center justify-center size-8 rounded-lg transition-all cursor-pointer ${displayType === view.type ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-zinc-800/30 hover:text-foreground"}`}
                  >
                    {view.icon}
                  </motion.button>
                ))}
              </div>
            </header>

            <MediaListDisplay
              lists={
                activeList === "All"
                  ? ["Completed", "Dropped", "Planning"]
                  : [activeList]
              }
              data={moviesList}
              displayType={displayType}
              filters={filters}
              sort={sort}
              baseUrl="/aquila/movies"
              isOwner={isOwner}
              onRefresh={() =>
                fetchMoviesList(
                  0,
                  true,
                  activeList === "All"
                    ? MOVIES_PRIORITY_STATUSES[0]
                    : undefined,
                )
              }
            />

            <InfiniteScroll
              onLoadMore={() => {
                if (activeList === "All") {
                  fetchMoviesList(
                    priorityOff,
                    false,
                    MOVIES_PRIORITY_STATUSES[priorityIdx],
                  );
                } else {
                  fetchMoviesList(offset, false);
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
