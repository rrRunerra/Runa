import {
  Book,
  Clock,
  Lock,
  MessageSquare,
  Server,
  Shield,
  Terminal,
  Users,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { Badge } from "@/components/ui/badge";
import { CommandOptions } from "@/components/lynx/CommandOptions";
import { cn } from "@/lib/utils";
import "dotenv/config";

async function getCommand(name: string) {
  try {
    const res = await fetch(
      `${process.env.LYNX_API_URL}/commands/getCommand/${name}`,
      { cache: "force-cache" },
    );
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch command:", error);
    return null;
  }
}

export default async function CommandPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const command = await getCommand(name);

  if (!command) {
    return (
      <div className="container mx-auto p-6 md:p-8 text-zinc-400 italic">
        Command not found
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      <PageHeader
        title={command.name}
        description={command.description}
        backHref="/lynx/commands"
        backLabel="Back to Commands"
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Documentation Card */}
          <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Book className="size-5 text-muted-foreground" />
              Documentation
            </h3>
            <div className="p-4.5 rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 leading-relaxed overflow-x-auto prose prose-stone dark:prose-invert max-w-none text-xs md:text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ ...props }) => (
                    <h1
                      className="text-lg font-bold mb-3 text-foreground"
                      {...props}
                    />
                  ),
                  h2: ({ ...props }) => (
                    <h2
                      className="text-md font-semibold mb-2 text-foreground"
                      {...props}
                    />
                  ),
                  h3: ({ ...props }) => (
                    <h3
                      className="text-sm font-medium mb-1.5 text-foreground"
                      {...props}
                    />
                  ),
                  p: ({ ...props }) => (
                    <p className="mb-3 last:mb-0" {...props} />
                  ),
                  ul: ({ ...props }) => (
                    <ul
                      className="list-disc pl-5 mb-3 space-y-1"
                      {...props}
                    />
                  ),
                  ol: ({ ...props }) => (
                    <ol
                      className="list-decimal pl-5 mb-3 space-y-1"
                      {...props}
                    />
                  ),
                  li: ({ ...props }) => (
                    <li className="text-muted-foreground" {...props} />
                  ),
                  code: ({ ...props }) => (
                    <code
                      className="bg-zinc-800/80 px-1.5 py-0.5 rounded text-primary font-mono text-[11px]"
                      {...props}
                    />
                  ),
                  pre: ({ ...props }) => (
                    <pre
                      className="bg-zinc-950/60 p-4 rounded-lg border border-zinc-800/40 mb-3 overflow-x-auto no-scrollbar font-mono text-[11px]"
                      {...props}
                    />
                  ),
                }}
              >
                {command.docs || "No documentation available."}
              </ReactMarkdown>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-900/60 shadow-inner">
                <span className="text-muted-foreground/60 text-[10px] uppercase font-bold tracking-wider block mb-1">
                  Category
                </span>
                <span className="text-foreground font-semibold text-xs md:text-sm">
                  {command.category || "Uncategorized"}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-900/60 shadow-inner">
                <span className="text-muted-foreground/60 text-[10px] uppercase font-bold tracking-wider block mb-1">
                  Cooldown
                </span>
                <span className="text-foreground font-semibold text-xs md:text-sm flex items-center gap-1">
                  <Clock className="size-3.5 text-primary" />
                  {command.cooldown}s
                </span>
              </div>
            </div>
          </div>

          {/* Options/Arguments if any */}
          {command.options && command.options.length > 0 && (
            <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-foreground">
                Options
              </h3>
              <div className="pl-1">
                <CommandOptions options={command.options} />
              </div>
            </div>
          )}

          {/* Subcommands */}
          {command.subCommands && command.subCommands.length > 0 && (
            <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Terminal className="size-5 text-muted-foreground" />
                Subcommands
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {command.subCommands.map(
                  (sub: any) => (
                    <div
                      key={sub.name}
                      className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-900/60 hover:border-zinc-800 hover:bg-zinc-800/5 transition-all shadow-inner"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-foreground font-bold text-xs md:text-sm">
                          {sub.name.split(".").pop()}
                        </span>
                        <Badge
                          variant={sub.enabled ? "default" : "destructive"}
                          className={cn(
                            "text-[9px] font-bold uppercase",
                            sub.enabled
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.08)]"
                              : "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.08)]"
                          )}
                        >
                          {sub.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="text-zinc-400 text-xs leading-relaxed prose prose-stone dark:prose-invert max-w-none prose-p:my-0">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ ...props }) => (
                              <p className="mb-2 last:mb-0" {...props} />
                            ),
                            ul: ({ ...props }) => (
                              <ul
                                className="list-disc pl-4 mb-2"
                                {...props}
                              />
                            ),
                            li: ({ ...props }) => (
                              <li className="text-muted-foreground" {...props} />
                            ),
                            code: ({ ...props }) => (
                              <code
                                className="bg-zinc-800/80 px-1.5 py-0.5 rounded text-accent-foreground font-mono text-[10px]"
                                {...props}
                              />
                            ),
                          }}
                        >
                          {sub.docs || "No documentation provided."}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Permissions */}
          <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl space-y-5">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Lock className="size-5 text-muted-foreground" />
              Permissions
            </h3>
            <div className="space-y-4">
              <div>
                <span className="text-muted-foreground/60 text-[10px] uppercase font-bold tracking-wider block mb-2 pl-1">
                  User Permissions
                </span>
                <div className="flex flex-wrap gap-2">
                  {command.userPermissions &&
                  command.userPermissions.length > 0 ? (
                    command.userPermissions.map((perm: string) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.08)] text-[10px] font-bold"
                      >
                        {perm}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/40 text-xs italic pl-1">
                      None required
                    </span>
                  )}
                </div>
              </div>
              <div className="border-t border-zinc-900/45 pt-3">
                <span className="text-muted-foreground/60 text-[10px] uppercase font-bold tracking-wider block mb-2 pl-1">
                  Client Permissions
                </span>
                <div className="flex flex-wrap gap-2">
                  {command.clientPermissions &&
                  command.clientPermissions.length > 0 ? (
                    command.clientPermissions.map((perm: string) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.08)] text-[10px] font-bold"
                      >
                        {perm}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/40 text-xs italic pl-1">
                      None required
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Status/Config */}
        <div className="space-y-6">
          {/* Configuration Summary Card */}
          <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="size-5 text-muted-foreground" />
              Settings
            </h3>
            <div className="space-y-3.5 text-xs md:text-sm pl-1">
              <div className="flex items-center justify-between py-2 border-b border-zinc-900/60">
                <span className="text-muted-foreground/80 font-medium">Status</span>
                <Badge
                  variant={command.enabled ? "default" : "destructive"}
                  className={cn(
                    "text-[9px] font-bold uppercase",
                    command.enabled
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.08)]"
                      : "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.08)]"
                  )}
                >
                  {command.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-900/60">
                <span className="text-muted-foreground/80 font-medium">Developer Only</span>
                <span
                  className={cn(
                    "font-bold text-xs uppercase",
                    command.dev
                      ? "text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                      : "text-muted-foreground/40"
                  )}
                >
                  {command.dev ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-900/60">
                <span className="text-muted-foreground/80 font-medium">NSFW Restriction</span>
                <span
                  className={cn(
                    "font-bold text-xs uppercase",
                    command.nsfw
                      ? "text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.05)]"
                      : "text-muted-foreground/40"
                  )}
                >
                  {command.nsfw ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground/80 font-medium">Allow DM</span>
                <span className="text-foreground">
                  {command.allowDm ? (
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs uppercase">
                      <MessageSquare className="size-3.5" /> Yes
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 font-bold text-xs uppercase">No</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Restrictions Card */}
          <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              Scope Restrictions
            </h3>
            <div className="space-y-4 pl-1">
              <div className="space-y-2 py-1.5 border-b border-zinc-900/60">
                <div className="flex items-center gap-2 text-muted-foreground/80 text-xs font-semibold">
                  <Server className="size-4 text-primary" /> Server Whitelist
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {command.serverOnly && command.serverOnly.length > 0 ? (
                    command.serverOnly.map((id: string) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="font-mono text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300"
                      >
                        {id}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/40 text-xs italic">
                      Global (all servers)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 py-1.5 border-b border-zinc-900/60">
                <div className="flex items-center gap-2 text-muted-foreground/80 text-xs font-semibold">
                  <Users className="size-4 text-primary" /> User Whitelist
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {command.userOnly && command.userOnly.length > 0 ? (
                    command.userOnly.map((id: string) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="font-mono text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300"
                      >
                        {id}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/40 text-xs italic">
                      Public (all users)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 py-1.5">
                <div className="flex items-center gap-2 text-muted-foreground/80 text-xs font-semibold">
                  <Clock className="size-4 text-primary" /> Cooldown Excluded Users
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {command.cooldownFilteredUsers &&
                  command.cooldownFilteredUsers.length > 0 ? (
                    command.cooldownFilteredUsers.map((id: string) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="font-mono text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300"
                      >
                        {id}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/40 text-xs italic">
                      None
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
