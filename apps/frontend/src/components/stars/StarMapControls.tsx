import { StarIcon } from "@/components/icons/StarIcon";

interface StarMapControlsProps {
  onReset: () => void;
  showCompass: boolean;
  onToggleCompass: () => void;
}

export function StarMapControls({
  onReset,
  showCompass,
  onToggleCompass,
}: StarMapControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-50">
      {/* Control Panel: StarCard style */}
      <div className="bg-(--star-card-bg,rgba(0,0,0,0.4)) backdrop-blur-xl border border-(--star-card-border,var(--color-zinc-800)) rounded-xl p-1.5 flex flex-col gap-1.5 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
        {/* Reset Button */}
        <button
          onClick={onReset}
          className="group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-(--star-card-border-hover,var(--color-zinc-700))"
          title="Reset View"
        >
          <svg
            className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        {/* Divider */}
        <div className="h-px bg-(--star-card-border,var(--color-zinc-800)) mx-1" />

        {/* Compass Toggle */}
        <button
          onClick={onToggleCompass}
          className={`group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 border ${
            showCompass
              ? "bg-white/10 border-(--star-card-border-hover,var(--color-zinc-700)) shadow-[0_0_12px_rgba(255,255,255,0.1)]"
              : "border-transparent hover:bg-white/5 hover:border-(--star-card-border-hover,var(--color-zinc-700))"
          }`}
          title={showCompass ? "Hide Waypoint" : "Show Waypoint"}
        >
          <StarIcon
            size={20}
            className={`transition-colors ${
              showCompass
                ? "text-white"
                : "text-slate-300 group-hover:text-white"
            }`}
          />
          {showCompass && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
