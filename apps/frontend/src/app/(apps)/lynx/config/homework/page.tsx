"use client";

import { Loader2, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function HomeworkConfigPage() {
  const [guildId, setGuildId] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: session, status } = useSession();
  if (status === "unauthenticated" || session?.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate JSON locally first
      let parsedChannels;
      try {
        parsedChannels = JSON.parse(jsonInput);
      } catch (_err) {
        setIsLoading(false);
        toast.error("Invalid JSON format in channel configuration");
        return;
      }

      const response = await fetch("/lynx/api/config/homework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guildId,
          channels: parsedChannels,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }
      toast.success("Homework configuration saved successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save configuration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      <PageHeader
        title="Homework Configuration"
        description="Configure the channel mapping targets for automatic homework assignments."
        backHref="/lynx/config"
        backLabel="Back to Configuration"
      />

      <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl space-y-5">
        <div>
          <h3 className="text-lg font-bold text-foreground">Homework Channels</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enter the target Discord Guild ID and map subjects to their respective channel IDs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5 pl-0.5">
            <label htmlFor="guildId" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">
              Guild ID
            </label>
            <Input
              id="guildId"
              placeholder="e.g. 1425890971203145840"
              value={guildId}
              onChange={(e) => setGuildId(e.target.value)}
              autoComplete="off"
              required
              className="bg-zinc-900/30 border-zinc-800/60 rounded-xl px-4 py-2.5 text-xs text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all shadow-inner placeholder:text-muted-foreground/35"
            />
          </div>

          <div className="space-y-1.5 pl-0.5">
            <label htmlFor="channels" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">
              Channels JSON Configuration
            </label>
            <textarea
              id="channels"
              className="flex min-h-[250px] w-full rounded-xl border border-zinc-800/60 bg-zinc-950/80 px-4 py-3 text-xs font-mono text-zinc-300 placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 shadow-inner no-scrollbar"
              placeholder={`Use subject shorthand as keys:
{
  "apm": "1425890971203145840",
  "slj": "1425890971203145840",
  "pci": "1425890971203145840"
}`}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              required
            />
            <p className="text-[10px] text-muted-foreground/50 italic pl-1">
              Ensure you provide valid JSON brackets and double quotes around all keys and values.
            </p>
          </div>

          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving Configuration…
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Configuration
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}
