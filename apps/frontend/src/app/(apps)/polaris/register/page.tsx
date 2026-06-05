"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, User, Mail, Lock, Eye, EyeOff, ShieldCheck, Compass, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{
    length: boolean;
    maxLength: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  }>({
    length: false,
    maxLength: false,
    uppercase: false,
    number: false,
    special: false,
  });

  // State to hold background stars parameters to prevent hydration mismatches
  const [stars, setStars] = useState<{ id: number; size: number; x: number; y: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    document.title = "Polaris > Register";

    // Generate static parameters for stars after mounting
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

  const validatePassword = (value: string) => {
    const criteria = {
      length: value.length >= 16,
      maxLength: value.length <= 64,
      uppercase: /[A-Z]/.test(value),
      number: /[0-9]{2,}/.test(value),
      special: /[!@#$%^&*(),.?":{}|<>~'_\-+=/\\\[\]\x60]/.test(value),
    };

    setErrors(criteria);
  };

  const noFieldErrors =
    !fieldErrors?.email && !fieldErrors?.username && !fieldErrors?.password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setFieldErrors(null);

    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_]/g, "");
    const lowerUsername = sanitizedUsername.toLowerCase();

    if (RESERVED_KEYWORDS.has(lowerUsername)) {
      setFieldErrors((prev) => ({
        ...prev,
        username: `Username cannot be a reserved keyword ("${lowerUsername}")`,
      }));
      setLoading(false);
      return;
    }

    if (sanitizedUsername.length < 3) {
      setFieldErrors((prev) => ({
        ...prev,
        username: "Username must be at least 3 characters long",
      }));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/polaris/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase(),
          username: lowerUsername,
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.message && Array.isArray(data.message)) {
          data.message.forEach((msg: string) => {
            const lowerMsg = msg.toLowerCase();
            if (lowerMsg.includes("email")) {
              setFieldErrors((prev) => ({ ...prev, email: msg }));
            } else if (lowerMsg.includes("username")) {
              setFieldErrors((prev) => ({ ...prev, username: msg }));
            } else if (lowerMsg.includes("password")) {
              setFieldErrors((prev) => ({ ...prev, password: msg }));
            }
          });
        }
        throw new Error(data.message || "Registration failed");
      }

      setMessage("Registration successful! Redirecting to login...");
      setEmail("");
      setPassword("");
      setUsername("");
      setErrors({
        length: false,
        maxLength: false,
        uppercase: false,
        number: false,
        special: false,
      });

      // Automatically redirect to login after successful account creation
      setTimeout(() => {
        router.push("/polaris/login");
      }, 2200);

    } catch (err: any) {
      console.error("Registration failed:", err);
      if (!message) {
        setMessage("Registration failed. Please resolve form errors.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid =
    errors.length &&
    errors.maxLength &&
    errors.uppercase &&
    errors.number &&
    errors.special;

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

      {/* ── Main Auth Card ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative z-10 w-full max-w-md my-8"
      >
        <div className="glass-card relative overflow-hidden rounded-3xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-2xl p-8 shadow-[0_0_50px_-12px_rgba(0,0,0,0.6)]">
          {/* Internal gradient flare */}
          <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-radial from-primary/5 via-transparent to-transparent pointer-events-none z-0" />

          {/* Header Block */}
          <div className="relative z-10 flex flex-col items-center text-center gap-1.5 mb-8">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
              <Compass className="w-3.5 h-3.5 text-primary animate-spin-slow" />
              <span className="text-[9px] font-bold font-mono tracking-widest text-primary uppercase">
                POLARIS
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Create Credentials
            </h2>
            <p className="text-xs text-muted-foreground">
              Register a new profile.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-5">
            {/* Username */}
            <div className="grid gap-2">
              <Label 
                htmlFor="userName" 
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 ml-1"
              >
                {fieldErrors?.username ? (
                  <span className="text-red-400 font-bold">{fieldErrors.username}</span>
                ) : (
                  "Username"
                )}
              </Label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary mr-2" />
                <Input
                  id="userName"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                    setUsername(sanitized);
                    
                    const lower = sanitized.toLowerCase();
                    if (RESERVED_KEYWORDS.has(lower)) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        username: `Username cannot be a reserved keyword ("${lower}")`,
                      }));
                    } else if (sanitized.length > 0 && sanitized.length < 3) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        username: "Username must be at least 3 characters long",
                      }));
                    } else {
                      setFieldErrors((prev) => ({
                        ...prev,
                        username: "",
                      }));
                    }
                  }}
                  placeholder="CosmicExplorer"
                  required
                  disabled={loading}
                  className={cn(
                    "pl-11 h-12 bg-zinc-950/40 border-zinc-800/50 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/35 transition-all focus:shadow-[0_0_15px_rgba(139,92,246,0.1)]",
                    fieldErrors?.username && "border-red-500/50 bg-red-500/5 focus:ring-red-500/30",
                  )}
                />
              </div>
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label 
                htmlFor="email" 
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 ml-1"
              >
                {fieldErrors?.email ? (
                  <span className="text-red-400 font-bold">{fieldErrors.email}</span>
                ) : (
                  "Email"
                )}
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary mr-2" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors?.email) {
                      setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }
                  }}
                  placeholder="example@runerra.org"
                  required
                  disabled={loading}
                  className={cn(
                    "pl-11 h-12 bg-zinc-950/40 border-zinc-800/50 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/35 transition-all focus:shadow-[0_0_15px_rgba(139,92,246,0.1)]",
                    fieldErrors?.email && "border-red-500/50 bg-red-500/5 focus:ring-red-500/30",
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label 
                htmlFor="password" 
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 ml-1"
              >
                {fieldErrors?.password ? (
                  <span className="text-red-400 font-bold">{fieldErrors.password}</span>
                ) : (
                  "Password"
                )}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary mr-2" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  maxLength={64}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    validatePassword(e.target.value);
                    if (!passwordTouched) setPasswordTouched(true);
                    if (fieldErrors?.password) {
                      setFieldErrors((prev) => ({ ...prev, password: "" }));
                    }
                  }}
                  onFocus={() => {
                    if (!passwordTouched) setPasswordTouched(true);
                  }}
                  onBlur={() => {
                    setPasswordTouched(false);
                  }}
                  required
                  disabled={loading}
                  className={cn(
                    "pl-11 pr-11 h-12 bg-zinc-950/40 border-zinc-800/50 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/35 transition-all focus:shadow-[0_0_15px_rgba(139,92,246,0.1)]",
                    fieldErrors?.password && "border-red-500/50 bg-red-500/5 focus:ring-red-500/30",
                  )}
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

              {/* Password criteria display */}
              <AnimatePresence>
                {passwordTouched && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="mt-2 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/50 shadow-inner overflow-hidden"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-3 px-1">
                      Checklist
                    </p>
                    <ul className="grid grid-cols-1 gap-2">
                      {[
                        { key: "length", label: "Min 16 characters" },
                        { key: "maxLength", label: "Max 64 characters" },
                        { key: "uppercase", label: "One uppercase letter" },
                        { key: "number", label: "Two numbers" },
                        { key: "special", label: "One special character" },
                      ].map((item) => {
                        const isValid = errors[item.key as keyof typeof errors];
                        return (
                          <li
                            key={item.key}
                            className={cn(
                              "flex items-center gap-2.5 text-xs transition-all duration-300",
                              isValid
                                ? "text-emerald-400 font-medium"
                                : "text-muted-foreground/50",
                            )}
                          >
                            {isValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.4)] shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-zinc-700 shrink-0" />
                            )}
                            {item.label}
                          </li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Button
                type="submit"
                className="w-full h-12 mt-2 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all cursor-pointer"
                disabled={!isPasswordValid || loading || !noFieldErrors}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    {!noFieldErrors
                      ? "Resolve Issues"
                      : "Create Account"}
                  </>
                )}
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
                    message.toLowerCase().includes("success")
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20",
                  )}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-px bg-zinc-800/40 my-2" />

            <p className="text-center text-xs text-muted-foreground font-medium">
              Registered profile?{" "}
              <Link
                href="/polaris/login"
                className="text-primary font-bold hover:underline hover:text-primary/90 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
