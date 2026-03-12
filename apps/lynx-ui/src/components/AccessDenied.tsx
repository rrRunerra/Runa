import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  returnUrl?: string;
}

export default function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to access the requested resource.",
  returnUrl = "/",
}: AccessDeniedProps) {
  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center overflow-hidden selection:bg-primary/30">
      {/* Constellation Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Lynx Constellation Stars */}
        <div className="absolute top-[20%] left-[30%] w-2 h-2 bg-primary rounded-full shadow-[0_0_15px_3px_currentColor] text-primary animate-pulse" />
        <div
          className="absolute top-[40%] left-[45%] w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_4px_currentColor] text-primary animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-[15%] left-[60%] w-2 h-2 bg-primary/80 rounded-full shadow-[0_0_10px_2px_currentColor] text-primary/80 animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-[50%] left-[70%] w-4 h-4 bg-primary rounded-full shadow-[0_0_25px_5px_currentColor] text-primary animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute top-[70%] left-[40%] w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_15px_3px_currentColor] text-primary animate-pulse"
          style={{ animationDelay: "0.2s" }}
        />
        <div
          className="absolute top-[60%] left-[80%] w-2 h-2 bg-primary/60 rounded-full shadow-[0_0_12px_2px_currentColor] text-primary/60 animate-pulse"
          style={{ animationDelay: "0.8s" }}
        />
        <div
          className="absolute top-[80%] left-[60%] w-3 h-3 bg-primary/90 rounded-full shadow-[0_0_18px_3px_currentColor] text-primary/90 animate-pulse"
          style={{ animationDelay: "1.2s" }}
        />

        {/* Vercel React Best Practices - Animate CSS div wrapper instead of SVG node directly */}
        <div className="absolute inset-0 w-full h-full opacity-30 text-primary">
          <svg className="w-full h-full" preserveAspectRatio="none">
            {/* Main constellation lines */}
            <line
              x1="30%"
              y1="20%"
              x2="45%"
              y2="40%"
              stroke="currentColor"
              className="stroke-[1px] opacity-70"
              strokeDasharray="4 4"
            />
            <line
              x1="45%"
              y1="40%"
              x2="60%"
              y2="15%"
              stroke="currentColor"
              className="stroke-[1px] opacity-70"
            />
            <line
              x1="45%"
              y1="40%"
              x2="70%"
              y2="50%"
              stroke="currentColor"
              className="stroke-[1px] opacity-70"
            />
            <line
              x1="45%"
              y1="40%"
              x2="40%"
              y2="70%"
              stroke="currentColor"
              className="stroke-[1px] opacity-70"
            />
            <line
              x1="70%"
              y1="50%"
              x2="80%"
              y2="60%"
              stroke="currentColor"
              className="stroke-[1px] opacity-40"
            />
            <line
              x1="70%"
              y1="50%"
              x2="60%"
              y2="80%"
              stroke="currentColor"
              className="stroke-[1px] opacity-50"
            />

            {/* Subtle background connecting lines */}
            <line
              x1="30%"
              y1="20%"
              x2="60%"
              y2="15%"
              stroke="currentColor"
              className="stroke-[0.5px] opacity-20"
            />
            <line
              x1="40%"
              y1="70%"
              x2="60%"
              y2="80%"
              stroke="currentColor"
              className="stroke-[0.5px] opacity-20"
            />
          </svg>
        </div>

        {/* Deep space gradient overlay to fade edges */}
        <div className="absolute inset-0 bg-background/90 mask-[radial-gradient(circle_at_center,transparent_0%,black_100%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full p-8 text-center space-y-8 animate-in fade-in zoom-in-95 duration-1000 fill-mode-both">
        <div className="relative group">
          <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-colors duration-500" />
          <div className="relative bg-background/50 border border-primary/20 p-4 rounded-2xl backdrop-blur-sm">
            <ShieldAlert className="w-16 h-16 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-muted-foreground leading-relaxed">{message}</p>
        </div>

        <div className="pt-4 pb-2 w-full flex justify-center">
          <Link
            href={returnUrl}
            className="group relative inline-flex items-center gap-2 px-8 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-primary/10 to-primary/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="font-medium">Return to Safety</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
