"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function HomeworkConfigPage() {
  const [guildId, setGuildId] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: session, status } = useSession();
  if (status === "unauthenticated" || session?.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate JSON locally first
      let parsedChannels;
      try {
        parsedChannels = JSON.parse(jsonInput);
      } catch (_err) {
        setIsLoading(false);
        return;
      }

      const response = await fetch("/lynx/api/config/homework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guildId,
          channels: parsedChannels,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <PageHeader
        title="Homework Configuration"
        description="Configure the channels for homework assignments."
        backHref="/lynx/config"
        backLabel="Back to Configuration"
      />

      <Card>
        <CardHeader className="p-6">
          <CardTitle>HomeWork Channels</CardTitle>
          <CardDescription>
            Enter the Guild ID and the JSON configuration for subjects and
            channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="guildId" className="text-sm font-medium">
                Guild ID
              </label>
              <Input
                id="guildId"
                placeholder="Enter Guild ID"
                value={guildId}
                onChange={(e) => setGuildId(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="channels" className="text-sm font-medium">
                Channels JSON
              </label>
              <textarea
                id="channels"
                className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                placeholder={`Use subject shortName as key
{
    "apm": "1425890971203145840",
    "slj": "1425890971203145840",
    "pci": "1425890971203145840"
}`}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter a valid JSON object defining the channel configuration.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Configuration"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
