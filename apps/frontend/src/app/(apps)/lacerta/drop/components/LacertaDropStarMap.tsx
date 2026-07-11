"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { StarMap } from "@/components/stars/StarMap";
import { REFERENCE_CONSTELLATIONS } from "@/lib/constellations";
import { Constellation } from "@/types/constellation";
import { Peer } from "../use-lacerta-sharing";

interface LacertaDropStarMapProps {
  peers: Peer[];
  myConstellation: any | null;
  currentUser: any;
  isHidden: boolean;
  onSelectPeer: (peerId: string) => void;
  onToggleVisibility: () => void;
  transfer: any;
  onCancelTransfer: () => void;
}

// Formatting helpers for inline transfer progress info
const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatSpeed = (bytesPerSec: number): string => {
  if (!bytesPerSec || bytesPerSec === 0) return "0 B/s";
  return `${formatSize(bytesPerSec)}/s`;
};

// Simple hash function for stable positions and constellation assignments
const hashStringToFloat = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs((hash % 1000) / 1000);
};

// Translates a constellation to center at target RA and Dec
const shiftConstellation = (
  constellation: any,
  targetRa: number,
  targetDec: number,
) => {
  if (!constellation.stars || constellation.stars.length === 0)
    return constellation;

  let sumRa = 0;
  let sumDec = 0;
  constellation.stars.forEach((s: any) => {
    sumRa += s.ra;
    sumDec += s.dec;
  });
  const avgRa = sumRa / constellation.stars.length;
  const avgDec = sumDec / constellation.stars.length;

  const shiftedStars = constellation.stars.map((s: any) => ({
    ...s,
    ra: Number((s.ra - avgRa + targetRa).toFixed(2)),
    dec: Number((s.dec - avgDec + targetDec).toFixed(2)),
  }));

  return {
    ...constellation,
    stars: shiftedStars,
  };
};

