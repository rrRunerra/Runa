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
import { getServerTranslation } from "@/lib/serverTranslation";

async function getCommand(name: string): Promise<any> {
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
}): Promise<React.JSX.Element> {
  const { name } = await params;
  const command = await getCommand(name);
  const { t } = await getServerTranslation();

  if (!command) {
    return (
      <div className="container mx-auto p-6 md:p-8 text-muted-foreground italic">
        {t("commandNotFound")}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 md:p-8 flex flex-col gap-6 md:gap-8 select-none">
      <PageHeader
        title={command.name}
        description={command.description}
        backHref="/lynx/commands"
        backLabel={t("backToCommands")}
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Main Info */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Documentation Card */}
          <div className="rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Book className="size-5 text-muted-foreground" />
              {t("documentation")}
            </h3>
            <div className="p-4.5 rounded-xl bg-muted/50 border border-border text-muted-foreground leading-relaxed overflow-x-auto prose prose-stone dark:prose-invert max-w-none text-xs md:text-sm">
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
                      className="list-disc pl-5 mb-3 flex flex-col gap-1"
                      {...props}
                    />
                  ),
                  ol: ({ ...props }) => (
                    <ol
                      className="list-decimal pl-5 mb-3 flex flex-col gap-1"
                      {...props}
                    />
                  ),
                  li: ({ ...props }) => (
                    <li className="text-muted-foreground" {...props} />
                  ),
                  code: ({ ...props }) => (
                    <code
                      className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-[11px]"
                      {...props}
                    />
                  ),
                  pre: ({ ...props }) => (
                    <pre
                      className="bg-background/60 p-4 rounded-lg border border-border/40 mb-3 overflow-x-auto no-scrollbar font-mono text-[11px]"
                      {...props}
                    />
                  ),
                }}
              >
                {command.docs || t("noDocumentation")}
              </ReactMarkdown>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 shadow-inner">
                <span className="text-muted-foreground/60 text-[10px] uppercase font-bold tracking-wider block mb-1">
                  {t("category")}
                </span>
                <span className="text-foreground font-semibold text-xs md:text-sm">
                  {command.category || t("uncategorized")}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 shadow-inner">
                <span className="text-muted-foreground/60 text-[10px] uppercase font-bold tracking-wider block mb-1">
                  {t("cooldown")}
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
            <div className="rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-lg font-bold text-foreground">
                {t("options")}
              </h3>
              <div className="pl-1">
                <CommandOptions options={command.options} />
              </div>
            </div>
          )}

          {/* Subcommands */}
          {command.subCommands && command.subCommands.length > 0 && (
            <div className="rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl flex flex-col gap-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Terminal className="size-5 text-muted-foreground" />
                {t("subcommands")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {command.subCommands.map(
                  (sub: any) => (
                    <div
                      key={sub.name}
                      className="p-4 rounded-xl bg-muted/30 border border-border/60 hover:border-border/60 hover:bg-accent/5 transition-all shadow-inner"
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
                              ? "bg-success/10 text-success border border-success/20"
                              : "bg-destructive/10 text-destructive border border-destructive/20"
                          )}
                        >
                          {sub.enabled ? t("enabled") : t("disabled")}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-xs leading-relaxed prose prose-stone dark:prose-invert max-w-none prose-p:my-0">
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
                                className="bg-muted px-1.5 py-0.5 rounded text-accent-foreground font-mono text-[10px]"
                                {...props}
                              />
                            ),
                          }}
                        >
                          {sub.docs || t("noDocumentation")}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Permissions */}
          <div className="rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl flex flex-col gap-5">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Lock className="size-5 text-muted-foreground" />
              {t("permissions")}
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-muted-foreground/60 text-[10px] uppercase font-bold tracking-wider block mb-2 pl-1">
                  {t("userPermissions")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {command.userPermissions &&
                  command.userPermissions.length > 0 ? (
                    command.userPermissions.map((perm: string) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold"
                      >
                        {perm}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/40 text-xs italic pl-1">
                      {t("noneRequired")}
                    </span>
                  )}
                </div>
              </div>
              <div className="border-t border-border/45 pt-3">
                <span className="text-muted-foreground/60 text-[10px] uppercase font-bold tracking-wider block mb-2 pl-1">
                  {t("clientPermissions")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {command.clientPermissions &&
                  command.clientPermissions.length > 0 ? (
                    command.clientPermissions.map((perm: string) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold"
                      >
                        {perm}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/40 text-xs italic pl-1">
                      {t("noneRequired")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Status/Config */}
        <div className="flex flex-col gap-6">
          {/* Configuration Summary Card */}
          <div className="rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="size-5 text-muted-foreground" />
              {t("settings")}
            </h3>
            <div className="flex flex-col gap-3.5 text-xs md:text-sm pl-1">
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground/80 font-medium">{t("status")}</span>
                <Badge
                  variant={command.enabled ? "default" : "destructive"}
                  className={cn(
                    "text-[9px] font-bold uppercase",
                    command.enabled
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  )}
                >
                  {command.enabled ? t("enabled") : t("disabled")}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground/80 font-medium">{t("devOnly")}</span>
                <span
                  className={cn(
                    "font-bold text-xs uppercase",
                    command.dev
                      ? "text-amber-400"
                      : "text-muted-foreground/40"
                  )}
                >
                  {command.dev ? t("yes") : t("no")}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground/80 font-medium">{t("nsfwRestriction")}</span>
                <span
                  className={cn(
                    "font-bold text-xs uppercase",
                    command.nsfw
                      ? "text-red-400"
                      : "text-muted-foreground/40"
                  )}
                >
                  {command.nsfw ? t("yes") : t("no")}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground/80 font-medium">{t("allowDm")}</span>
                <span className="text-foreground">
                  {command.allowDm ? (
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs uppercase">
                      <MessageSquare className="size-3.5" /> {t("yes")}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40 font-bold text-xs uppercase">{t("no")}</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Restrictions Card */}
          <div className="rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="size-5 text-muted-foreground" />
              {t("scopeRestrictions")}
            </h3>
            <div className="flex flex-col gap-4 pl-1">
              <div className="flex flex-col gap-2 py-1.5 border-b border-border/60">
                <div className="flex items-center gap-2 text-muted-foreground/80 text-xs font-semibold">
                  <Server className="size-4 text-primary" /> {t("serverWhitelist")}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {command.serverOnly && command.serverOnly.length > 0 ? (
                    command.serverOnly.map((id: string) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="font-mono text-[10px] bg-muted border border-border text-muted-foreground"
                      >
                        {id}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/40 text-xs italic">
                      {t("globalAllServers")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 py-1.5 border-b border-border/60">
                <div className="flex items-center gap-2 text-muted-foreground/80 text-xs font-semibold">
                  <Users className="size-4 text-primary" /> {t("userWhitelist")}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {command.userOnly && command.userOnly.length > 0 ? (
                    command.userOnly.map((id: string) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="font-mono text-[10px] bg-muted border border-border text-muted-foreground"
                      >
                        {id}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/40 text-xs italic">
                      {t("publicAllUsers")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 py-1.5">
                <div className="flex items-center gap-2 text-muted-foreground/80 text-xs font-semibold">
                  <Clock className="size-4 text-primary" /> {t("cooldownExcludedUsers")}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {command.cooldownFilteredUsers &&
                  command.cooldownFilteredUsers.length > 0 ? (
                    command.cooldownFilteredUsers.map((id: string) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="font-mono text-[10px] bg-muted border border-border text-muted-foreground"
                      >
                        {id}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground/40 text-xs italic">
                      {t("none")}
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

