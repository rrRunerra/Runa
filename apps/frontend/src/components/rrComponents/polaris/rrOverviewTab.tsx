import React from "react";
import { User, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConnectionIcon, getConnectionProfileUrl } from "./rrConnectionHelpers";

interface OverviewTabProps {
  bio: string;
  connections: any[];
}

export default function RrOverviewTab({ bio, connections }: OverviewTabProps): React.ReactNode {
  const getMetadataText = (conn: any): string | null => {
    if (!conn.metadata) return null;
    try {
      const meta = typeof conn.metadata === "string" ? JSON.parse(conn.metadata) : conn.metadata;
      const parts: string[] = [];
      if (meta.memberSince || meta.joinedAt) {
        const date = new Date(meta.memberSince || meta.joinedAt);
        parts.push(`Member since ${date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`);
      }
      if (meta.karma !== undefined) {
        parts.push(`${meta.karma} Karma`);
      }
      if (meta.gamesCount !== undefined || meta.games !== undefined) {
        parts.push(`${meta.gamesCount || meta.games} Games`);
      }
      if (meta.postsCount !== undefined || meta.posts !== undefined) {
        parts.push(`${meta.postsCount || meta.posts} Posts`);
      }
      if (meta.followersCount !== undefined || meta.followers !== undefined) {
        parts.push(`${meta.followersCount || meta.followers} Followers`);
      }
      return parts.length > 0 ? parts.join(" • ") : null;
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      {/* Left Column: About Me (2/3 width) */}
      <div className="lg:col-span-2">
        <Card className="w-full h-full bg-card shadow-sm border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">About Me</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            {bio ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-base font-bold text-foreground mt-4 mb-2" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-sm font-bold text-foreground mt-3 mb-1.5" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-xs font-bold text-foreground mt-2 mb-1" {...props} />,
                  p: ({node, ...props}) => <p className="mb-3 last:mb-0 text-muted-foreground leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="text-sm text-muted-foreground" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                  em: ({node, ...props}) => <em className="italic" {...props} />,
                  code: ({node, inline, ...props}: any) => 
                    inline ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs border" {...props} />
                    ) : (
                      <pre className="bg-muted border p-3 rounded-md overflow-x-auto my-3 font-mono text-xs text-foreground"><code {...props} /></pre>
                    ),
                  a: ({node, ...props}) => <a className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
                }}
              >
                {bio}
              </ReactMarkdown>
            ) : (
              <p className="italic text-muted-foreground/60">No description has been written yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Connections (1/3 width) */}
      <div className="lg:col-span-1">
        <Card className="w-full bg-card shadow-sm border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">Connections</CardTitle>
          </CardHeader>
          <CardContent>
            {connections?.length > 0 ? (
              <div className="flex flex-col gap-3">
                {connections.map((conn) => {
                  const Icon = getConnectionIcon(conn.provider);
                  const profileUrl = getConnectionProfileUrl(conn.provider, conn.linkedUsername || "");
                  const metadataText = getMetadataText(conn);

                  return (
                    <div
                      key={conn.id}
                      className="flex items-center justify-between p-3 rounded-md border bg-muted/10 hover:bg-muted/30 transition-all duration-200 w-full"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-white border shrink-0 p-1.5">
                          <Icon className="size-full object-contain" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-foreground select-all">
                              {conn.linkedUsername || "Connected"}
                            </span>
                            {profileUrl && (
                              <a
                                href={profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={`Visit ${conn.provider} profile`}
                              >
                                <ExternalLink className="size-3.5" aria-hidden="true" />
                              </a>
                            )}
                          </div>
                          {metadataText && (
                            <div className="text-xs text-muted-foreground mt-1 font-medium leading-none">
                              {metadataText}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/65 gap-2">
                <User className="size-6 text-muted-foreground/50" aria-hidden="true" />
                <span className="text-xs italic">No third-party accounts are linked.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
