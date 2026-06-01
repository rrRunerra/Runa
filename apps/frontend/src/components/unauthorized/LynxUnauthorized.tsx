"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Bot, ShieldAlert } from "lucide-react";

interface LynxUnauthorizedProps {
  message?: string;
  returnUrl?: string;
}

export default function LynxUnauthorized({
  message = "You don't have permission to access the Lynx bot management panel.",
  returnUrl = "/polaris/dash",
}: LynxUnauthorizedProps): React.JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center overflow-hidden selection:bg-emerald-500/30">
      {/* Constellation Background SVG */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[20%] left-[30%] w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_2px_currentColor] text-emerald-400" />
        <div className="absolute top-[40%] left-[45%] w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_12px_3px_currentColor] text-emerald-400" />
        <div className="absolute top-[15%] left-[60%] w-2 h-2 bg-emerald-400/80 rounded-full shadow-[0_0_8px_1px_currentColor] text-emerald-400/80" />
        <div className="absolute top-[50%] left-[70%] w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_15px_4px_currentColor] text-emerald-400" />
        <div className="absolute top-[70%] left-[40%] w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_10px_2px_currentColor] text-emerald-400" />
        <div className="absolute top-[60%] left-[80%] w-2 h-2 bg-emerald-400/60 rounded-full shadow-[0_0_8px_1px_currentColor] text-emerald-400/60" />
        <div className="absolute top-[80%] left-[60%] w-2.5 h-2.5 bg-emerald-400/90 rounded-full shadow-[0_0_12px_2px_currentColor] text-emerald-400/90" />

        <svg className="w-full h-full text-emerald-500/10" preserveAspectRatio="none">
          <line x1="30%" y1="20%" x2="45%" y2="40%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="45%" y1="40%" x2="60%" y2="15%" stroke="currentColor" strokeWidth="1" />
          <line x1="45%" y1="40%" x2="70%" y2="50%" stroke="currentColor" strokeWidth="1" />
          <line x1="45%" y1="40%" x2="40%" y2="70%" stroke="currentColor" strokeWidth="1" />
          <line x1="70%" y1="50%" x2="80%" y2="60%" stroke="currentColor" strokeWidth="1" />
          <line x1="70%" y1="50%" x2="60%" y2="80%" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      {/* Simplified Glassmorphic Card */}
      <div className="relative z-10 max-w-md w-[90%] p-8 bg-card/60 border border-emerald-500/15 rounded-2xl backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.2)] text-center">
        {/* Simple Badge Icon */}
        <div className="relative inline-flex items-center justify-center p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl mb-6">
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
            href="/lynx"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl transition-all duration-200 text-sm font-medium border border-border/30"
          >
            <Bot className="w-4 h-4" />
            <span>Lynx Home</span>
          </Link>

          <Link
            href={returnUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded-xl transition-all duration-200 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Safety</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
