import { Card, CardHeader, CardTitle, CardContent, Badge } from "@runa/ui";
import { Zap, Info, Radio } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
      <div className="container mx-auto p-8 text-muted-foreground">
        Event not found
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <PageHeader
        title={event.name}
        description={event.description}
        backHref="/events"
        backLabel="Back to Events"
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="p-6">
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border text-foreground leading-relaxed overflow-x-auto prose prose-invert prose-zinc max-w-none">
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
                  {event.docs || "No documentation available."}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Status/Config */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-6">
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <Radio className="w-5 h-5 text-muted-foreground" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Status</span>
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
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Trigger Type</span>
                <span className="text-foreground font-medium">
                  {event.type || "Default"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Execution</span>
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
