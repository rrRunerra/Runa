"use client";

import { ChevronRight, Settings, ScrollText } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AccessDenied from "@/components/lynx/AccessDenied";
import { motion } from "framer-motion";

export default function ConfigPage() {
  const { data: session, status } = useSession();
  if (status === "unauthenticated" || session?.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  const configs = [
    {
      title: "Homework Channels",
      description:
        "Configure subject-specific channels for homework assignments.",
      href: "/lynx/config/homework",
      icon: <ScrollText className="size-5" />,
    },
  ];

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
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Settings className="size-8 text-primary" />
          Bot Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Adjust features, subjects, automatic channels, and default behaviors of your Discord bot.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {configs.map((config) => (
          <Link key={config.href} href={config.href} className="block h-full">
            <motion.div
              variants={cardVariants}
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.985 }}
              className="h-full relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:border-zinc-700/50 hover:bg-zinc-800/10 cursor-pointer group flex flex-col justify-between transition-all duration-300 isolate [transform:translate3d(0,0,0)]"
            >
              {/* Accent glow on hover */}
              <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl border border-zinc-800 bg-zinc-900/50 text-primary flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                      {config.icon}
                    </div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {config.title}
                    </h3>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-1 max-w-lg">
                  {config.description}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
