"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";

export default function ConstellationBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stars, setStars] = useState<
    { ra: number; dec: number; x: number; y: number }[]
  >([]);
  const [connections, setConnections] = useState<number[][]>([]);
  const [name, setName] = useState("New Constellation");

  // Sky Map Position Offsets
  const [targetRa, setTargetRa] = useState<number>(0);
  const [targetDec, setTargetDec] = useState<number>(0);

  // Image Overlay State
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.4);
  const [bgScale, setBgScale] = useState(1);
  const [bgX, setBgX] = useState(0);
  const [bgY, setBgY] = useState(0);

  // Viewport Settings
  const width = 800;
  const height = 600;
  const scale = 30;
  const offsetX = width / 2;
  const offsetY = height / 2;

  // Calculates LOCAL ra/dec around a 0,0 center
  const screenToRaDec = (x: number, y: number) => {
    const ra = (x - offsetX) / (15 * scale);
    const dec = -(y - offsetY) / scale;
    return { ra, dec };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { ra, dec } = screenToRaDec(x, y);

    const newStarIndex = stars.length;
    setStars([...stars, { ra, dec, x, y }]);

    if (newStarIndex > 0) {
      setConnections([...connections, [newStarIndex - 1, newStarIndex]]);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw Coordinate Axes (Center is local 0,0)
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(width, offsetY);
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, height);
    ctx.stroke();

    // Draw Connections
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
      const p1 = stars[start];
      const p2 = stars[end];
      if (!p1 || !p2) return;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // Draw Stars
    stars.forEach((star, i) => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "12px monospace";
      ctx.fillText(`[${i}]`, star.x + 8, star.y + 4);
    });
  }, [stars, connections, offsetX, offsetY]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setBgImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLastStar = () => {
    if (stars.length === 0) return;
    setStars(stars.slice(0, -1));
    setConnections(
      connections.filter(
        (c) => c[0] !== stars.length - 1 && c[1] !== stars.length - 1,
      ),
    );
  };

  const clearAll = () => {
    setStars([]);
    setConnections([]);
  };

  const exportJSON = () => {
    const output = {
      name,
      description: "Custom built constellation.",
      redirect: `/${name.toLowerCase().replace(/\s+/g, "-")}`,
      id: name.toLowerCase().replace(/\s+/g, "-"),
      stars: stars.map((s, i) => ({
        // Shift all values by the global target offset
        ra: Number((s.ra + targetRa).toFixed(2)),
        dec: Number((s.dec + targetDec).toFixed(2)),
        magnitude: 3.0,
        name: `Star ${i}`,
      })),
      connections,
    };
    return JSON.stringify(output, null, 2);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-zinc-950 min-h-screen text-white font-sans">
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Constellation Builder</h2>
          <p className="text-zinc-400 text-sm">
            Trace in the center, and use the offsets panel to move it to the
            real sky map position.
          </p>
        </div>

        <div
          className="relative border border-zinc-800 rounded-xl overflow-hidden shadow-2xl bg-[#020205] inline-block"
          style={{ width, height }}
        >
          {bgImage && (
            <img
              src={bgImage}
              alt="Reference"
              className="absolute pointer-events-none transform-gpu"
              style={{
                opacity: bgOpacity,
                transform: `translate(${bgX}px, ${bgY}px) scale(${bgScale})`,
                transformOrigin: "center",
                left: "50%",
                top: "50%",
                marginLeft: "-50%",
                marginTop: "-50%",
              }}
            />
          )}

          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onClick={handleCanvasClick}
            className="absolute inset-0 cursor-crosshair z-10"
          />
        </div>

        {/* Image Controls */}
        <div className="flex flex-wrap gap-3 items-center bg-zinc-900 border border-zinc-800 p-4 rounded-xl max-w-[800px]">
          <div className="flex flex-col gap-1 mr-4">
            <label className="text-xs font-bold text-zinc-400">
              Reference Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-xs text-zinc-300 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer w-48"
            />
          </div>

          {bgImage && (
            <>
              <div className="flex flex-col gap-1 w-20">
                <label className="text-[10px] text-zinc-400 flex justify-between">
                  <span>Opacity</span>
                  <span>{bgOpacity.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={bgOpacity}
                  onChange={(e) => setBgOpacity(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1 w-20">
                <label className="text-[10px] text-zinc-400 flex justify-between">
                  <span>Scale</span>
                  <span>{bgScale.toFixed(2)}x</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={bgScale}
                  onChange={(e) => setBgScale(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1 w-20">
                <label className="text-[10px] text-zinc-400 flex justify-between">
                  <span>X Pos</span>
                  <span>{bgX}px</span>
                </label>
                <input
                  type="range"
                  min="-400"
                  max="400"
                  step="5"
                  value={bgX}
                  onChange={(e) => setBgX(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1 w-20">
                <label className="text-[10px] text-zinc-400 flex justify-between">
                  <span>Y Pos</span>
                  <span>{bgY}px</span>
                </label>
                <input
                  type="range"
                  min="-300"
                  max="300"
                  step="5"
                  value={bgY}
                  onChange={(e) => setBgY(Number(e.target.value))}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={removeLastStar}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            Undo Last Star
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 bg-red-900/50 hover:bg-red-900/80 text-red-200 rounded-lg text-sm font-medium transition-colors"
          >
            Clear Map
          </button>
        </div>
        <p className="text-sm text-zinc-500">
          This is intended for developers who want to create new constellations
          for my StarMap component.
        </p>
      </div>

      {/* Settings & Export Panel */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4">
        {/* Name & Target Sky Position */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-300">
              Constellation Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-300">
              Sky Position Offset
            </label>
            <p className="text-xs text-zinc-500 mb-1">
              Add these exact coordinates to all traced points (acts as the
              center hub of your constellation).
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-zinc-400 block mb-1">
                  Target RA (Hours)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={targetRa}
                  onChange={(e) => setTargetRa(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-400 block mb-1">
                  Target Dec (Degrees)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={targetDec}
                  onChange={(e) =>
                    setTargetDec(parseFloat(e.target.value) || 0)
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Export Data */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 flex-1 min-h-[300px]">
          <label className="text-sm font-bold text-zinc-300">
            Generated JSON
          </label>
          <div className="relative flex-1">
            <textarea
              readOnly
              value={exportJSON()}
              className="absolute inset-0 w-full h-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-blue-300 resize-none outline-none"
            />
            <button
              onClick={() => navigator.clipboard.writeText(exportJSON())}
              className="absolute top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
