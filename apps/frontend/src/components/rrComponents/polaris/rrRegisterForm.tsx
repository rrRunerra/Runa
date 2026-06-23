"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import RrLapplandWelcomeImage from "../rrImages/rrLapplandWelcomeImage";
import RrLapplandRegisterBothTaken from "../rrImages/rrLapplandRegisterBothTaken";
import RrLapplandRegisterUsernameTaken from "../rrImages/rrLapplandRegisterUsernameTaken";
import RrLapplandRegisterEmailTaken from "../rrImages/rrLapplandRegisterEmailTaken";
import RrLapplandPassword0 from "../rrImages/rrLapplandPassword0";
import RrLapplandPassword1 from "../rrImages/rrLapplandPassword1";
import RrLapplandPassword2 from "../rrImages/rrLapplandPassword2";
import RrLapplandPassword3 from "../rrImages/rrLapplandPassword3";
import RrLapplandPassword4 from "../rrImages/rrLapplandPassword4";
import RrLapplandPassword5 from "../rrImages/rrLapplandPassword5";

const passwordStrengthComponents = [
  RrLapplandPassword0,
  RrLapplandPassword1,
  RrLapplandPassword2,
  RrLapplandPassword3,
  RrLapplandPassword4,
  RrLapplandPassword5,
];

