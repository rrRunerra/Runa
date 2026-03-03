import { Card, CardHeader, CardTitle, CardContent, Badge } from "@astral/ui";
import Link from "next/link";
import { CommandOptions } from "@/components/commandOptions";
import {
  ChevronLeft,
  Terminal,
  Shield,
  Clock,
  Book,
  Users,
  Server,
  Lock,
  MessageSquare,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

async function getCommand(name: string) {
  try {
    const res = await fetch(
      `http://localhost:4444/commands/getCommand/${name}`,
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
      <div className="container mx-auto p-8 text-zinc-400">
        Command not found
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8 relative">
      {/* Header */}
      <div className="relative z-10 flex flex-col gap-4">
        <Link
          href="/lynx/commands"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Commands
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Terminal className="w-8 h-8 text-muted-foreground" />
            {command.name}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {command.description}
          </p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <Book className="w-5 h-5 text-muted-foreground" />
                Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted border border-border text-foreground leading-relaxed overflow-x-auto prose prose-stone dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ ...props }) => (
                      <h1
                        className="text-xl font-bold mb-4 text-foreground"
                        {...props}
                      />
                    ),
                    h2: ({ ...props }) => (
                      <h2
                        className="text-lg font-semibold mb-3 text-foreground"
                        {...props}
                      />
                    ),
                    h3: ({ ...props }) => (
                      <h3
                        className="text-md font-medium mb-2 text-foreground"
                        {...props}
                      />
                    ),
                    p: ({ ...props }) => (
                      <p className="mb-4 last:mb-0" {...props} />
                    ),
                    ul: ({ ...props }) => (
                      <ul
                        className="list-disc pl-6 mb-4 space-y-1"
                        {...props}
                      />
                    ),
                    ol: ({ ...props }) => (
                      <ol
                        className="list-decimal pl-6 mb-4 space-y-1"
                        {...props}
                      />
                    ),
                    li: ({ ...props }) => (
                      <li className="text-muted-foreground" {...props} />
                    ),
                    code: ({ ...props }) => (
                      <code
                        className="bg-accent px-1.5 py-0.5 rounded text-accent-foreground font-mono text-xs"
                        {...props}
                      />
                    ),
                    pre: ({ ...props }) => (
                      <pre
                        className="bg-accent/50 p-4 rounded-lg border border-border mb-4 overflow-x-auto"
                        {...props}
                      />
                    ),
                  }}
                >
                  {command.docs || "No documentation available."}
                </ReactMarkdown>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-accent/10 border border-border">
                  <span className="text-muted-foreground text-sm block mb-1">
                    Category
                  </span>
                  <span className="text-foreground font-medium">
                    {command.category || "Uncategorized"}
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-accent/10 border border-border">
                  <span className="text-muted-foreground text-sm block mb-1">
                    Cooldown
                  </span>
                  <span className="text-foreground font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {command.cooldown}s
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Options/Arguments if any */}
          {command.options && command.options.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-foreground">
                  Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommandOptions options={command.options} />
              </CardContent>
            </Card>
          )}

          {/* Subcommands */}
          {command.subCommands && command.subCommands.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-muted-foreground" />
                  Subcommands
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {command.subCommands.map(
                    (
                      sub: any, // eslint-disable-line @typescript-eslint/no-explicit-any
                    ) => (
                      <div
                        key={sub.name}
                        className="p-4 rounded-lg bg-accent/5 border border-border hover:border-accent transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-foreground">
                            {sub.name.split(".").pop()}
                          </span>
                          <Badge
                            variant={sub.enabled ? "default" : "destructive"}
                            className={`text-xs ${
                              sub.enabled
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : ""
                            }`}
                          >
                            {sub.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground text-sm prose prose-stone dark:prose-invert max-w-none">
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
                                <li
                                  className="text-muted-foreground"
                                  {...props}
                                />
                              ),
                              code: ({ ...props }) => (
                                <code
                                  className="bg-accent px-1 rounded text-accent-foreground font-mono text-xs"
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
              </CardContent>
            </Card>
          )}

          {/* Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <Lock className="w-5 h-5 text-muted-foreground" />
                Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <span className="text-muted-foreground text-sm block mb-2">
                  User Permissions
                </span>
                <div className="flex flex-wrap gap-2">
                  {command.userPermissions &&
                  command.userPermissions.length > 0 ? (
                    command.userPermissions.map((perm: string) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20"
                      >
                        {perm}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/50 text-sm italic">
                      None
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm block mb-2">
                  Client Permissions
                </span>
                <div className="flex flex-wrap gap-2">
                  {command.clientPermissions &&
                  command.clientPermissions.length > 0 ? (
                    command.clientPermissions.map((perm: string) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20"
                      >
                        {perm}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/50 text-sm italic">
                      None
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Status/Config */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-muted-foreground" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={command.enabled ? "default" : "destructive"}
                  className={
                    command.enabled
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : ""
                  }
                >
                  {command.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Dev Only</span>
                <span
                  className={
                    command.dev
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground/50"
                  }
                >
                  {command.dev ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">NSFW</span>
                <span
                  className={
                    command.nsfw
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground/50"
                  }
                >
                  {command.nsfw ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Allow DM</span>
                <span className="text-foreground">
                  {command.allowDm ? (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <MessageSquare className="w-3 h-3" /> Yes
                    </div>
                  ) : (
                    <span className="text-muted-foreground/50">No</span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Restrictions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                Restrictions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Server className="w-4 h-4" /> Server Only
                </div>
                <div className="flex flex-wrap gap-1">
                  {command.serverOnly && command.serverOnly.length > 0 ? (
                    command.serverOnly.map((id: string) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="font-mono text-xs"
                      >
                        {id}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/50 text-xs italic">
                      No restriction
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Users className="w-4 h-4" /> User Only
                </div>
                <div className="flex flex-wrap gap-1">
                  {command.userOnly && command.userOnly.length > 0 ? (
                    command.userOnly.map((id: string) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="font-mono text-xs"
                      >
                        {id}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/50 text-xs italic">
                      No restriction
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="w-4 h-4" /> Cooldown Excluded
                </div>
                <div className="flex flex-wrap gap-1">
                  {command.cooldownFilteredUsers &&
                  command.cooldownFilteredUsers.length > 0 ? (
                    command.cooldownFilteredUsers.map((id: string) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="font-mono text-xs"
                      >
                        {id}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/50 text-xs italic">
                      None
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
