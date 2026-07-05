"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import useSWR from "swr";
import { ChevronRight, Database, Loader2, Table } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { hasPermission, RunaFlags } from "@runa/permissions";

import { getDatabaseModels } from "@/actions/monocerosDbActions";
import { Badge } from "@/components/ui/badge";

export default function MonocerosDatabasesPage() {
  const { data: session, status } = useSession();

  // Redirect unauthorized users
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/monoceros/unauthorized");
    }
    if (
      status === "authenticated" &&
      session?.user?.permissions &&
      !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)
    ) {
      redirect("/monoceros/unauthorized");
    }
  }, [status, session]);

  // SWR for database models
  const {
    data: models = [],
    error,
    isLoading,
  } = useSWR(
    status === "authenticated" ? "monoceros-db-models" : null,
    getDatabaseModels,
    {
      revalidateOnFocus: false,
    },
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03 },
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

  if (status === "loading" || (isLoading && models.length === 0)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Database className="size-8 text-indigo-500" />
          System Databases
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Inspect, explore, and modify system database structures and live
          tables in the main Prisma client.
        </p>
      </div>

      {/* Grid of Tables */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {models.length > 0 ? (
          models.map((model) => (
            <Link
              key={model}
              href={`/monoceros/databases/${model}`}
              className="block h-full"
            >
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="h-full relative overflow-hidden rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:border-zinc-700/50 hover:bg-zinc-800/10 cursor-pointer group flex flex-col justify-between transition-all duration-300 isolate"
              >
                {/* Glow accent */}
                <div className="absolute top-0 right-0 size-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl border border-zinc-800 bg-zinc-900/50 text-indigo-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                        <Table className="size-5" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-indigo-400 transition-colors">
                        {model}
                      </h3>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                    Manage fields, records, and indexes for the {model} table.
                  </p>
                </div>
              </motion.div>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground py-16 italic border-2 border-dashed border-zinc-800/40 rounded-2xl bg-zinc-900/10">
            No database tables found in Prisma client schema.
          </div>
        )}
      </motion.div>
    </div>
  );
}
