import { Card, CardHeader, CardTitle, CardContent, Badge } from "@runa/ui";
import Link from "next/link";
import { ChevronLeft, Zap, Info, Radio } from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

async function getEvent(name: string) {
  try {
    const res = await fetch(`http://localhost:4444/events/getEvent/${name}`, {
      cache: "force-cache",
    });
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
      <div className="container mx-auto p-8 text-zinc-400">Event not found</div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8 relative">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30" />

      {/* Header */}
      <div className="relative z-10 flex flex-col gap-4">
        <Link
          href="/lynx/events"
          className="flex items-center text-sm text-zinc-400 hover:text-white transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Events
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent flex items-center gap-3">
            <Zap className="w-8 h-8 text-zinc-400" />
            {event.name}
          </h1>
          <p className="text-zinc-400 mt-2 text-lg">{event.description}</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-zinc-100 flex items-center gap-2">
                <Info className="w-5 h-5 text-zinc-400" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800 text-zinc-300 leading-relaxed overflow-x-auto prose prose-invert prose-zinc max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ ...props }) => (
                      <h1
                        className="text-xl font-bold mb-4 text-white"
                        {...props}
                      />
                    ),
                    h2: ({ ...props }) => (
                      <h2
                        className="text-lg font-semibold mb-3 text-zinc-100"
                        {...props}
                      />
                    ),
                    h3: ({ ...props }) => (
                      <h3
                        className="text-md font-medium mb-2 text-zinc-200"
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
                      <li className="text-zinc-400" {...props} />
                    ),
                    code: ({ ...props }) => (
                      <code
                        className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-xs"
                        {...props}
                      />
                    ),
                    pre: ({ ...props }) => (
                      <pre
                        className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 mb-4 overflow-x-auto"
                        {...props}
                      />
                    ),
                  }}
                >
                  {event.docs || "No documentation available."}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Status/Config */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-zinc-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-zinc-400" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-zinc-400">Status</span>
                <Badge
                  variant={event.enabled ? "default" : "destructive"}
                  className={
                    event.enabled
                      ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                      : ""
                  }
                >
                  {event.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-zinc-400">Trigger Type</span>
                <span className="text-zinc-200 font-medium">
                  {event.type || "Default"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                <span className="text-zinc-400">Execution</span>
                <Badge
                  variant="outline"
                  className={
                    event.once
                      ? "border-purple-500/50 text-purple-400"
                      : "border-blue-500/50 text-blue-400"
                  }
                >
                  {event.once ? "Once" : "Persistent"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
