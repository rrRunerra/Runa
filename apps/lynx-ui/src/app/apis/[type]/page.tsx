import { Card, CardHeader, CardTitle, CardContent, Badge } from "@astral/ui";
import Link from "next/link";
import { ChevronLeft, Key, Info, Activity } from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

async function getApi(name: string) {
  try {
    // We need to encode the name because it might contain slashes
    const encodedName = encodeURIComponent(name);
    const res = await fetch(
      `http://localhost:4444/apis/getApi/${encodedName}`,
      {
        cache: "force-cache",
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Failed to fetch API:", error);
    return null;
  }
}

export default async function ApiPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  // Next.js params are already decoded, but let's be safe
  const name = decodeURIComponent(type);
  const api = await getApi(name);

  if (!api) {
    return (
      <div className="container mx-auto p-8 text-zinc-400">
        API endpoint not found
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8 relative">
      {/* Header */}
      <div className="relative z-10 flex flex-col gap-4">
        <Link
          href="/lynx/apis"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to APIs
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Key className="w-8 h-8 text-muted-foreground" />
            {api.name}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Detailed API documentation
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
                <Info className="w-5 h-5 text-muted-foreground" />
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
                  {api.docs || "No documentation available."}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Status/Config */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-muted-foreground" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={api.enabled ? "default" : "destructive"}
                  className={
                    api.enabled
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : ""
                  }
                >
                  {api.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Route</span>
                <span className="text-foreground font-mono text-sm break-all ml-4">
                  {api.name}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
