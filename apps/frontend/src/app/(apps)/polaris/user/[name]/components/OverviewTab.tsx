import React from "react";
import { User, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConnectionIcon, getConnectionProfileUrl } from "./ConnectionHelpers";

interface OverviewTabProps {
  bio: string;
  connections: any[];
}

export default function OverviewTab({ bio, connections }: OverviewTabProps) {
  const getMetadataText = (conn: any) => {
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
        <Card className="border-border/40 bg-card/25 backdrop-blur-xs rounded-2xl w-full h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-xs font-bold uppercase tracking-wider">About Me</CardTitle>
          </CardHeader>
          <CardContent className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            {bio ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-sm font-black text-white mt-3 mb-1.5 uppercase tracking-wide" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-xs font-black text-white mt-2.5 mb-1 uppercase tracking-wide" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-[11px] font-bold text-white mt-2 mb-0.5 uppercase tracking-wider" {...props} />,
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-muted-foreground leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-0.5" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-0.5" {...props} />,
                  li: ({node, ...props}) => <li className="text-xs text-muted-foreground" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-extrabold text-white" {...props} />,
                  em: ({node, ...props}) => <em className="italic" {...props} />,
                  code: ({node, inline, ...props}: any) => 
                    inline ? (
                      <code className="bg-zinc-900 text-zinc-300 px-1 py-0.5 rounded font-mono text-[10px] border border-zinc-800" {...props} />
                    ) : (
                      <pre className="bg-zinc-900 border border-zinc-800/80 p-2.5 rounded-lg overflow-x-auto my-2 font-mono text-[10px] text-zinc-200"><code {...props} /></pre>
                    ),
                  a: ({node, ...props}) => <a className="text-primary hover:underline font-semibold" target="_blank" rel="noopener noreferrer" {...props} />
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
        <Card className="border-border/40 bg-card/25 backdrop-blur-xs rounded-2xl w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-xs font-bold uppercase tracking-wider">Connections</CardTitle>
          </CardHeader>
          <CardContent>
            {connections?.length > 0 ? (
              <div className="flex flex-col gap-2">
                {connections.map((conn) => {
                  const Icon = getConnectionIcon(conn.provider);
                  const profileUrl = getConnectionProfileUrl(conn.provider, conn.linkedUsername || "");
                  const metadataText = getMetadataText(conn);

                  return (
                    <div
                      key={conn.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/20 border border-zinc-800/20 hover:border-zinc-700/40 hover:bg-zinc-950/30 transition-all duration-300 w-full"
                    >
                      <div className="flex items-center gap-3">
                        {/* circular icon container with white background like Discord */}
                        <div className="flex size-9 items-center justify-center rounded-full bg-white border border-zinc-200 shrink-0 p-1.5">
                          <Icon className="size-full object-contain" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white select-all">
                              {conn.linkedUsername || "Connected"}
                            </span>
                            {profileUrl && (
                              <a
                                href={profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-white transition-colors focus-visible:outline-hidden"
                                aria-label={`Visit ${conn.provider} profile`}
                              >
                                <ExternalLink className="size-3.5" aria-hidden="true" />
                              </a>
                            )}
                          </div>
                          {metadataText && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-none">
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
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground/60 gap-1.5">
                <User className="size-6 stroke-1" aria-hidden="true" />
                <span className="text-xs italic">No third-party accounts are linked to this profile.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
