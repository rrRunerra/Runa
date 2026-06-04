import { Radio, ShieldAlert } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

async function getEvent(name: string) {
  try {
    const res = await fetch(
      `${process.env.LYNX_API_URL}/events/getEvent/${name}`,
      {
        cache: "force-cache",
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch event:", error);
    return null;
  }
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const event = await getEvent(name);

  if (!event) {
    return (
      <div className="container mx-auto p-6 md:p-8 text-zinc-400 italic">
        Event not found
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      <PageHeader
        title={event.name}
        description={event.description}
        backHref="/lynx/events"
        backLabel="Back to Events"
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="size-5 text-muted-foreground" />
              Event Details
            </h3>
            <div className="p-4.5 rounded-xl bg-zinc-950/50 border border-zinc-900 text-zinc-300 leading-relaxed overflow-x-auto prose prose-invert prose-zinc max-w-none text-xs md:text-sm">
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
                {event.docs || "No documentation available."}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Sidebar Status/Config */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800/40 bg-zinc-950/20 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Radio className="size-5 text-muted-foreground" />
              Settings
            </h3>
            <div className="space-y-3.5 text-xs md:text-sm pl-1">
              <div className="flex items-center justify-between py-2 border-b border-zinc-900/60">
                <span className="text-muted-foreground/80 font-medium">Status</span>
                <Badge
                  variant={event.enabled ? "default" : "destructive"}
                  className={cn(
                    "text-[9px] font-bold uppercase",
                    event.enabled
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.08)]"
                      : "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.08)]"
                  )}
                >
                  {event.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-900/60">
                <span className="text-muted-foreground/80 font-medium">Trigger Type</span>
                <span className="text-foreground font-semibold text-xs md:text-sm">
                  {event.type || "Default"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground/80 font-medium">Execution</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-bold uppercase border",
                    event.once
                      ? "border-purple-500/30 text-purple-400 bg-purple-500/5 shadow-[0_0_8px_rgba(168,85,247,0.05)]"
                      : "border-blue-500/30 text-blue-400 bg-blue-500/5 shadow-[0_0_8px_rgba(59,130,246,0.05)]"
                  )}
                >
                  {event.once ? "Once" : "Persistent"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