export function LacertaDropStarMap({
  peers,
  myConstellation,
  currentUser,
  isHidden,
  onSelectPeer,
  onToggleVisibility,
  transfer,
  onCancelTransfer,
}: LacertaDropStarMapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth || 600,
          height: clientHeight || 350,
        });
      }
    };

    if (containerRef.current) {
      updateDimensions();
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver?.disconnect();
    };
  }, []);

  // Build dynamic list of constellations to display
  const displayConstellations = useMemo(() => {
    const list: Constellation[] = [];

    // 1. Add Self Constellation (centered at 0, 0)
    let selfBase = myConstellation;
    if (!selfBase && currentUser?.username) {
      const idx = Math.floor(
        hashStringToFloat(currentUser.username) *
          REFERENCE_CONSTELLATIONS.length,
      );
      selfBase = REFERENCE_CONSTELLATIONS[idx];
    }

    if (selfBase) {
      const selfShifted = shiftConstellation(selfBase, 0, 0);
      const selfStarColor = isHidden ? "#374151" : "var(--primary)";
      const selfConnectionColor = isHidden
        ? "rgba(55, 65, 81, 0.25)"
        : "var(--primary)";

      list.push({
        ...selfShifted,
        id: "self",
        name: `Me (This Device)`,
        starColor: selfStarColor,
        connectionColor: selfConnectionColor,
      } as Constellation);
    }

    // 2. Sort peers by socketId for stable coordinate mapping
    const sortedPeers = [...peers].sort((a, b) =>
      a.socketId.localeCompare(b.socketId),
    );

    // 3. Add Discovered Peers (distributed procedurally with stable random offsets and randomized hues)
    sortedPeers.forEach((peer) => {
      // Procedurally generate a stable, random position for the peer based on their unique socketId
      const angleHash = hashStringToFloat(peer.socketId + "-angle");
      const angle = angleHash * 2 * Math.PI;

      // Distribute within a random radius range
      const distHash = hashStringToFloat(peer.socketId + "-radius");
      const raRadius = 6.0 + distHash * 10.0;
      const decRadius = 35.0 + distHash * 50.0;

      const raOffset = raRadius * Math.cos(angle);
      const decOffset = decRadius * Math.sin(angle);

      // Select default base if none provided
      let peerBase = peer.constellation;
      if (typeof peerBase === "string") {
        try {
          peerBase = JSON.parse(peerBase);
        } catch (e) {
          peerBase = null;
        }
      }

      if (!peerBase) {
        const idx = Math.floor(
          hashStringToFloat(peer.userId) * REFERENCE_CONSTELLATIONS.length,
        );
        peerBase = REFERENCE_CONSTELLATIONS[idx];
      }

      if (peerBase) {
        const peerShifted = shiftConstellation(peerBase, raOffset, decOffset);
        const isMyDevice = peer.userId === currentUser?.id;
        const displayName = isMyDevice
          ? `My Device (${peer.deviceName.split(" ")[0]})`
          : `@${peer.username} (${peer.deviceName.split(" ")[0]})`;

        // Generate stable random color based on peer socketId
        const colorHash = hashStringToFloat(peer.socketId + "-color");
        const hue = Math.floor(colorHash * 360);
        const starColor = `hsl(${hue}, 85%, 65%)`;
        const connectionColor = `hsla(${hue}, 85%, 65%, 0.55)`;

        list.push({
          ...peerShifted,
          id: peer.socketId,
          name: displayName,
          starColor,
          connectionColor,
        } as Constellation);
      }
    });

    return list;
  }, [peers, myConstellation, currentUser]);

  const activeTransferMapProp = useMemo(() => {
    if (
      transfer &&
      ["transferring", "encrypting", "decrypting", "connecting"].includes(
        transfer.status,
      )
    ) {
      return {
        constellationId: transfer.peerId,
        progress: transfer.progress,
        direction: transfer.direction,
        filesCount: transfer.files.length,
        currentFileIndex: transfer.currentFileIndex,
      };
    }
    return undefined;
  }, [transfer]);

  const handleConstellationClick = (selected: Constellation) => {
    if (selected.id === "self") {
      onToggleVisibility();
    } else {
      onSelectPeer(selected.id);
    }
  };

  return (
    <div className="bg-slate-950 border-0 rounded-none sm:border sm:border-border sm:rounded-2xl flex flex-col relative overflow-hidden flex-1 w-full h-full min-h-[450px]">
      {/* Floating Header Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none select-none hidden sm:flex">
        <div className="flex items-center gap-2 bg-background/40 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border/40 shadow-xl">
          <div
            className={`h-2.5 w-2.5 rounded-full ${isHidden ? "bg-amber-400" : "bg-emerald-400"} animate-pulse`}
          />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground/90">
            {isHidden
              ? "Discovery Paused"
              : `Network Map (${peers.length} online)`}
          </span>
        </div>
      </div>

      {/* StarMap view container (edge-to-edge) */}
      <div
        ref={containerRef}
        className="w-full h-full flex-1 flex items-center justify-center min-h-[350px] relative"
      >
        {dimensions.width > 0 && dimensions.height > 0 && (
          <StarMap
            width={dimensions.width}
            height={dimensions.height}
            constellations={displayConstellations}
            onConstellationClick={handleConstellationClick}
            defaultZoom={0.9}
            activeTransfer={activeTransferMapProp}
            className="w-full h-full"
          >
            {/* Overlay name labels in World Space (relative to centers of constellations) */}
            {displayConstellations.map((c) => {
              if (!c.stars || c.stars.length === 0) return null;
              let sumRa = 0;
              let sumDec = 0;
              c.stars.forEach((s) => {
                sumRa += s.ra;
                sumDec += s.dec;
              });
              const avgRa = sumRa / c.stars.length;
              const avgDec = sumDec / c.stars.length;

              const x = avgRa * 15 * 30; // base scale is 30, RA scaling factor is 15
              const y = -avgDec * 30;

              const isSelf = c.id === "self";
              const isTransferringThisNode =
                transfer &&
                ((transfer.direction === "send" && transfer.peerId === c.id) ||
                  (transfer.direction === "receive" &&
                    c.id === "self" &&
                    [
                      "transferring",
                      "encrypting",
                      "decrypting",
                      "connecting",
                    ].includes(transfer.status)));

              if (isTransferringThisNode) {
                return (
                  <div
                    key={c.id}
                    style={{
                      position: "absolute",
                      left: x,
                      top: y - 95,
                      transform: "translate(-50%, -50%)",
                      borderColor: isSelf ? undefined : c.connectionColor,
                      color: isSelf ? undefined : c.starColor,
                      backgroundColor: isSelf
                        ? undefined
                        : c.connectionColor?.replace("0.55", "0.20"),
                    }}
                    className={`text-xs font-mono font-bold px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl select-none min-w-[170px] flex flex-col gap-2.5 transition-all ${
                      isSelf
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "hover:brightness-110"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[9px] uppercase font-bold tracking-wider opacity-80">
                      <span>{isSelf ? "Receiving" : "Sending"}</span>
                      <span className="font-mono text-foreground font-bold">
                        {transfer.progress}%
                      </span>
                    </div>
                    <div
                      className="font-semibold truncate text-[11px] max-w-[145px]"
                      title={transfer.files[transfer.currentFileIndex]?.name}
                    >
                      {transfer.files[transfer.currentFileIndex]?.name ||
                        "Preparing file..."}
                    </div>
                    <div className="w-full h-1 bg-secondary rounded-full overflow-hidden border border-border/10">
                      <div
                        style={{ width: `${transfer.progress}%` }}
                        className="h-full bg-primary transition-all duration-150"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold">
                      <span>{formatSpeed(transfer.speed)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelTransfer();
                        }}
                        className="text-destructive font-bold hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={c.id}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y - 65,
                    transform: "translate(-50%, -50%)",
                    borderColor: isSelf ? undefined : c.connectionColor,
                    color: isSelf ? undefined : c.starColor,
                    backgroundColor: isSelf
                      ? undefined
                      : c.connectionColor?.replace("0.55", "0.15"),
                  }}
                  className={`text-sm font-mono font-bold px-3.5 py-1.5 rounded-lg border backdrop-blur-md shadow-xl select-none transition-all cursor-pointer ${
                    isSelf
                      ? isHidden
                        ? "bg-slate-800/10 border-slate-700/40 text-slate-500 hover:bg-slate-800/20 line-through decoration-slate-600/50"
                        : "bg-primary/15 border-primary text-primary hover:bg-primary/25 shadow-lg shadow-primary/20 ring-2 ring-primary/30"
                      : "hover:brightness-110"
                  }`}
                >
                  {c.name} {isSelf && isHidden && " (Hidden)"}
                </div>
              );
            })}
          </StarMap>
        )}

        {/* Empty list scanning message overlay */}
        {!isHidden && peers.length === 0 && (
          <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none text-center p-4 bg-background/10 backdrop-blur-xs">
            <p className="text-sm font-semibold text-foreground/80 bg-background/60 border border-border/30 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl">
              No other active devices detected on the network.
            </p>
          </div>
        )}
      </div>

      {/* Floating Footer Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none hidden sm:block">
        <div className="bg-background/40 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border/40 shadow-xl text-[10px] text-muted-foreground font-mono font-bold text-center whitespace-nowrap">
          Click a peer constellation on the StarMap to select files and initiate
          a transfer.
        </div>
      </div>
    </div>
  );
}
