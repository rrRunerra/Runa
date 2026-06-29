"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";
import { SpotlightParameter } from "../rrComponents/rrSpotlight/BaseSpotlightFeature";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

interface SpotlightContextType {
  clipboardHistory: string[];
  isE2eeUnlocked: boolean;
  openPreview: (content: React.ReactNode) => void;
  openParameters: (
    actionId: string,
    parameters: SpotlightParameter[],
    onSubmit: (params: Record<string, any>) => void
  ) => void;
}

const SpotlightContext = createContext<SpotlightContextType | undefined>(undefined);

export function useSpotlight(): SpotlightContextType {
  const context = useContext(SpotlightContext);
  if (!context) {
    throw new Error("useSpotlight must be used within RrSpotlightProvider");
  }
  return context;
}

export function RrSpotlightProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { data: session } = useSession();
  const { isE2eeUnlocked } = useRRe2ee();
  const [clipboardHistory, setClipboardHistory] = useState<string[]>([]);

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<React.ReactNode | null>(null);

  // Parameters form dialog state
  const [paramOpen, setParamOpen] = useState(false);
  const [paramActionId, setParamActionId] = useState<string | null>(null);
  const [paramFields, setParamFields] = useState<SpotlightParameter[] | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [paramOnSubmit, setParamOnSubmit] = useState<((params: Record<string, any>) => void) | null>(null);

  // Autocomplete state
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);

  // 1. Capture text copies on the site
  useEffect(() => {
    const handleCopy = () => {
      const selection = window.getSelection()?.toString();
      if (selection && selection.trim()) {
        const text = selection.trim();
        setClipboardHistory((prev) => {
          const filtered = prev.filter((item) => item !== text);
          return [text, ...filtered].slice(0, 30);
        });
      }
    };

    const handleCustomCopy = (e: Event) => {
      const text = (e as CustomEvent).detail?.text;
      if (text && text.trim()) {
        const cleaned = text.trim();
        setClipboardHistory((prev) => {
          const filtered = prev.filter((item) => item !== cleaned);
          return [cleaned, ...filtered].slice(0, 30);
        });
      }
    };

    window.addEventListener("copy", handleCopy);
    window.addEventListener("runa-copy", handleCustomCopy);
    return () => {
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("runa-copy", handleCustomCopy);
    };
  }, []);

  const openPreview = (content: React.ReactNode) => {
    setPreviewContent(content);
    setPreviewOpen(true);
  };

  const openParameters = (
    actionId: string,
    parameters: SpotlightParameter[],
    onSubmit: (params: Record<string, any>) => void
  ) => {
    const initialValues: Record<string, string> = {};
    parameters.forEach((p) => {
      initialValues[p.name] = p.defaultValue || "";
    });
    setParamValues(initialValues);
    setParamFields(parameters);
    setParamActionId(actionId);
    setParamOnSubmit(() => onSubmit);
    setParamOpen(true);
    setActiveSuggestionField(null);
  };

  const handleParamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paramOnSubmit) {
      paramOnSubmit(paramValues);
    }
    setParamOpen(false);
  };

  return (
    <SpotlightContext.Provider
      value={{
        clipboardHistory,
        isE2eeUnlocked,
        openPreview,
        openParameters,
      }}
    >
      {children}

      {/* 1. Quick Look Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl bg-popover border border-border shadow-2xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 border-b border-border bg-muted/20">
            <DialogTitle className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
              Quick Look Detail
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[480px] overflow-y-auto no-scrollbar">
            {previewContent}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Interactive Actions Parameter Form Dialog */}
      <Dialog open={paramOpen} onOpenChange={setParamOpen}>
        <DialogContent className="sm:max-w-lg bg-popover border border-border shadow-3xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 border-b border-border bg-muted/20 flex flex-row items-center gap-3">
            <Calendar className="size-5 text-primary" />
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Action Parameters Required
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fill the parameter fields to execute this action.
              </p>
            </div>
          </DialogHeader>

          <form onSubmit={handleParamSubmit} className="flex flex-col">
            <div className="p-6 flex flex-col gap-5 max-h-[400px] overflow-y-auto">
              {paramFields?.map((field) => {
                const isSelectedForSuggestions = activeSuggestionField === field.name;

                return (
                  <div key={field.name} className="flex flex-col gap-2 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-primary tracking-wide">
                        {field.label}
                      </label>
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-muted-foreground bg-primary/2">
                        Parameter
                      </Badge>
                    </div>

                    {field.type === "select" ? (
                      <select
                        value={paramValues[field.name] || ""}
                        onChange={(e) =>
                          setParamValues((prev) => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                        className="flex h-10 w-full rounded-xl border border-primary/20 bg-background px-3 py-2 text-sm text-foreground shadow-xs ring-offset-background focus:outline-hidden focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-semibold"
                      >
                        <option value="" disabled>Select option...</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <Textarea
                        placeholder={field.placeholder}
                        value={paramValues[field.name] || ""}
                        onChange={(e) =>
                          setParamValues((prev) => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-primary/20 bg-background/50 text-sm shadow-xs focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all min-h-[100px]"
                      />
                    ) : (
                      <div className="relative">
                        <Input
                          placeholder={field.placeholder}
                          value={paramValues[field.name] || ""}
                          onFocus={() => {
                            if (field.autoCompleteSuggestions?.length) {
                              setActiveSuggestionField(field.name);
                            }
                          }}
                          onBlur={() => {
                            // Delay blur so clicks register on autocomplete options
                            setTimeout(() => {
                              setActiveSuggestionField((curr) =>
                                curr === field.name ? null : curr
                              );
                            }, 200);
                          }}
                          onChange={(e) =>
                            setParamValues((prev) => ({
                              ...prev,
                              [field.name]: e.target.value,
                            }))
                          }
                          className="rounded-xl border border-primary/20 bg-background/50 text-sm shadow-xs focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all font-semibold"
                        />
                        {/* Custom visual Standout Autocomplete Menu */}
                        {isSelectedForSuggestions && field.autoCompleteSuggestions && (
                          <div className="absolute top-[105%] left-0 right-0 z-50 rounded-xl border border-border bg-popover shadow-xl p-1.5 flex flex-col max-h-[150px] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground px-2 py-1">Suggestions</span>
                            {field.autoCompleteSuggestions
                              .filter((suggestion) =>
                                suggestion
                                  .toLowerCase()
                                  .includes((paramValues[field.name] || "").toLowerCase())
                              )
                              .map((suggestion) => (
                                <button
                                  type="button"
                                  key={suggestion}
                                  onMouseDown={() => {
                                    setParamValues((prev) => ({
                                      ...prev,
                                      [field.name]: suggestion,
                                    }));
                                    setActiveSuggestionField(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg text-foreground hover:bg-primary/10 hover:text-primary transition-all select-none"
                                >
                                  {suggestion}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter className="p-5 border-t border-border bg-muted/20 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setParamOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                Run Action
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SpotlightContext.Provider>
  );
}
