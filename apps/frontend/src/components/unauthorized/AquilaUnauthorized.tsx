"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, List, ShieldAlert } from "lucide-react";

import { StarIcon } from "@/components/icons/StarIcon";

interface AquilaUnauthorizedProps {
  message?: string;
  returnUrl?: string;
}

export default function AquilaUnauthorized({
  message = "You don't have permission to access the Aquila media tracker.",
  returnUrl = "/polaris/dash",
}: AquilaUnauthorizedProps): React.JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center overflow-hidden selection:bg-amber-500/30">
      {/* Constellation Background SVG */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
        {/* Altair (Head) - Very bright */}
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 text-amber-300">
          <StarIcon size={30} intensity={0.9} showFlare={true} showGlow={true} className="text-amber-300" />
        </div>
        
        {/* Body center */}
        <div className="absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-1/2 text-amber-400">
          <div className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_12px_2px_currentColor]" />
        </div>
        
        {/* Tail */}
        <div className="absolute top-[70%] left-[50%] -translate-x-1/2 -translate-y-1/2 text-amber-400">
          <div className="w-2 h-2 bg-amber-400/80 rounded-full shadow-[0_0_8px_1px_currentColor]" />
        </div>

        {/* Left wing joint */}
        <div className="absolute top-[40%] left-[35%] -translate-x-1/2 -translate-y-1/2 text-amber-400">
          <div className="w-2.5 h-2.5 bg-amber-400/90 rounded-full shadow-[0_0_12px_2px_currentColor]" />
        </div>

        {/* Left wing tip */}
        <div className="absolute top-[35%] left-[20%] -translate-x-1/2 -translate-y-1/2 text-amber-400">
          <div className="w-2 h-2 bg-amber-400/70 rounded-full shadow-[0_0_8px_1px_currentColor]" />
        </div>

        {/* Right wing joint */}
        <div className="absolute top-[40%] left-[65%] -translate-x-1/2 -translate-y-1/2 text-amber-400">
          <div className="w-2.5 h-2.5 bg-amber-400/90 rounded-full shadow-[0_0_12px_2px_currentColor]" />
        </div>

        {/* Right wing tip */}
        <div className="absolute top-[35%] left-[80%] -translate-x-1/2 -translate-y-1/2 text-amber-400">
          <div className="w-2 h-2 bg-amber-400/70 rounded-full shadow-[0_0_8px_1px_currentColor]" />
        </div>

        <svg className="w-full h-full text-amber-500/10" preserveAspectRatio="none">
          <line x1="50%" y1="20%" x2="50%" y2="45%" stroke="currentColor" strokeWidth="1" />
          <line x1="50%" y1="45%" x2="50%" y2="70%" stroke="currentColor" strokeWidth="1" />
          <line x1="50%" y1="45%" x2="35%" y2="40%" stroke="currentColor" strokeWidth="1" />
          <line x1="35%" y1="40%" x2="20%" y2="35%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="50%" y1="45%" x2="65%" y2="40%" stroke="currentColor" strokeWidth="1" />
          <line x1="65%" y1="40%" x2="80%" y2="35%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
      </div>

      {/* Simplified Glassmorphic Card */}
      <div className="relative z-10 max-w-md w-[90%] p-8 bg-card/60 border border-amber-500/15 rounded-2xl backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.2)] text-center">
        {/* Simple Badge Icon */}
        <div className="relative inline-flex items-center justify-center p-4 bg-amber-500/10 text-amber-400 rounded-2xl mb-6">
          <ShieldAlert className="w-12 h-12" strokeWidth={1.5} />
        </div>

        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Access Denied
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/aquila"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl transition-all duration-200 text-sm font-medium border border-border/30"
          >
            <List className="w-4 h-4" />
            <span>Aquila Home</span>
          </Link>

          <Link
            href={returnUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-xl transition-all duration-200 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Safety</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
