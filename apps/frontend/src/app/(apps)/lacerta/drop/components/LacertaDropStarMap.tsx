"use client";

import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { X, Monitor, Smartphone, Tablet, EyeOff, FileIcon, Globe, Server as ServerIcon, Terminal } from "lucide-react";
import { StarMap, MeteorPosition, StarMapHandle } from "@/components/stars/StarMap";
import { REFERENCE_CONSTELLATIONS } from "@/lib/constellations";
import { Constellation } from "@/types/constellation";
import { Peer, TransferState } from "../use-lacerta-sharing";
import { useRrDevice } from "@/hooks/useRrDevice";

interface LacertaDropStarMapProps {
  peers: Peer[];
  myConstellation: any | null;
  currentUser: any;
  isHidden: boolean;
  onSelectPeer: (peerId: string) => void;
  onToggleVisibility: () => void;
  transfers: Record<string, TransferState>;
  onCancelTransfer: (batchId: string) => void;
  onDismissTransfer?: (batchId: string) => void;
  myGuestAlias?: string;
}

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

  return { ...constellation, stars: shiftedStars };
};

// Map peer deviceType string to a lucide icon component
function DeviceIcon({
  deviceType,
  size = 11,
  className = "",
}: {
  deviceType: string;
  size?: number;
  className?: string;
}) {
  if (deviceType === "mobile") return <Smartphone size={size} className={className} />;
  if (deviceType === "tablet") return <Tablet size={size} className={className} />;
  if (deviceType === "web") return <Globe size={size} className={className} />;
  if (deviceType === "server") return <ServerIcon size={size} className={className} />;
  if (deviceType === "headless") return <Terminal size={size} className={className} />;
  return <Monitor size={size} className={className} />;
}

