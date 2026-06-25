---
name: rr-components
description: Guide for creating new React/Next.js components, selecting workspace hooks, and applying premium Runa-style Tailwind CSS layouts. Always use this skill when asked to create, design, or refactor any user interface, modal, page, or UI tab in the Runa frontend app.
---

# Runa Frontend Component Creation Guide

This guide provides guidelines and examples for developing premium, theme-aware, accessible UI components in the Runa frontend codebase.

---

## 1. Directory Structure & Naming Conventions

All custom shared application components belong inside the `rrComponents` directory:
`apps/frontend/src/components/rrComponents/`

Follow these standard conventions:
- **File Names**: Use kebab-case for files (e.g. `rr-notifications-modal.tsx`, `rr-user-menu.tsx`).
- **Component Names**: Use PascalCase (e.g. `RrNotificationsModal`, `RrUserMenu`).
- **Helper Functions/Variables**: Use camelCase (e.g. `handleCloseDialog`, `unreadCount`).
- **Constants**: Use SCREAMING_SNAKE_CASE (e.g. `PAGE_SIZE`, `DEFAULT_COLOR`).

---

## 2. Standard Workspace Hooks

Always prioritize reusing these standard hooks instead of native fetches or custom state synchronization.

### A. Data Fetching: `useFetch`
Import `useFetch` from `@/hooks/useFetch` for all remote API communications.
```typescript
import { useFetch } from "@/hooks/useFetch";

// Query GET request
const { data, loading, error, refetch } = useFetch<Notification[]>(
  `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
  {
    headers: { Authorization: `Bearer ${session?.accessToken}` },
    enabled: !!session?.accessToken,
  }
);
```
- **Mutations (POST/PUT/DELETE)**: Perform requests inside event handlers using standard `fetch` but trigger a re-fetch or state sync immediately by invoking `refetch()` or dispatching a window sync event (e.g., `window.dispatchEvent(new CustomEvent("runa-sidebar-changed"))`).

### B. Encryption Status: `useRRe2ee`
Import `useRRe2ee` from `@/components/Providers/rrE2eeProvider` to manage encryption keys, encryption status, and triggering the unlock modal.
```typescript
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";

const { isE2eeUnlocked, isKeysExist, lockE2ee, setShowUnlockDialog } = useRRe2ee();
```
- Use `isE2eeUnlocked` to conditionally check if secure keys are active.
- Use `setShowUnlockDialog(true)` to trigger the decryption dialog manually.

### C. Navigation Sidebar: `useSidebar`
Import `useSidebar` from `@/components/ui/sidebar` to handle sidebar collapse states and mobile viewport detection.
```typescript
import { useSidebar } from "@/components/ui/sidebar";

const { isMobile, open, setOpen } = useSidebar();
```

---

## 3. Styling & Runa Aesthetics

Runa applications utilize Tailwind CSS with dark-mode optimized aesthetics. Apply these styling rules:

### A. Backdrop Blur & Glassmorphism
Modals and popups must use frosted-glass blur layers:
`bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 shadow-2xl`

### B. Custom Color Highlighting & Rings
Interactive fields (Inputs, Buttons) should feature clean transition glows:
`transition-all duration-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500`

### C. Badges & Indicators
Always use theme-aware pill badges for state representations:
- **Active / Unlocked / Success**: `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`
- **Locked / Warn / Inactive**: `bg-zinc-500/10 text-zinc-400 border-zinc-500/20`
- **Security / Primary Alert**: `bg-amber-500/10 text-amber-500 border-amber-500/20`

---

## 4. Reference Code Template: Modal with Forms

Use this template as a reference for modal setups containing identity form inputs, loading overlays, and E2EE checks.

```tsx
"use client";

import React, { useState } from "react";
import { Shield, Loader2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";

interface RrExampleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RrExampleModal({ open, onOpenChange }: RrExampleModalProps) {
  const { isE2eeUnlocked, unlockE2ee } = useRRe2ee();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError("");

    try {
      await unlockE2ee(password);
      setPassword("");
      onOpenChange(false);
    } catch (err: any) {
      setError("Incorrect password. Failed to unlock.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 shadow-2xl p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-zinc-800/40">
          <DialogTitle className="flex items-center gap-2 text-md font-bold text-foreground">
            <Shield className="size-5 text-amber-500" />
            Security Setup
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Enter your credentials to unlock secure workspace variables.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="passphrase" className="text-xs font-semibold text-zinc-400">
              Passphrase
            </Label>
            <Input
              id="passphrase"
              type="password"
              placeholder="Enter passphrase"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-10 bg-zinc-900 border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs"
              required
            />
          </div>

          {error && (
            <p className="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={loading || !password}
              className="h-9 px-5 bg-amber-600/90 hover:bg-amber-600 text-white border border-amber-500/30 text-xs font-semibold rounded-lg shadow-lg active:scale-95 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="size-3.5 mr-1.5" />
                  Confirm
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 5. Related Customizations & Skill Creation

When working on Runa features, if you identify recurring workflows, coding instructions, or API patterns that are not yet formalized, consult the `skill-creator` skill to capture the workflow.

- **Creating Skills**: If a user asks to formalize a workflow, or if you identify a pattern that would benefit from structured instructions (such as a new framework utility, SDK usage patterns, or test guidelines), invoke the `skill-creator` skill to scaffold and draft a new agent skill.
- **Notification**: When creating new skills or updating existing ones, notify the user immediately and direct them to the newly written skill file so they can review and utilize it.
