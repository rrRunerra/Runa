"use client";

import { ChevronRight, Server } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { motion } from "framer-motion";

function GuildsContent() {
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const [guilds, setGuilds] = useState<
    { id: string; name: string; iconUrl: string }[]
  >([]);

  const { data: session, status } = useSession();
  if (status === "unauthenticated" || session?.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  useEffect(() => {
    async function getGuilds() {
      const res = await fetch("/lynx/api/chat/getGuilds", {
        cache: "force-cache",
        next: {
          revalidate: 60,
          tags: ["guilds"]
        }
      });
      const data = await res.json();
      setGuilds(data.guilds);
    }
    getGuilds();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 350, damping: 26 }
    }
  } as const;

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      <PageHeader
        title={intent === "dm" ? "Choose a Guild" : "Discord Servers"}
        description={
          intent === "dm"
            ? "Select a guild to find members to message."
            : "Select a guild to send messages."
        }
        backHref="/lynx/chat"
        backLabel="Back to Chat"
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {guilds.map((guild) => (
          <Link
            key={guild.id}
            href={`/lynx/chat/guilds/${guild.id}${intent === "dm" ? "/dms" : ""}`}
            className="block h-full"
          >
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="h-full relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:border-zinc-700/50 hover:bg-zinc-800/10 cursor-pointer group flex flex-col justify-between transition-all duration-300 isolate [transform:translate3d(0,0,0)]"
            >
              {/* Accent glow on hover */}
              <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl border border-zinc-800 bg-zinc-900/50 text-primary flex items-center justify-center shadow-inner overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300">
                    {guild.iconUrl ? (
                      <img src={guild.iconUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <Server className="size-5" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[170px]" title={guild.name}>
                    {guild.name}
                  </h3>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}

export default function GuildsPage() {
  return (
    <Suspense>
      <GuildsContent />
    </Suspense>
  );
}
