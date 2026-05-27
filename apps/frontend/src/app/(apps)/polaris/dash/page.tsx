"use client";
import {
  EffectManagerHandle,
  CelestialEffectManager,
} from "@/components/stars/CelestialEffectManager";
import { StarIcon } from "@/components/icons/StarIcon";
import { StarMap, StarMapHandle } from "@/components/stars/StarMap";
import { Constellation } from "@/types/constellation";
import { useSession } from "next-auth/react";
import { useRef, useState, useEffect } from "react";

const GREETINGS = ["Hey", "Hi", "Hello", "Greetings", "Hiya", "Welcome"];

const constellations: Constellation[] = [
  {
    name: "Lynx",
    description: "Web interface for discord bot.",
    redirect: "/lynx",
    id: "lynx",
    stars: [
      {
        ra: 5.41,
        dec: 11.91,
        magnitude: 3,
        name: "Star 0",
      },
      {
        ra: 5.45,
        dec: 13.11,
        magnitude: 3,
        name: "Star 1",
      },
      {
        ra: 5.55,
        dec: 13.74,
        magnitude: 3,
        name: "Star 2",
      },
      {
        ra: 5.62,
        dec: 15.54,
        magnitude: 3,
        name: "Star 3",
      },
      {
        ra: 5.88,
        dec: 15.71,
        magnitude: 3,
        name: "Star 4",
      },
      {
        ra: 6.24,
        dec: 19.04,
        magnitude: 3,
        name: "Star 5",
      },
      {
        ra: 6.35,
        dec: 24.57,
        magnitude: 3,
        name: "Star 6",
      },
      {
        ra: 6.52,
        dec: 25.61,
        magnitude: 3,
        name: "Star 7",
      },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
    ],
  },
  {
    name: "Aquila",
    description: "Media tracking app.",
    redirect: "/aquila",
    id: "aquila",
    stars: [
      {
        ra: 25.3,
        dec: 1.83,
        magnitude: 3,
        name: "Star 0",
      },
      {
        ra: 25.24,
        dec: 2.67,
        magnitude: 3,
        name: "Star 1",
      },
      {
        ra: 24.9,
        dec: 6.27,
        magnitude: 3,
        name: "Star 2",
      },
      {
        ra: 24.53,
        dec: 7.5,
        magnitude: 3,
        name: "Star 3",
      },
      {
        ra: 25.06,
        dec: 8.83,
        magnitude: 3,
        name: "Star 4",
      },
      {
        ra: 25.33,
        dec: 15.5,
        magnitude: 3,
        name: "Star 5",
      },
      {
        ra: 25.24,
        dec: 2.67,
        magnitude: 3,
        name: "Star 6",
      },
      {
        ra: 25.06,
        dec: 8.87,
        magnitude: 3,
        name: "Star 7",
      },
      {
        ra: 24.87,
        dec: 14.53,
        magnitude: 3,
        name: "Star 8",
      },
      {
        ra: 24.8,
        dec: 13.1,
        magnitude: 3,
        name: "Star 9",
      },
      {
        ra: 24.74,
        dec: 11.57,
        magnitude: 3,
        name: "Star 10",
      },
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
    ],
  },
];

export default function Dash() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectManagerRef = useRef<EffectManagerHandle>(null);
  const starMapRef = useRef<StarMapHandle>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { data: session, status } = useSession();
  const [greeting, setGreeting] = useState(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  useEffect(() => {
    document.title = "Polaris > Dashboard";
  }, []);

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

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-black">
      {dimensions.width > 0 && (
        <StarMap
          ref={starMapRef}
          height={dimensions.height}
          width={dimensions.width}
          numOfStars={30000}
          constellations={constellations}
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
                {constellations.map((constellation) => (
                  <button
                    key={constellation.id}
                    onClick={() =>
                      starMapRef.current?.navigateToConstellation(
                        constellation.name,
                      )
                    }
                    className="group relative px-6 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white font-medium tracking-wide transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105 hover:shadow-lg hover:shadow-white/5"
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
    </div>
  );
}
