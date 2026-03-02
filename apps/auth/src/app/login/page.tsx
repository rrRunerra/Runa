"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button, cn, Input, Label, PixelBlast } from "@runa/ui";
import { useRouter } from "next/navigation";

export default function Page() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await signIn("credentials", {
      redirect: false,
      identifier: identifier.toLowerCase(),
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

      router.push(callbackUrl || "/dash");
    }

    setLoading(false);
  };

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10 overflow-hidden font-sans">
      {/* Dynamic Background with PixelBlast */}
      <div className="absolute inset-0 -z-20 bg-background">
        <PixelBlast
          variant="diamond"
          pixelSize={4}
          color="#8000ff"
          patternScale={5}
          patternDensity={0.6}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.3}
          rippleThickness={0.15}
          rippleIntensityScale={1.2}
          liquid={false}
          speed={0.1}
          edgeFade={0.4}
          transparent
        />
      </div>

      {/* Radial Gradient for focus/glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, var(--background) 80%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col gap-8">
          <div className="glass-card relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl transition-all duration-300 hover:shadow-primary/5">
            {/* Subtle inner glow */}
            <div className="absolute -top-[50%] -left-[50%] w-full h-full bg-primary/5 blur-[100px] pointer-events-none" />

            <div className="relative flex flex-col gap-1 mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                Welcome Back
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid gap-2.5">
                <Label
                  htmlFor="identifier"
                  className="text-sm font-medium ml-1"
                >
                  Email or Username
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground mr-2" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="example@runerra.org"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={loading}
                    className="pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              <div className="grid gap-2.5">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground mr-2" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    maxLength={64}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-11 pr-11 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-foreground placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
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

              <Button
                type="submit"
                className="w-full h-12 mt-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              {message && (
                <div
                  className={cn(
                    "p-3 rounded-xl text-center text-sm animate-in fade-in slide-in-from-top-2",
                    message.includes("❌")
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                  )}
                >
                  {message}
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground mt-4">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-primary font-medium hover:underline underline-offset-4"
                >
                  Create one now
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
