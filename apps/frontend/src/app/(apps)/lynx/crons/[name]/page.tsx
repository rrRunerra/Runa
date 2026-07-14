import { Activity, Clock, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getServerTranslation } from "@/lib/serverTranslation";

async function getCron(name: string): Promise<any> {
  try {
    const res = await fetch(
      `${process.env.LYNX_API_URL}/crons/getCron/${name}`,
      { cache: "force-cache" },
    );
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch cron:", error);
    return null;
  }
}

export default async function CronPage({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<React.JSX.Element> {
  const { name } = await params;
  const cron = await getCron(name);
  const { t } = await getServerTranslation();

  if (!cron) {
    return (
      <div className="container mx-auto p-6 md:p-8 text-muted-foreground italic">
        {t("cronNotFound")}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 md:p-8 flex flex-col gap-6 md:gap-8 select-none">
      <PageHeader
        title={cron.name}
        description={cron.description}
        backHref="/lynx/crons"
        backLabel={t("backToCrons")}
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Main Info */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Info className="size-5 text-muted-foreground" />
              {t("documentation")}
            </h3>
            <div className="p-4.5 rounded-xl bg-muted/50 border border-border text-muted-foreground leading-relaxed overflow-x-auto prose prose-invert prose-zinc max-w-none text-xs md:text-sm">
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
                {cron.docs || t("noDocumentation")}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Sidebar Status/Config */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border/40 bg-card/20 backdrop-blur-xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="size-5 text-muted-foreground" />
              {t("settings")}
            </h3>
            <div className="flex flex-col gap-3.5 text-xs md:text-sm pl-1">
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground/80 font-medium">{t("status")}</span>
                <Badge
                  variant={cron.enabled ? "default" : "destructive"}
                  className={cn(
                    "text-[9px] font-bold uppercase",
                    cron.enabled
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  )}
                >
                  {cron.enabled ? t("active") : t("disabled")}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-muted-foreground/80 font-medium flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {t("schedule")}
                </span>
                <span className="text-foreground font-mono font-bold text-xs">
                  {cron.schedule || t("notSet")}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground/80 font-medium">{t("nextRun")}</span>
                <span className="text-foreground text-xs font-semibold">
                  {cron.nextRun || t("na")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

