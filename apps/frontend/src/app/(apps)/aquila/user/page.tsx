"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UserPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.username) {
      router.push(`/aquila/user/${session.user.username}`);
    }
  }, [router, session]);

  return null;
}
