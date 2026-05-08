import React from "react";

interface StarIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  intensity?: number;
  showFlare?: boolean;
  showGlow?: boolean;
}

export const StarIcon = ({
  size = 24,
  intensity = 1,
  showFlare = true,
  showGlow = true,
  className = "",
  ...props
}: StarIconProps) => {
  // Map intensity to opacity values
  const starOpacity = 0.5 + intensity * 0.5;
  const flareOpacity = 0.4 + intensity * 0.6;
  const glowOpacity = intensity * 0.4;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main Glow */}
      {showGlow && (
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="white"
          fillOpacity={glowOpacity}
          style={{ filter: "blur(15px)" }}
        />
      )}

      {/* Flare Lines */}
      {showFlare && (
        <g stroke="white" strokeWidth="2" strokeOpacity={flareOpacity}>
          {/* Vertical Flare */}
          <line x1="50" y1="10" x2="50" y2="90" />
          {/* Horizontal Flare */}
          <line x1="10" y1="50" x2="90" y2="50" />
        </g>
      )}

      {/* Main Star Body (Curved Diamond) */}
      <path
        d="M50 20 
           Q53 47 80 50 
           Q53 53 50 80 
           Q47 53 20 50 
           Q47 47 50 20Z"
        fill="white"
        fillOpacity={starOpacity}
      />

      {/* Center Core */}
      <circle cx="50" cy="50" r="2" fill="white" />
    </svg>
  );
};
