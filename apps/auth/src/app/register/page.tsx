"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, cn, Input, Label, PixelBlast, useAlert } from "@runa/ui";
import { Loader2, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import api from "@runa/api";

export default function Page() {
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

  const { showAlert } = useAlert();

  const validatePassword = (value: string) => {
    const criteria = {
      length: value.length >= 16,
      maxLength: value.length <= 64,
      uppercase: /[A-Z]/.test(value),
      number: /[0-9]{2,}/.test(value),
      special: /[!@#$%^&*]/.test(value),
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

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username,
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        data.message?.forEach((message: string) => {
          const lowerMsg = message.toLowerCase();
          if (lowerMsg.includes("email")) {
            setFieldErrors((prev) => ({ ...prev, email: message }));
          } else if (lowerMsg.includes("username")) {
            setFieldErrors((prev) => ({ ...prev, username: message }));
          } else if (lowerMsg.includes("password")) {
            setFieldErrors((prev) => ({ ...prev, password: message }));
          }
        });
        throw new Error(data.message || "Registration failed");
      }

      showAlert({
        title: "Success",
        message: "Account created successfully!",
        type: "info",
      });
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid =
    errors.length && errors.uppercase && errors.number && errors.special;

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

      <div className="relative z-10 w-full max-w-md mt-8 mb-8">
        <div className="flex flex-col gap-8">
          <div className="glass-card relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl transition-all duration-300 hover:shadow-primary/5">
            {/* Subtle inner glow */}
            <div className="absolute -top-[50%] -left-[50%] w-full h-full bg-primary/5 blur-[100px] pointer-events-none" />

            <div className="relative flex flex-col gap-1 mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                Create your account
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Username */}
              <div className="grid gap-2.5">
                <Label htmlFor="userName" className="text-sm font-medium ml-1">
                  {fieldErrors?.username ? (
                    <span className="text-red-400">{fieldErrors.username}</span>
                  ) : (
                    "Username"
                  )}
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground mr-2" />
                  <Input
                    id="userName"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (fieldErrors?.username) {
                        setFieldErrors((prev) => ({ ...prev, username: "" }));
                      }
                    }}
                    placeholder="CosmicExplorer"
                    required
                    disabled={loading}
                    className={cn(
                      "pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-foreground placeholder:text-muted-foreground/50",
                      fieldErrors?.username && "border-red-500/50 bg-red-500/5",
                    )}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="grid gap-2.5">
                <Label htmlFor="email" className="text-sm font-medium ml-1">
                  {fieldErrors?.email ? (
                    <span className="text-red-400">{fieldErrors.email}</span>
                  ) : (
                    "Email"
                  )}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground mr-2" />
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
                      "pl-11 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-foreground placeholder:text-muted-foreground/50",
                      fieldErrors?.email && "border-red-500/50 bg-red-500/5",
                    )}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="grid gap-2.5">
                <Label htmlFor="password" className="text-sm font-medium ml-1">
                  {fieldErrors?.password ? (
                    <span className="text-red-400">{fieldErrors.password}</span>
                  ) : (
                    "Password"
                  )}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground mr-2" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
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
                      "pl-11 pr-11 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-foreground placeholder:text-muted-foreground/50",
                      fieldErrors?.password && "border-red-500/50 bg-red-500/5",
                    )}
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

                {passwordTouched && (
                  <div className="mt-2 p-4 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                      Password Criteria
                    </p>
                    <ul className="grid grid-cols-1 gap-2">
                      {[
                        { key: "length", label: "Min 16 characters" },
                        { key: "uppercase", label: "One uppercase letter" },
                        { key: "number", label: "Two numbers" },
                        { key: "special", label: "One special character" },
                      ].map((item) => (
                        <li
                          key={item.key}
                          className={cn(
                            "flex items-center gap-2 text-xs transition-all duration-300",
                            errors[item.key as keyof typeof errors]
                              ? "text-emerald-400 font-medium"
                              : "text-muted-foreground/60",
                          )}
                        >
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full transition-all",
                              errors[item.key as keyof typeof errors]
                                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                                : "bg-white/20",
                            )}
                          />
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 mt-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
                      ? "Fix errors to continue"
                      : "Create Account"}
                  </>
                )}
              </Button>

              {message && (
                <div
                  className={cn(
                    "p-3 rounded-xl text-center text-sm animate-in fade-in slide-in-from-top-2",
                    message.toLowerCase().includes("success")
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20",
                  )}
                >
                  {message}
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary font-medium hover:underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
