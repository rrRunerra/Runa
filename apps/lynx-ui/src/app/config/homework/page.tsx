"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@astral/ui";
import { Input } from "@astral/ui";
import { Button } from "@astral/ui";
import { useAlert } from "@/context/AlertContext";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function HomeworkConfigPage() {
  const [guildId, setGuildId] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate JSON locally first
      let parsedChannels;
      try {
        parsedChannels = JSON.parse(jsonInput);
      } catch (err) {
        showAlert({
          type: "error",
          title: "Invalid JSON",
          message: "Please enter valid JSON for the channels field.",
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/lynx/config/homework", {
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

      showAlert({
        type: "info",
        title: "Success",
        message: "HomeWorkChannels configuration saved successfully.",
      });
    } catch (error: any) {
      // eslint-disable-line @typescript-eslint/no-explicit-any
      showAlert({
        type: "error",
        title: "Error",
        message: error.message || "Something went wrong.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Link
          href="/lynx/config"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Configuration
        </Link>
        <h1 className="text-3xl font-bold mb-2">Homework Configuration</h1>
        <p className="text-muted-foreground">
          Configure the channels for homework assignments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HomeWork Channels</CardTitle>
          <CardDescription>
            Enter the Guild ID and the JSON configuration for subjects and
            channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  Saving...
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
