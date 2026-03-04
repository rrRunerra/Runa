"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Globe,
  CornerDownRight,
} from "lucide-react";
import {
  Badge,
  cn,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../index";

interface CommandOption {
  name: string;
  description: string;
  type: number;
  required?: boolean;
  autocomplete?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  channelTypes?: number[];
  choices?: { name: string; value: string | number }[];
  options?: CommandOption[]; // Sub-options
  descriptionLocalizations?: Record<string, string>;
  nameLocalizations?: Record<string, string>;
}

const OPTION_TYPES: Record<number, string> = {
  1: "Sub Command",
  2: "Sub Command Group",
  3: "String",
  4: "Integer",
  5: "Boolean",
  6: "User",
  7: "Channel",
  8: "Role",
  9: "Mentionable",
  10: "Number",
  11: "Attachment",
};

const CHANNEL_TYPES: Record<number, string> = {
  0: "GuildText",
  1: "DM",
  2: "GuildVoice",
  3: "GroupDM",
  4: "GuildCategory",
  5: "GuildAnnouncement",
  10: "AnnouncementThread",
  11: "PublicThread",
  12: "PrivateThread",
  13: "GuildStageVoice",
  14: "GuildDirectory",
  15: "GuildForum",
  16: "GuildMedia",
};

const LOCALES: Record<string, string> = {
  id: "Indonesian",
  "en-US": "English (US)",
  "en-GB": "English (UK)",
  bg: "Bulgarian",
  "zh-CN": "Chinese (China)",
  "zh-TW": "Chinese (Taiwan)",
  hr: "Croatian",
  cs: "Czech",
  da: "Danish",
  nl: "Dutch",
  fi: "Finnish",
  fr: "French",
  de: "German",
  el: "Greek",
  hi: "Hindi",
  hu: "Hungarian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  lt: "Lithuanian",
  no: "Norwegian",
  pl: "Polish",
  "pt-BR": "Portuguese (Brazil)",
  ro: "Romanian",
  ru: "Russian",
  "es-ES": "Spanish (Spain)",
  "es-419": "Spanish (LATAM)",
  "sv-SE": "Swedish",
  th: "Thai",
  tr: "Turkish",
  uk: "Ukrainian",
  vi: "Vietnamese",
};

export function CommandOptions({
  options,
  level = 0,
}: {
  options: CommandOption[];
  level?: number;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (!options || options.length === 0) return null;

  return (
    <div className={cn("grid gap-2", level > 0 && "ml-4")}>
      {options.map((opt, i) => {
        const isOpen = openIndex === i;
        const typeName = OPTION_TYPES[opt.type] || `Type ${opt.type}`;

        return (
          <Collapsible
            key={i}
            open={isOpen}
            onOpenChange={() => toggle(i)}
            className={cn(
              "flex flex-col rounded-md border transition-all duration-200",
              isOpen
                ? "bg-zinc-900/50 border-zinc-700 shadow-lg"
                : "bg-zinc-500/5 border-zinc-500/10 hover:border-zinc-500/30",
            )}
          >
            {/* Header / Summary */}
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 cursor-pointer select-none">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    {level > 0 && (
                      <CornerDownRight className="w-4 h-4 text-zinc-600" />
                    )}
                    <span className="text-zinc-200 font-mono text-sm font-bold">
                      {opt.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-zinc-500 text-[10px] uppercase border-zinc-700 h-5"
                    >
                      {typeName}
                    </Badge>
                    {opt.required && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 h-5"
                      >
                        Required
                      </Badge>
                    )}
                  </div>
                  <p
                    className={cn("text-zinc-400 text-xs", level > 0 && "ml-6")}
                  >
                    {opt.description}
                  </p>
                </div>
                <div className="text-zinc-500">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>

            {/* Expanded Details */}
            <CollapsibleContent className="data-open:animate-accordion-down data-closed:animate-accordion-up overflow-hidden">
              <div className="p-3 pt-0 border-t border-zinc-800/50 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                  {/* General Config */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Configuration
                    </h4>

                    {/* Type & Required Explicitly */}
                    <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Type</span>
                      <span className="text-zinc-200 font-mono text-xs">
                        {typeName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                      <span className="text-zinc-400">Required</span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          opt.required ? "text-red-400" : "text-zinc-500",
                        )}
                      >
                        {opt.required ? "Yes" : "No"}
                      </span>
                    </div>

                    {opt.autocomplete !== undefined && (
                      <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                        <span className="text-zinc-400">Autocomplete</span>
                        {opt.autocomplete ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <X className="w-4 h-4 text-zinc-600" />
                        )}
                      </div>
                    )}

                    {(opt.minLength !== undefined ||
                      opt.maxLength !== undefined) && (
                      <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                        <span className="text-zinc-400">Length</span>
                        <span className="text-zinc-200 font-mono text-xs">
                          {opt.minLength ?? 0} - {opt.maxLength ?? "Max"}
                        </span>
                      </div>
                    )}

                    {(opt.minValue !== undefined ||
                      opt.maxValue !== undefined) && (
                      <div className="flex items-center justify-between py-1 border-b border-zinc-800/50">
                        <span className="text-zinc-400">Value Range</span>
                        <span className="text-zinc-200 font-mono text-xs">
                          {opt.minValue ?? "Min"} - {opt.maxValue ?? "Max"}
                        </span>
                      </div>
                    )}

                    {/* No config options fallback */}
                    {opt.autocomplete === undefined &&
                      opt.minLength === undefined &&
                      opt.maxLength === undefined &&
                      opt.minValue === undefined &&
                      opt.maxValue === undefined && (
                        <div className="text-zinc-600 italic text-xs">
                          No extra configuration
                        </div>
                      )}
                  </div>

                  {/* Channel Types & Choices */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Specifics
                    </h4>

                    {opt.channelTypes && opt.channelTypes.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 block text-xs">
                          Channel Types
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {opt.channelTypes.map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="text-[10px] bg-zinc-800 text-zinc-400"
                            >
                              {CHANNEL_TYPES[t] || t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {opt.choices && opt.choices.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 block text-xs">
                          Choices
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {opt.choices.map((c, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[10px] bg-blue-500/10 text-blue-300"
                            >
                              {c.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!opt.channelTypes || opt.channelTypes.length === 0) &&
                      (!opt.choices || opt.choices.length === 0) && (
                        <div className="text-zinc-600 italic text-xs">
                          No specific settings
                        </div>
                      )}
                  </div>
                </div>

                {/* Localizations */}
                {(opt.nameLocalizations || opt.descriptionLocalizations) && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-4 h-4 text-zinc-500" />
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Localizations
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {opt.nameLocalizations &&
                        Object.keys(opt.nameLocalizations).length > 0 && (
                          <div className="space-y-2">
                            <span className="text-zinc-400 text-xs font-medium">
                              Name Override
                            </span>
                            <div className="grid gap-1">
                              {Object.entries(opt.nameLocalizations).map(
                                ([code, val]) => (
                                  <div
                                    key={code}
                                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-zinc-500/5"
                                  >
                                    <span className="text-zinc-500 font-mono">
                                      {LOCALES[code] || code}
                                    </span>
                                    <span className="text-zinc-300 font-mono">
                                      {val || (
                                        <span className="text-zinc-600 italic">
                                          Empty
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {opt.descriptionLocalizations &&
                        Object.keys(opt.descriptionLocalizations).length >
                          0 && (
                          <div className="space-y-2">
                            <span className="text-zinc-400 text-xs font-medium">
                              Description Override
                            </span>
                            <div className="grid gap-1">
                              {Object.entries(opt.descriptionLocalizations).map(
                                ([code, val]) => (
                                  <div
                                    key={code}
                                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-zinc-500/5"
                                  >
                                    <span className="text-zinc-500 font-mono">
                                      {LOCALES[code] || code}
                                    </span>
                                    <span
                                      className="text-zinc-300 truncate max-w-[150px]"
                                      title={val}
                                    >
                                      {val || (
                                        <span className="text-zinc-600 italic">
                                          Empty
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Nested Options (Recursion) */}
                {opt.options && opt.options.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/50">
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Sub-Options
                    </h4>
                    <CommandOptions options={opt.options} level={level + 1} />
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
