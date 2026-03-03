"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@astral/ui";
import { Button } from "@astral/ui";
import { useAlert } from "@/context/AlertContext";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RngConfigPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/astral/config/rng");
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.ignoredNumbers)) {
            setJsonInput(data.ignoredNumbers.join(", "));
          }
        }
      } catch (error) {
        console.error("Failed to fetch RNG config", error);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Send raw string to backend
      const response = await fetch("/api/astral/config/rng", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ignoredNumbers: jsonInput,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }

      showAlert({
        type: "info",
        title: "Success",
        message: "RNG Rig configuration saved successfully.",
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
        <h1 className="text-3xl font-bold mb-2">RNG Rig Configuration</h1>
        <p className="text-muted-foreground">
          Configure the ignored numbers for the RNG command.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RNG Settings</CardTitle>
          <CardDescription>
            Configure the numbers that should be ignored by the random
            generator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="rngJson" className="text-sm font-medium">
                Ignored Numbers (comma separated)
              </label>
              <textarea
                id="rngJson"
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                placeholder="1, 2, 3"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter numbers separated by commas (e.g., 1, 2, 3).
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
                "Save RNG Config"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
