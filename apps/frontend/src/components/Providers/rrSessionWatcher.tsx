"use client";

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

/**
 * Monitors session validity.
 * Automatically clears stale cookies and resets NextAuth session state
 * when a token expires or session payload is missing, preventing app-wide crashes.
 */
export function RrSessionWatcher(): null {
  const { data: session, status } = useSession();
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    if (isSigningOutRef.current) return;

    const hasSessionError =
      session?.error === "AccessTokenExpired" ||
      session?.error === "TokenExpired" ||
      Boolean(session?.error);

    const isMissingUser = Boolean(session && !session.user);

    if (hasSessionError || isMissingUser) {
      isSigningOutRef.current = true;
      signOut({ redirect: false }).finally(() => {
        isSigningOutRef.current = false;
      });
    }
  }, [session, status]);

  return null;
}
