"use client";
import Image from "next/image";
import {
  EffectManagerHandle,
  CelestialEffectManager,
} from "@/components/stars/CelestialEffectManager";
import { StarMap, StarMapHandle } from "@/components/stars/StarMap";
import { REFERENCE_CONSTELLATIONS } from "@/lib/constellations";
import { useSession } from "next-auth/react";
import { useRef, useState, useEffect } from "react";
import { RrConstellationBuilderModal } from "@/components/rrComponents/rrConstellationBuilderModal";
import { rrApps } from "@/../config/rrApps";
import { hasPermission } from "@runa/permissions";
import type { Constellation } from "@/types/constellation";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Sparkles, Star, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { RrCalendarModal } from "@/components/rrComponents/polaris/calendar/RrCalendarModal";

const constellations = REFERENCE_CONSTELLATIONS;

interface Bookmark {
  id: string;
  name: string;
  description?: string;
  redirect: string;
  stars: { ra: number; dec: number; magnitude: number }[];
  connections: [number, number][];
  icon?: string;
  connectionColor?: string;
  starColor?: string;
}

export default function Dash() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const effectManagerRef = useRef<EffectManagerHandle>(null);
  const starMapRef = useRef<StarMapHandle>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { data: session, status } = useSession();

  const greetings = [
    t("polaris.greetings.hey", "Hey"),
    t("polaris.greetings.hi", "Hi"),
    t("polaris.greetings.hello", "Hello"),
    t("polaris.greetings.greetings", "Greetings"),
    t("polaris.greetings.hiya", "Hiya"),
    t("polaris.greetings.welcome", "Welcome"),
  ];

  const [greetingIndex, setGreetingIndex] = useState(0);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const navigatedRef = useRef(false);

  useEffect(() => {
    document.title = "Polaris > Dashboard";
    setGreetingIndex(Math.floor(Math.random() * greetings.length));
  }, []);

  const { bookmarks: fetchedBookmarksRaw, mutate } = useBookmarks();
  const bookmarks = (fetchedBookmarksRaw || []) as unknown as Bookmark[];

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    if (containerRef.current) {
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver?.disconnect();
    };
  }, []);

  const name =
    status === "authenticated"
      ? (session.user.displayName ?? session.user.username)
      : null;

  const visibleReferenceConstellations = constellations.filter(
    (constellation: Constellation): boolean => {
      const app = rrApps.find(
        (a) =>
          a.name.toLowerCase() === constellation.id.toLowerCase() ||
          a.href === constellation.redirect,
      );
      if (!app) return true;
      if (!app.permissions || app.permissions.length === 0) return true;
      return hasPermission(session?.user?.permissions, app.permissions, "any");
    },
  );

  const allConstellations = [
    ...visibleReferenceConstellations,
    ...bookmarks.map((b) => ({
      name: b.name,
      description: b.description ?? "",
      redirect: b.redirect,
      id: b.id,
      stars: b.stars as any,
      connections: b.connections as any,
      icon: b.icon || undefined,
      connectionColor: b.connectionColor || undefined,
      starColor: b.starColor || undefined,
    })),
  ];

  useEffect(() => {
    if (navigatedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const constellationId = params.get("constellation");
    if (constellationId && allConstellations.length > 0) {
      const matched = allConstellations.find(
        (c) => c.id.toLowerCase() === constellationId.toLowerCase(),
      );
      if (matched) {
        navigatedRef.current = true;
        const timer = setTimeout(() => {
          starMapRef.current?.navigateToConstellation(matched.name);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [allConstellations]);

  return (
    <div ref={containerRef} className="dark w-full min-h-screen bg-black">
      {dimensions.width > 0 && (
        <StarMap
          ref={starMapRef}
          height={dimensions.height}
          width={dimensions.width}
          numOfStars={30000}
          constellations={allConstellations}
          effects={
            <CelestialEffectManager
              ref={effectManagerRef}
              width={dimensions.width}
              height={dimensions.height}
              enableComets={true}
            />
          }
        >
          {/* World Space Content Container - anchored at (0,0) of the universe */}
          <div className="absolute top-0 left-0 w-0 h-0 overflow-visible pointer-events-none">
            {/* Hero Section - Centered */}
            <section className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center w-225 z-10">
              <h1 className="text-5xl md:text-7xl font-bold text-foreground tracking-widest opacity-90 mb-2 drop-shadow-lg select-none">
                {greetings[greetingIndex]}
                {", "}
                {name}
              </h1>
              <h2 className="text-xl md:text-2xl text-muted-foreground font-light tracking-[0.2em] uppercase mb-4 drop-shadow-md select-none">
                {t(
                  "polaris.explorePrompt",
                  "What would you like to explore today?",
                )}
              </h2>
              <div className="flex flex-wrap justify-center gap-3 mt-4 pointer-events-auto">
                {allConstellations.map((constellation) => {
                  const app = rrApps.find(
                    (a) =>
                      a.name.toLowerCase() === constellation.id.toLowerCase() ||
                      a.href === constellation.redirect,
                  );
                  const iconSrc = app?.iconLeftRing || (constellation as any).icon;

                  return (
                    <Button
                      key={constellation.id}
                      variant="outline"
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          window.location.href = constellation.redirect;
                        } else {
                          starMapRef.current?.navigateToConstellation(
                            constellation.name,
                          );
                        }
                      }}
                      className="bg-background/20 text-foreground border-border hover:bg-background/40 hover:border-border/80 backdrop-blur-md rounded-xl font-medium tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/5 cursor-pointer flex items-center gap-2.5 px-5 py-2.5"
                    >
                      {iconSrc ? (
                        <Image
                          src={iconSrc}
                          alt={constellation.name}
                          width={20}
                          height={20}
                          className="size-5 object-contain shrink-0"
                        />
                      ) : (
                        <Star className="size-4 text-primary shrink-0" />
                      )}
                      {constellation.name}
                    </Button>
                  );
                })}
              </div>
            </section>
          </div>
        </StarMap>
      )}

      {/* Floating Action Buttons in the bottom-right corner */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <Button
          onClick={() => setIsCalendarOpen(true)}
          className="h-12 rounded-full px-5 bg-background/80 hover:bg-accent border border-border text-foreground backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-105 group"
        >
          <CalendarIcon className="size-4 mr-2 text-primary" />
          {t("polaris.calendar.calendar")}
        </Button>

        <Button
          onClick={() => setIsBuilderOpen(true)}
          className="h-12 rounded-full px-6 bg-background/80 hover:bg-accent border border-border text-foreground backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-105 group"
        >
          <Sparkles className="size-4 mr-2 group-hover:animate-pulse" />
          {t("polaris.constellationWorkspace")}
        </Button>
      </div>

      {isBuilderOpen && (
        <RrConstellationBuilderModal
          open={isBuilderOpen}
          onOpenChange={setIsBuilderOpen}
        />
      )}

      {isCalendarOpen && (
        <RrCalendarModal
          open={isCalendarOpen}
          onOpenChange={setIsCalendarOpen}
        />
      )}
    </div>
  );
}
