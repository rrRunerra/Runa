"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function UserPage() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) return;

  router.push(`/aquila/user/${session.user.id}`);
}
