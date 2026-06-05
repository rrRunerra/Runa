"use client";

import React, { useEffect, useState, useRef } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, ShieldCheck, Compass } from "lucide-react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const RESERVED_KEYWORDS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger",
  "default", "delete", "do", "else", "export", "extends", "false",
  "finally", "for", "function", "if", "import", "in", "instanceof",
  "new", "null", "return", "super", "switch", "this", "throw",
  "true", "try", "typeof", "var", "void", "while", "with", "yield",
  "let", "package", "private", "protected", "public", "static",
  "any", "boolean", "constructor", "declare", "get", "module",
  "require", "number", "set", "string", "symbol", "type", "undefined",
  "unknown", "never", "readonly", "keyof", "infer", "as", "from",
  "of", "namespace", "interface", "implements", "enum", "await",
  "select", "insert", "update", "drop", "truncate", "alter",
  "create", "table", "database", "index", "use", "where", "join",
  "left", "right", "inner", "outer", "on", "and", "or", "not",
  "union", "values", "into", "order", "by", "group", "having",
  "limit", "offset", "distinct", "all", "exists", "like", "between", "is"
]);

export default function Page() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string;
  } | null>(null);
  const router = useRouter();

  // Create an array of star data for background rendering
  const [stars, setStars] = useState<{ id: number; size: number; x: number; y: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    document.title = "Polaris > Login";

    // Generate static parameters for stars after mounting to prevent hydration mismatch
    const generatedStars = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 5,
    }));
    setStars(generatedStars);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const val = identifier.trim();
    let sanitized = val;
    if (!val.includes("@")) {
      sanitized = val.replace(/[^a-zA-Z0-9_]/g, "");
    }
    const lower = sanitized.toLowerCase();

    if (!sanitized.includes("@") && RESERVED_KEYWORDS.has(lower)) {
      setFieldErrors((prev) => ({
        ...prev,
        identifier: `Username cannot be a reserved keyword ("${lower}")`,
      }));
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", {
      redirect: false,
      identifier: lower,
      password,
    });

    if (res?.error) {
      let errorMessage = "Invalid email/username or password.";
      if (res.error === "CredentialsSignin") {
        errorMessage = "Invalid email/username or password.";
      } else if (res.error === "CallbackRouteError") {
        errorMessage = "Authentication failed. Please try again.";
      }
      setMessage(`❌ ${errorMessage}`);
    } else if (res?.ok) {
      const callbackUrl = new URLSearchParams(window.location.search).get(
        "callbackUrl",
      );

      let safeRedirect = "/polaris/dash";
      if (callbackUrl) {
        if (callbackUrl.startsWith("/")) {
          safeRedirect = callbackUrl;
        } else {
          try {
            const url = new URL(callbackUrl);
            const allowedOrigin = window.location.origin;
            if (url.origin === allowedOrigin) {
              safeRedirect = callbackUrl;
            }
          } catch (e) {
            throw new Error("Invalid callback URL");
          }
        }
      }
      router.push(safeRedirect);
    }

    setLoading(false);
  };

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10 overflow-hidden font-sans bg-black select-none">
      {/* ── Background Starry Sky ────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute bg-white rounded-full opacity-35"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={{
              opacity: [0.15, 0.75, 0.15],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Ambient Nebula Glows */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen opacity-60" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[550px] h-[550px] bg-blue-900/5 rounded-full blur-[120px] mix-blend-screen opacity-50" />
      </div>

      {/* ── Main Auth Form Card ─────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card relative overflow-hidden rounded-3xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-2xl p-8 shadow-[0_0_50px_-12px_rgba(0,0,0,0.6)]">
          {/* Internal gradient flare */}
          <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-radial from-primary/5 via-transparent to-transparent pointer-events-none z-0" />

          {/* Header Info Block */}
          <div className="relative z-10 flex flex-col items-center text-center gap-1.5 mb-8">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
              <Compass className="w-3.5 h-3.5 text-primary animate-spin-slow" />
              <span className="text-[9px] font-bold font-mono tracking-widest text-primary uppercase">
                POLARIS
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome Back
            </h2>
      
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-6">
            <div className="grid gap-2">
              <Label
                htmlFor="identifier"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 ml-1"
              >
                {fieldErrors?.identifier ? (
                  <span className="text-red-400 font-bold">{fieldErrors.identifier}</span>
                ) : (
                  "Email or Username"
                )}
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary mr-2" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="example@runerra.org"
                  required
                  value={identifier}
                  onChange={(e) => {
                    const val = e.target.value;
                    let sanitized = val;
                    if (!val.includes("@")) {
                      sanitized = val.replace(/[^a-zA-Z0-9_]/g, "");
                    }
                    setIdentifier(sanitized);

                    const lower = sanitized.toLowerCase();
                    if (!sanitized.includes("@") && RESERVED_KEYWORDS.has(lower)) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        identifier: `Username cannot be a reserved keyword ("${lower}")`,
                      }));
                    } else {
                      setFieldErrors((prev) => ({
                        ...prev,
                        identifier: "",
                      }));
                    }
                  }}
                  disabled={loading}
                  className={cn(
                    "pl-11 h-12 bg-zinc-950/40 border-zinc-800/50 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/35 transition-all focus:shadow-[0_0_15px_rgba(139,92,246,0.1)]",
                    fieldErrors?.identifier && "border-red-500/50 bg-red-500/5 focus:ring-red-500/30"
                  )}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between ml-1">
                <Label 
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80"
                >
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary mr-2" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  maxLength={64}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-11 pr-11 h-12 bg-zinc-950/40 border-zinc-800/50 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/35 transition-all focus:shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Button
                type="submit"
                className="w-full h-12 mt-2 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all cursor-pointer"
                disabled={loading || !!fieldErrors?.identifier}
              >
                {loading ? "Logging in" : "Login"}
              </Button>
            </motion.div>

            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "p-3.5 rounded-xl text-center text-xs font-semibold border tracking-wide",
                    message.includes("❌")
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                  )}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-px bg-zinc-800/40 my-2" />

            <p className="text-center text-xs text-muted-foreground font-medium">
              New explorer?{" "}
              <Link
                href="/polaris/register"
                className="text-primary font-bold hover:underline hover:text-primary/90 transition-colors"
              >
                Create credentials
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
