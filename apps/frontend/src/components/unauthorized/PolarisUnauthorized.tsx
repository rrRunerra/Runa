"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Compass, ShieldAlert } from "lucide-react";

import { StarIcon } from "@/components/icons/StarIcon";

interface PolarisUnauthorizedProps {
  message?: string;
  returnUrl?: string;
}

export default function PolarisUnauthorized({
  message = "You don't have permission to access the Polaris dashboard.",
  returnUrl = "/polaris/dash",
}: PolarisUnauthorizedProps): React.JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center overflow-hidden selection:bg-sky-500/30">
      {/* Constellation Background SVG */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
        {/* Polaris (North Star) - The anchoring point, very large and bright */}
        <div className="absolute top-[15%] left-[60%] -translate-x-1/2 -translate-y-1/2 z-10 text-sky-300">
          <StarIcon size={40} intensity={0.9} showFlare={true} showGlow={true} className="text-sky-300" />
        </div>

        {/* Ursa Minor (Little Dipper) stars - Static */}
        <div className="absolute top-[25%] left-[55%] -translate-x-1/2 -translate-y-1/2 text-sky-400">
          <div className="w-2.5 h-2.5 bg-sky-400 rounded-full shadow-[0_0_12px_2px_currentColor]" />
        </div>
        <div className="absolute top-[35%] left-[52%] -translate-x-1/2 -translate-y-1/2 text-sky-400/80">
          <div className="w-2 h-2 bg-sky-400/80 rounded-full shadow-[0_0_10px_2px_currentColor]" />
        </div>
        
        {/* Bowl stars */}
        <div className="absolute top-[45%] left-[45%] -translate-x-1/2 -translate-y-1/2 text-sky-300">
          <div className="w-3 h-3 bg-sky-300 rounded-full shadow-[0_0_15px_3px_currentColor]" />
        </div>
        <div className="absolute top-[42%] left-[30%] -translate-x-1/2 -translate-y-1/2 text-sky-400/90">
          <div className="w-2.5 h-2.5 bg-sky-400/90 rounded-full shadow-[0_0_12px_2px_currentColor]" />
        </div>
        <div className="absolute top-[60%] left-[28%] -translate-x-1/2 -translate-y-1/2 text-sky-400/90">
          <div className="w-2.5 h-2.5 bg-sky-400/90 rounded-full shadow-[0_0_12px_2px_currentColor]" />
        </div>
        <div className="absolute top-[65%] left-[40%] -translate-x-1/2 -translate-y-1/2 text-sky-300">
          <div className="w-3 h-3 bg-sky-300 rounded-full shadow-[0_0_15px_3px_currentColor]" />
        </div>

        <svg className="w-full h-full text-sky-400/10" preserveAspectRatio="none">
          <line x1="60%" y1="15%" x2="55%" y2="25%" stroke="currentColor" strokeWidth="1" />
          <line x1="55%" y1="25%" x2="52%" y2="35%" stroke="currentColor" strokeWidth="1" />
          <line x1="52%" y1="35%" x2="45%" y2="45%" stroke="currentColor" strokeWidth="1" />
          <line x1="45%" y1="45%" x2="30%" y2="42%" stroke="currentColor" strokeWidth="1" />
          <line x1="30%" y1="42%" x2="28%" y2="60%" stroke="currentColor" strokeWidth="1" />
          <line x1="28%" y1="60%" x2="40%" y2="65%" stroke="currentColor" strokeWidth="1" />
          <line x1="40%" y1="65%" x2="45%" y2="45%" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      {/* Simplified Glassmorphic Panel */}
      <div className="relative z-10 max-w-md w-[90%] p-8 bg-card/60 border border-sky-500/15 rounded-2xl backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.2)] text-center">
        {/* Simple Badge Icon */}
        <div className="relative inline-flex items-center justify-center p-4 bg-sky-500/10 text-sky-400 rounded-2xl mb-6">
          <ShieldAlert className="w-12 h-12" strokeWidth={1.5} />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Access Denied
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/polaris/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl transition-all duration-200 text-sm font-medium border border-border/30"
          >
            <Compass className="w-4 h-4" />
            <span>Authenticate Portal</span>
          </Link>

          <Link
            href={returnUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 rounded-xl transition-all duration-200 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Safety</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
