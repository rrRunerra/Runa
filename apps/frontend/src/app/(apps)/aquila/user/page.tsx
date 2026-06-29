"use client";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";

export default function UserPage() {
  const { data: session } = useSession();
  const router = useRouter();

  return redirect(`/polaris/user/${session?.user?.username}`);
}