interface RrRegisterFormProps {
  email: string;
  setEmail: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword?: boolean;
  setShowPassword?: (val: boolean) => void;
  passwordTouched: boolean;
  setPasswordTouched: (val: boolean) => void;
  loading: boolean;
  message: string;
  setMessage: (val: string) => void;
  fieldErrors: { email?: string; username?: string; password?: string } | null;
  setFieldErrors: (val: any) => void;
  errors: {
    length: boolean;
    maxLength: boolean;
    uppercase: boolean;
    number: boolean;
    special: boolean;
  };
  validatePassword: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function RrRegisterForm({
  className,
  email,
  setEmail,
  username,
  setUsername,
  password,
  setPassword,
  showPassword = false,
  setShowPassword = () => {},
  passwordTouched,
  setPasswordTouched,
  loading,
  message,
  setMessage,
  fieldErrors,
  setFieldErrors,
  errors,
  validatePassword,
  onSubmit,
  ...props
}: RrRegisterFormProps & React.ComponentProps<"div">) {
  const isEmailError = !!fieldErrors?.email;
  const isUsernameError = !!fieldErrors?.username;
  const isPasswordError = !!fieldErrors?.password;

  const noFieldErrors =
    !fieldErrors?.email && !fieldErrors?.username && !fieldErrors?.password;
  const isPasswordValid =
    errors.length &&
    errors.maxLength &&
    errors.uppercase &&
    errors.number &&
    errors.special;

  const RESERVED_KEYWORDS = new Set([
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
    "let",
    "package",
    "private",
    "protected",
    "public",
    "static",
    "any",
    "boolean",
    "constructor",
    "declare",
    "get",
    "module",
    "require",
    "number",
    "set",
    "string",
    "symbol",
    "type",
    "undefined",
    "unknown",
    "never",
    "readonly",
    "keyof",
    "infer",
    "as",
    "from",
    "of",
    "namespace",
    "interface",
    "implements",
    "enum",
    "await",
    "select",
    "insert",
    "update",
    "drop",
    "truncate",
    "alter",
    "create",
    "table",
    "database",
    "index",
    "use",
    "where",
    "join",
    "left",
    "right",
    "inner",
    "outer",
    "on",
    "and",
    "or",
    "not",
    "union",
    "values",
    "into",
    "order",
    "by",
    "group",
    "having",
    "limit",
    "offset",
    "distinct",
    "all",
    "exists",
    "like",
    "between",
    "is",
  ]);

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)} {...props}>
      <Card className="overflow-hidden p-0 bg-card border-border rounded-2xl shadow-2xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8 flex flex-col justify-center h-[600px]">
            <AnimatePresence mode="wait">
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={onSubmit}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col items-center gap-1.5 text-center mb-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Create Credentials
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Create a new Polaris profile
                  </p>
                </div>

                {/* Username field */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="username"
                      className="text-xs font-semibold ml-0.5 text-muted-foreground uppercase tracking-wider"
                    >
                      Username
                    </Label>
                    {fieldErrors?.username && (
                      <span className="text-[10px] font-semibold text-destructive">
                        {fieldErrors.username}
                      </span>
                    )}
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="CosmicExplorer"
                    required
                    value={username}
                    maxLength={32}
                    onChange={(e) => {
                      const val = e.target.value;
                      const sanitized = val.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32);
                      setUsername(sanitized);

                      if (RESERVED_KEYWORDS.has(sanitized)) {
                        setFieldErrors({
                          ...fieldErrors,
                          username: `Username is reserved ("${sanitized}")`,
                        });
                      } else if (sanitized.length > 0 && sanitized.length < 3) {
                        setFieldErrors({
                          ...fieldErrors,
                          username:
                            "Username must be at least 3 characters long",
                        });
                      } else {
                        setFieldErrors({
                          ...fieldErrors,
                          username: "",
                        });
                      }
                    }}
                    disabled={loading}
                    className={cn(
                      "h-10 px-3 bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-sm rounded-lg transition-colors",
                      isUsernameError &&
                        "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/20",
                    )}
                  />
                </div>

                {/* Email field */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="email"
                      className="text-xs font-semibold ml-0.5 text-muted-foreground uppercase tracking-wider"
                    >
                      Email
                    </Label>
                    {fieldErrors?.email && (
                      <span className="text-[10px] font-semibold text-destructive">
                        {fieldErrors.email}
                      </span>
                    )}
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmail(val);
                      if (fieldErrors?.email) {
                        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || val === "") {
                          setFieldErrors({ ...fieldErrors, email: "" });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                        setFieldErrors({
                          ...fieldErrors,
                          email: "Invalid email format",
                        });
                      }
                    }}
                    disabled={loading}
                    className={cn(
                      "h-10 px-3 bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-sm rounded-lg transition-colors",
                      isEmailError &&
                        "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/20",
                    )}
                  />
                </div>

                {/* Password field */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-xs font-semibold ml-0.5 text-muted-foreground uppercase tracking-wider"
                    >
                      Password
                    </Label>
                    {fieldErrors?.password && (
                      <span className="text-[10px] font-semibold text-destructive">
                        {fieldErrors.password}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      maxLength={64}
                      onChange={(e) => {
                        if (message) setMessage("");
                        const val = e.target.value;
                        setPassword(val);
                        validatePassword(val);
                        if (!passwordTouched) setPasswordTouched(true);
                        if (fieldErrors?.password) {
                          setFieldErrors({ ...fieldErrors, password: "" });
                        }
                      }}
                      onFocus={() => {
                        if (!passwordTouched) setPasswordTouched(true);
                      }}
                      onBlur={() => {
                        setPasswordTouched(false);
                      }}
                      disabled={loading}
                      className={cn(
                        "h-10 pl-3 pr-10 bg-background border-input text-foreground focus-visible:ring-primary/20 text-sm rounded-lg transition-colors",
                        isPasswordError &&
                          "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/20",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>

                  {/* Password criteria display */}
                  <AnimatePresence>
                    {passwordTouched && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-1 p-3 rounded-lg bg-background/40 border border-border overflow-hidden"
                      >
                        <ul className="grid grid-cols-1 gap-1.5">
                          {[
                            { key: "length", label: "Min 16 characters" },
                            { key: "maxLength", label: "Max 64 characters" },
                            { key: "uppercase", label: "One uppercase letter" },
                            { key: "number", label: "Two numbers" },
                            { key: "special", label: "One special character" },
                          ].map((item) => {
                            const isValid =
                              errors[item.key as keyof typeof errors];
                            return (
                              <li
                                key={item.key}
                                className={cn(
                                  "flex items-center gap-2 text-[10px] transition-all duration-300",
                                  isValid
                                    ? "text-emerald-400 font-medium"
                                    : "text-muted-foreground",
                                )}
                              >
                                {isValid ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-muted-foreground shrink-0" />
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

                <AnimatePresence mode="wait">
                  {message && message.toLowerCase().includes("success") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="p-2.5 mt-1 rounded-lg text-center text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    >
                      {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!isPasswordValid || loading || !noFieldErrors}
                  className="w-full mt-2 h-10 rounded-lg shadow-md font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>{!noFieldErrors ? "Resolve Issues" : "Create Account"}</>
                  )}
                </Button>

                {/* Sign up Link */}
                <div className="text-center text-xs text-muted-foreground mt-2">
                  Registered profile?{" "}
                  <Link
                    href="/polaris/login"
                    className="text-foreground font-semibold hover:underline underline-offset-2 transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </motion.form>
            </AnimatePresence>
          </div>

          {/* Right side cover image block */}
          <div className="relative hidden bg-muted border-l border-border md:flex items-center justify-center overflow-hidden w-full h-full">
            {(() => {
              let ActiveComponent: React.ComponentType<any>;
              let stateKey: string;

              if (message?.toLowerCase().includes("success")) {
                ActiveComponent = RrLapplandWelcomeImage;
                stateKey = "success";
              } else if (isUsernameError && isEmailError) {
                ActiveComponent = RrLapplandRegisterBothTaken;
                stateKey = "both-taken";
              } else if (isUsernameError) {
                ActiveComponent = RrLapplandRegisterUsernameTaken;
                stateKey = "username-taken";
              } else if (isEmailError) {
                ActiveComponent = RrLapplandRegisterEmailTaken;
                stateKey = "email-taken";
              } else if (passwordTouched) {
                const strengthIndex =
                  password === ""
                    ? 0
                    : Object.values(errors).filter(Boolean).length;
                ActiveComponent =
                  passwordStrengthComponents[strengthIndex] ||
                  RrLapplandPassword0;
                stateKey = `password-${strengthIndex}`;
              } else {
                ActiveComponent = RrLapplandWelcomeImage;
                stateKey = "welcome";
              }

              return (
                <AnimatePresence>
                  <motion.div
                    key={stateKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full flex items-center justify-center scale-[1.1]"
                  >
                    <ActiveComponent className="w-full h-full object-cover object-[65%_50%] select-none pointer-events-none text-foreground" />
                  </motion.div>
                </AnimatePresence>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Footer agreement terms */}
      <p className="px-6 text-center text-xs text-muted-foreground/80 max-w-xs mx-auto leading-normal">
        By clicking continue, you agree to our{" "}
        <Link
          href="/polaris/tos"
          className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/polaris/privacy"
          className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
