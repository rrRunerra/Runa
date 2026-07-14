"use client";

import { ChevronRight, Server } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission, LynxFlags } from "@runa/permissions";
import { Suspense } from "react";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { motion } from "framer-motion";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import Image from "next/image";
import { useTranslation } from "react-i18next";

function GuildsContent(): React.JSX.Element {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");

  const { data: session, status } = useSession();
  const { data, error } = useSWR<{
    guilds: { id: string; name: string; iconUrl: string }[];
  }>(
    status === "authenticated" &&
      hasPermission(session?.user?.permissions, LynxFlags.GUILD_CHAT)
      ? "/lynx/api/chat/getGuilds"
      : null,
    fetcher,
  );

  if (
    status === "unauthenticated" ||
    !hasPermission(session?.user?.permissions, LynxFlags.GUILD_CHAT)
  ) {
    return <AccessDenied />;
  }

  const guilds = data?.guilds || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 350, damping: 26 },
    },
  } as const;

  return (
    <div className="container mx-auto p-6 md:p-8 flex flex-col gap-6 md:gap-8 select-none">
      <PageHeader
        title={intent === "dm" ? t("chooseGuild") : t("discordServers")}
        description={
          intent === "dm" ? t("selectGuildDms") : t("selectGuildMessages")
        }
        backHref="/lynx/chat"
        backLabel={t("backToChat")}
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
              className="h-full relative overflow-hidden rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:border-border/60 hover:bg-accent/10 cursor-pointer group flex flex-col justify-between transition-all duration-300 isolate transform-[translate3d(0,0,0)]"
            >
              {/* Accent glow on hover */}
              <div className="absolute top-0 right-0 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl border border-border bg-muted/50 text-primary flex items-center justify-center shadow-inner overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300 relative">
                    {guild.iconUrl ? (
                      <Image
                        src={guild.iconUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Server className="size-5" />
                    )}
                  </div>
                  <h3
                    className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[170px]"
                    title={guild.name}
                  >
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

export default function GuildsPage(): React.JSX.Element {
  return (
    <Suspense>
      <GuildsContent />
    </Suspense>
  );
}
