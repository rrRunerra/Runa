"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { FallingStar } from "./FallingStar";
import { Comet } from "./Comet";

export interface EffectManagerHandle {
  triggerRandom: () => void;
}

interface Effect {
  id: number;
  type: "falling-star" | "comet";
  startX: number;
  startY: number;
  angle: number;
  travelDistance: number;
}

interface CelestialEffectManagerProps {
  autoSpawn?: boolean;
  width?: number;
  height?: number;
  enableStars?: boolean;
  enableComets?: boolean;
}

export const CelestialEffectManager = forwardRef<
  EffectManagerHandle,
  CelestialEffectManagerProps
>(
  (
    {
      autoSpawn = true,
      width = 1200,
      height = 800,
      enableStars = false,
      enableComets = false,
    },
    ref
  ) => {
    const [effects, setEffects] = useState<Effect[]>([]);

    const triggerRandom = useCallback(() => {
      // Determine what to spawn based on toggles
      const choices: ("falling-star" | "comet")[] = [];
      if (enableStars) choices.push("falling-star");
      if (enableComets) choices.push("comet");

      if (choices.length === 0) return;

      const type = choices[Math.floor(Math.random() * choices.length)];
      const id = Date.now();

      // Calculate max travel distance (diagonal)
      const travelDistance = Math.sqrt(width * width + height * height) + 400;

      // Randomly spawn from edges
      const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
      let startX = 0;
      let startY = 0;
      let angle = 0;

      const padding = 40;

      switch (side) {
        case 0: // top
          startX = Math.random() * width;
          startY = -padding;
          angle = 45 + Math.random() * 90;
          break;
        case 1: // right
          startX = width + padding;
          startY = Math.random() * height;
          angle = 135 + Math.random() * 90;
          break;
        case 2: // bottom
          startX = Math.random() * width;
          startY = height + padding;
          angle = 225 + Math.random() * 90;
          break;
        case 3: // left
          startX = -padding;
          startY = Math.random() * height;
          angle = -45 + Math.random() * 90;
          break;
      }

      setEffects((prev) => [
        ...prev,
        { id, type, startX, startY, angle, travelDistance },
      ]);
    }, [width, height, enableStars, enableComets]);

    useImperativeHandle(ref, () => ({
      triggerRandom,
    }));

    const removeEffect = useCallback((id: number) => {
      setEffects((prev) => prev.filter((e) => e.id !== id));
    }, []);

    useEffect(() => {
      if (!autoSpawn) return;

      const interval = setInterval(() => {
        if (Math.random() > 0.98) {
          // ~2% chance every 1s
          triggerRandom();
        }
      }, 1000);

      return () => clearInterval(interval);
    }, [autoSpawn, triggerRandom]);

    return (
      <>
        {effects.map((effect) =>
          effect.type === "comet" ? (
            <Comet
              key={effect.id}
              startX={effect.startX}
              startY={effect.startY}
              angle={effect.angle}
              travelDistance={effect.travelDistance}
              onComplete={() => removeEffect(effect.id)}
            />
          ) : (
            <FallingStar
              key={effect.id}
              startX={effect.startX}
              startY={effect.startY}
              angle={effect.angle}
              travelDistance={effect.travelDistance}
              onComplete={() => removeEffect(effect.id)}
            />
          )
        )}
      </>
    );
  }
);

CelestialEffectManager.displayName = "CelestialEffectManager";
