"use client";
import {
  EffectManagerHandle,
  CelestialEffectManager,
} from "@/components/stars/CelestialEffectManager";
import { StarIcon } from "@/components/icons/StarIcon";
import { StarMap, StarMapHandle } from "@/components/stars/StarMap";
import { REFERENCE_CONSTELLATIONS } from "@/lib/constellations";
import { useSession } from "next-auth/react";
import { useRef, useState, useEffect } from "react";
import { ConstellationBuilderModal } from "@/components/stars/ConstellationBuilderModal";
import { Sparkles } from "lucide-react";

const GREETINGS = ["Hey", "Hi", "Hello", "Greetings", "Hiya", "Welcome"];

const constellations = REFERENCE_CONSTELLATIONS;

export default function Dash() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectManagerRef = useRef<EffectManagerHandle>(null);
  const starMapRef = useRef<StarMapHandle>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { data: session, status } = useSession();
  const [greeting, setGreeting] = useState(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Polaris > Dashboard";
  }, []);

  const fetchBookmarks = async () => {
    if (session?.accessToken) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/polaris/bookmarks`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setBookmarks(data);
        }
      } catch (err) {
        console.error("Error fetching bookmarks:", err);
      }
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [session, isBuilderOpen]);

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

  const allConstellations = [
    ...constellations,
    ...bookmarks.map((b) => ({
      name: b.name,
      description: b.description,
      redirect: b.redirect,
      id: b.id,
      stars: b.stars as any,
      connections: b.connections as any,
      icon: b.icon || undefined,
      connectionColor: b.connectionColor || undefined,
      starColor: b.starColor || undefined,
    })),
  ];

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-black">
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
            <section className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center w-[900px] z-10">
              <h1 className="text-5xl md:text-7xl font-bold text-white tracking-widest opacity-90 mb-2 drop-shadow-lg select-none">
                {greeting}
                {", "}
                {name}
              </h1>
              <h2 className="text-xl md:text-2xl text-blue-300 font-light tracking-[0.2em] uppercase mb-4 drop-shadow-md select-none">
                What would you like to explore today?
              </h2>
              <div className="flex flex-wrap justify-center gap-3 mt-4 pointer-events-auto">
                {allConstellations.map((constellation) => (
                  <button
                    key={constellation.id}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        window.location.href = constellation.redirect;
                      } else {
                        starMapRef.current?.navigateToConstellation(
                          constellation.name,
                        );
                      }
                    }}
                    className="group relative px-6 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white font-medium tracking-wide transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105 hover:shadow-lg hover:shadow-white/5 cursor-pointer"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <StarIcon className="w-4 h-4 text-blue-300" />
                      {constellation.name}
                    </span>
                    <div className="absolute inset-0 rounded-xl bg-linear-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>
                ))}

              </div>
            </section>
          </div>
        </StarMap>
      )}

      {/* Floating Action Button (FAB) in the bottom-right corner to launch the Builder */}
      <button
        onClick={() => setIsBuilderOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-5 py-3 bg-zinc-950/75 hover:bg-zinc-900/80 backdrop-blur-xl border border-indigo-500/35 hover:border-indigo-500/65 rounded-full text-indigo-300 font-semibold text-sm tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] shadow-2xl cursor-pointer group"
      >
        <Sparkles className="w-4 h-4 text-indigo-400 group-hover:animate-pulse" />
        Constellation Builder
      </button>

      {isBuilderOpen && (
        <ConstellationBuilderModal
          open={isBuilderOpen}
          onOpenChange={setIsBuilderOpen}
        />
      )}
    </div>
  );
}
