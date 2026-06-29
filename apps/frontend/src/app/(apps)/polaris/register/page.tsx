"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RrRegisterForm } from "@/components/rrComponents/polaris/rrRegisterForm";

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

  useEffect(() => {
    document.title = "Polaris > Register";
  }, []);

  const validatePassword = (value: string) => {
    const criteria = {
      length: value.length >= 16,
      maxLength: value.length > 0 && value.length <= 64,
      uppercase: /[A-Z]/.test(value),
      number: /(?:.*[0-9]){2}/.test(value),
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors((prev: any) => ({
        ...prev,
        email: "Invalid email format",
      }));
      setLoading(false);
      return;
    }

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

    if (sanitizedUsername.length < 3 || sanitizedUsername.length > 32) {
      setFieldErrors((prev) => ({
        ...prev,
        username: sanitizedUsername.length < 3
          ? "Username must be at least 3 characters long"
          : "Username must be at most 32 characters long",
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
        const errorMessages = Array.isArray(data.message)
          ? data.message
          : typeof data.message === "string"
            ? [data.message]
            : [];

        const newFieldErrors: {
          email?: string;
          username?: string;
          password?: string;
        } = {};
        if (errorMessages.length > 0) {
          errorMessages.forEach((msg: string) => {
            const lowerMsg = msg.toLowerCase();
            if (lowerMsg.includes("email")) {
              newFieldErrors.email = msg;
            } else if (lowerMsg.includes("username")) {
              newFieldErrors.username = msg;
            } else if (lowerMsg.includes("password")) {
              newFieldErrors.password = msg;
            }
          });
          setFieldErrors(newFieldErrors);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-zinc-950 p-6 md:p-10">
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl">
        <RrRegisterForm
          email={email}
          setEmail={setEmail}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          passwordTouched={passwordTouched}
          setPasswordTouched={setPasswordTouched}
          loading={loading}
          message={message}
          setMessage={setMessage}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          errors={errors}
          validatePassword={validatePassword}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
