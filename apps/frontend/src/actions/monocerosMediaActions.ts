"use server";

import { auth } from "@runa/auth";
import { hasPermission, RunaFlags } from "@runa/permissions";

export async function triggerMediaRefresh(): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    throw new Error("Unauthorized");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  try {
    const res = await fetch(`${apiUrl}/media-update/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.message || `Request failed with status ${res.status}`;
      throw new Error(Array.isArray(errMsg) ? errMsg[0] : errMsg);
    }

    const data = await res.json();
    return { success: true, message: data.message || "Weekly media refresh triggered successfully" };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to trigger media refresh";
    console.error("Failed to trigger media refresh:", error);
    return { success: false, error: errorMessage };
  }
}