// Avatar component — shows profile image or styled initials fallback
function PeerAvatar({
  avatarUrl,
  username,
  color,
  size = 32,
}: {
  avatarUrl?: string;
  username: string;
  color: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = username.slice(0, 2).toUpperCase();

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, border: `1.5px solid ${color}55` }}
      />
    );
  }

  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}22`,
        border: `1.5px solid ${color}55`,
        color: color,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}

export function LacertaDropStarMap({
  peers,
  myConstellation,
  currentUser,
  isHidden,
  onSelectPeer,
  onToggleVisibility,
  transfers,
  onCancelTransfer,
  onDismissTransfer,
  myGuestAlias,
}: LacertaDropStarMapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const starMapRef = useRef<StarMapHandle>(null);
  const navigatedRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const myDeviceLabel = useRrDevice();

  // Meteor head positions written by canvas draw loop — stored in a ref (never setState)
  const meteorPositionsRef = useRef<MeteorPosition[]>([]);
  const [meteorTick, setMeteorTick] = useState(0);
  const meteorRafRef = useRef<number | null>(null);

  const onMeteorPositions = useCallback((positions: MeteorPosition[]) => {
    meteorPositionsRef.current = positions;
  }, []);

  const hasActiveTransfers = Object.values(transfers).some((t) =>
    ["transferring", "encrypting", "decrypting", "connecting"].includes(t.status)
  );

  useEffect(() => {
    if (!hasActiveTransfers) {
      if (meteorRafRef.current !== null) {
        cancelAnimationFrame(meteorRafRef.current);
        meteorRafRef.current = null;
      }
      return;
    }
    const tick = () => {
      setMeteorTick((n) => n + 1);
      meteorRafRef.current = requestAnimationFrame(tick);
    };
    meteorRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (meteorRafRef.current !== null) {
        cancelAnimationFrame(meteorRafRef.current);
        meteorRafRef.current = null;
      }
    };
  }, [hasActiveTransfers]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const currentMeteorPositions = meteorTick >= 0 ? meteorPositionsRef.current : [];

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth || 600, height: clientHeight || 350 });
      }
    };
    if (containerRef.current) {
      updateDimensions();
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver?.disconnect();
  }, []);

  const displayConstellations = useMemo(() => {
    const list: Constellation[] = [];

    // Self constellation at origin
    let selfBase = myConstellation;
    const selfUsername = currentUser?.username || myGuestAlias;
    if (!selfBase && selfUsername) {
      const idx = Math.floor(
        hashStringToFloat(selfUsername) * REFERENCE_CONSTELLATIONS.length,
      );
      selfBase = REFERENCE_CONSTELLATIONS[idx];
    }
    if (selfBase) {
      const selfShifted = shiftConstellation(selfBase, 0, 0);
      const selfStarColor = isHidden ? "#374151" : "var(--primary)";
      const selfConnectionColor = isHidden ? "rgba(55, 65, 81, 0.25)" : "var(--primary)";
      list.push({
        ...selfShifted,
        id: "self",
        name: "Me",
        starColor: selfStarColor,
        connectionColor: selfConnectionColor,
      } as Constellation);
    }

    // Peers distributed procedurally
    const sortedPeers = [...peers].sort((a, b) => a.socketId.localeCompare(b.socketId));
    sortedPeers.forEach((peer) => {
      const angleHash = hashStringToFloat(peer.socketId + "-angle");
      const angle = angleHash * 2 * Math.PI;
      const distHash = hashStringToFloat(peer.socketId + "-radius");
      const raOffset = (6.0 + distHash * 10.0) * Math.cos(angle);
      const decOffset = (35.0 + distHash * 50.0) * Math.sin(angle);

      let peerBase = peer.constellation;
      if (typeof peerBase === "string") {
        try { peerBase = JSON.parse(peerBase); } catch { peerBase = null; }
      }
      if (!peerBase) {
        peerBase = REFERENCE_CONSTELLATIONS[
          Math.floor(hashStringToFloat(peer.userId) * REFERENCE_CONSTELLATIONS.length)
        ];
      }
      if (peerBase) {
        const peerShifted = shiftConstellation(peerBase, raOffset, decOffset);
        const colorHash = hashStringToFloat(peer.socketId + "-color");
        const hue = Math.floor(colorHash * 360);
        list.push({
          ...peerShifted,
          id: peer.socketId,
          name: `@${peer.username}`,
          starColor: `hsl(${hue}, 85%, 65%)`,
          connectionColor: `hsla(${hue}, 85%, 65%, 0.55)`,
        } as Constellation);
      }
    });

    return list;
  }, [peers, myConstellation, currentUser, isHidden]);

  const activeTransfersProp = useMemo(() => {
    return Object.values(transfers)
      .filter((t) => ["transferring", "encrypting", "decrypting", "connecting"].includes(t.status))
      .map((t) => ({
        batchId: t.batchId,
        constellationId: t.peerId,
        direction: t.direction,
        files: t.files.map((f) => ({ name: f.name, size: f.size, progress: f.progress, status: f.status })),
      }));
  }, [transfers]);

  const handleConstellationClick = (selected: Constellation) => {
    if (selected.id === "self") {
      onToggleVisibility();
    } else {
      onSelectPeer(selected.id);
    }
  };

  // Build a lookup from constellation id -> peer (for the card rendering)
  const peerById = useMemo(() => {
    const map: Record<string, Peer> = {};
    peers.forEach((p) => { map[p.socketId] = p; });
    return map;
  }, [peers]);

  useEffect(() => {
    if (navigatedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const constellationId = params.get("constellation");
    if (constellationId && displayConstellations.length > 0) {
      const matched = displayConstellations.find(
        (c) =>
          c.id.toLowerCase() === constellationId.toLowerCase() ||
          c.name.toLowerCase() === constellationId.toLowerCase() ||
          c.name.toLowerCase() === `@${constellationId.toLowerCase()}`
      );
      if (matched) {
        navigatedRef.current = true;
        const timer = setTimeout(() => {
          starMapRef.current?.navigateToConstellation(matched.name);
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [displayConstellations]);

  return (
    <div className="bg-slate-950 border-0 rounded-none sm:border sm:border-border sm:rounded-2xl flex flex-col relative overflow-hidden flex-1 w-full h-full min-h-[450px]">
      {/* StarMap container — edge to edge */}
      <div
        ref={containerRef}
        className="w-full h-full flex-1 flex items-center justify-center min-h-[350px] relative"
      >
        {dimensions.width > 0 && dimensions.height > 0 && (
          <StarMap
            ref={starMapRef}
            width={dimensions.width}
            height={dimensions.height}
            constellations={displayConstellations}
            onConstellationClick={handleConstellationClick}
            defaultZoom={0.9}
            activeTransfers={activeTransfersProp}
            onMeteorPositions={onMeteorPositions}
            className="w-full h-full"
            effects={
              /* Screen-space meteor transfer cards — follow each comet head */
              <>
                {currentMeteorPositions.map((mp) => {
                  const transfer = transfers[mp.batchId];
                  if (!transfer) return null;
                  const file = transfer.files[mp.fileIndex];
                  if (!file) return null;

                  return (
                    <div
                      key={`meteor-card-${mp.batchId}-${mp.fileIndex}`}
                      className="absolute pointer-events-auto select-none"
                      style={{
                        left: mp.x,
                        top: mp.y,
                        transform: "translate(18px, -50%)",
                        zIndex: 20,
                        transition: "left 0.04s linear, top 0.04s linear",
                      }}
                    >
                      <div
                        className="flex flex-col gap-1.5 px-3 py-2 rounded-xl backdrop-blur-xl shadow-2xl"
                        style={{
                          background: "rgba(0,0,0,0.72)",
                          borderLeft: `3px solid ${mp.color}`,
                          border: `1px solid ${mp.color}33`,
                          borderLeftWidth: "3px",
                          minWidth: "150px",
                          maxWidth: "210px",
                          boxShadow: `0 0 16px ${mp.color}22, 0 4px 24px rgba(0,0,0,0.5)`,
                        }}
                      >
                        {/* File row */}
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileIcon size={10} style={{ color: mp.color, flexShrink: 0 }} />
                            <span
                              className="text-[10px] font-mono font-bold truncate leading-none"
                              style={{ color: mp.color }}
                              title={file.name}
                            >
                              {file.name}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onCancelTransfer(mp.batchId); }}
                            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                            title="Cancel transfer"
                          >
                            <X size={9} style={{ color: mp.color }} />
                          </button>
                        </div>

                        {/* Progress bar */}
                        <div
                          className="h-[2px] w-full rounded-full overflow-hidden"
                          style={{ backgroundColor: `${mp.color}20` }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${file.progress}%`, backgroundColor: mp.color, transition: "width 0.2s linear" }}
                          />
                        </div>

                        {/* Stats */}
                        <div className="flex justify-between text-[9px] font-mono leading-none" style={{ color: `${mp.color}99` }}>
                          <span>{file.progress}%</span>
                          {file.speed > 0 && (
                            <span>
                              {file.speed > 1024 * 1024
                                ? `${(file.speed / 1024 / 1024).toFixed(1)} MB/s`
                                : `${(file.speed / 1024).toFixed(0)} KB/s`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            }
          >
            {/* World-space constellation cards — pan and zoom with the map */}
            {displayConstellations.map((c) => {
              if (!c.stars || c.stars.length === 0) return null;

              // Compute centroid in world-space coordinates
              let sumRa = 0;
              let sumDec = 0;
              c.stars.forEach((s) => { sumRa += s.ra; sumDec += s.dec; });
              const avgRa = sumRa / c.stars.length;
              const avgDec = sumDec / c.stars.length;
              // World-space pixel coords (matches StarMap raDecToScreen at zoom=1, offset=0)
              const x = avgRa * 15 * 30;
              const y = -avgDec * 30;

              const isSelf = c.id === "self";
              const peer = isSelf ? null : peerById[c.id];

              // Find active transfers for this node
              const nodeTransfers = Object.values(transfers).filter(
                (t) =>
                  ["transferring", "encrypting", "decrypting", "connecting"].includes(t.status) &&
                  (t.peerId === c.id || (isSelf && t.direction === "receive"))
              );
              const hasNodeTransfer = nodeTransfers.length > 0;
              const avgProgress = hasNodeTransfer
                ? Math.round(
                    nodeTransfers.reduce(
                      (acc, t) => acc + t.files.reduce((s, f) => s + f.progress, 0) / t.files.length,
                      0
                    ) / nodeTransfers.length
                  )
                : 0;

              // Color for this card
              const glowColor = isSelf
                ? isHidden ? "#374151" : "var(--primary)"
                : c.starColor || "#ffffff";

              const cardStyle: React.CSSProperties = {
                position: "absolute",
                left: x,
                // Anchor below the constellation centroid
                top: y + 68,
                transform: "translate(-50%, 0)",
                zIndex: 10,
              };

              if (isSelf) {
                return (
                  <div key="self" style={cardStyle}>
                    <button
                      onClick={() => handleConstellationClick(c)}
                      className="flex flex-col gap-0 rounded-xl backdrop-blur-xl cursor-pointer group select-none"
                      style={{
                        background: "rgba(0,0,0,0.70)",
                        border: `1px solid ${isHidden ? "#37415155" : "var(--primary)"}`,
                        boxShadow: isHidden
                          ? "none"
                          : `0 0 18px var(--primary-foreground, #fff)11, 0 4px 24px rgba(0,0,0,0.5)`,
                        minWidth: "140px",
                        overflow: "hidden",
                      }}
                    >
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        {/* Self avatar */}
                        <PeerAvatar
                          avatarUrl={currentUser?.avatarUrl ?? undefined}
                          username={currentUser?.displayName || currentUser?.username || myGuestAlias || "Me"}
                          color={isHidden ? "#374151" : "var(--primary)"}
                          size={30}
                        />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span
                            className="text-[11px] font-bold font-mono leading-none truncate"
                            style={{ color: isHidden ? "#6B7280" : "var(--primary)" }}
                          >
                            {currentUser?.displayName || currentUser?.username || myGuestAlias || "You"}
                          </span>
                          <div
                            className="flex items-center gap-1 text-[9px] font-mono leading-none"
                            style={{ color: isHidden ? "#4B556399" : "var(--primary-foreground, #fff)77" }}
                          >
                            <Monitor size={9} />
                            <span className="truncate max-w-[90px]">{myDeviceLabel}</span>
                            {isHidden && <EyeOff size={9} className="shrink-0" />}
                          </div>
                        </div>
                      </div>

                      {/* Active transfer progress bar at bottom */}
                      {hasNodeTransfer && (
                        <div className="w-full h-[2px] bg-black/40">
                          <div
                            className="h-full transition-all duration-300"
                            style={{ width: `${avgProgress}%`, backgroundColor: "var(--primary)" }}
                          />
                        </div>
                      )}
                    </button>
                  </div>
                );
              }

              // Peer card
              if (!peer) return null;
              return (
                <div key={c.id} style={cardStyle}>
                  <button
                    onClick={() => handleConstellationClick(c)}
                    className="flex flex-col gap-0 rounded-xl backdrop-blur-xl cursor-pointer group select-none transition-all duration-150 hover:brightness-110 active:scale-95"
                    style={{
                      background: "rgba(0,0,0,0.70)",
                      border: `1px solid ${glowColor}44`,
                      boxShadow: hasNodeTransfer
                        ? `0 0 0 2px ${glowColor}55, 0 0 24px ${glowColor}33, 0 4px 24px rgba(0,0,0,0.5)`
                        : `0 0 14px ${glowColor}18, 0 4px 24px rgba(0,0,0,0.5)`,
                      minWidth: "148px",
                      overflow: "hidden",
                    }}
                  >
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <PeerAvatar
                        avatarUrl={peer.avatarUrl}
                        username={peer.username}
                        color={glowColor}
                        size={30}
                      />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span
                          className="text-[11px] font-bold font-mono leading-none truncate"
                          style={{ color: glowColor }}
                        >
                          @{peer.username}
                        </span>
                        <div
                          className="flex items-center gap-1 text-[9px] font-mono leading-none truncate"
                          style={{ color: `${glowColor}88` }}
                        >
                          <DeviceIcon deviceType={peer.deviceType} size={9} />
                          <span className="truncate max-w-[90px]">{peer.deviceName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Active transfer progress bar at bottom */}
                    {hasNodeTransfer && (
                      <div className="w-full h-[2px]" style={{ backgroundColor: `${glowColor}22` }}>
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${avgProgress}%`, backgroundColor: glowColor }}
                        />
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </StarMap>
        )}

        {/* Scanning overlay when no peers found */}
        {!isHidden && peers.length === 0 && (
          <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none text-center p-4">
            <p className="text-xs font-mono font-semibold text-foreground/60 bg-black/60 border border-border/20 px-5 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl tracking-wide">
              Scanning for devices on this network…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
