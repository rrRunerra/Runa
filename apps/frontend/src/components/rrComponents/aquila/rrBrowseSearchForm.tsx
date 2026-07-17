"use client";

import React, { useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface RrBrowseSearchFormProps {
  query: string;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
}

export const RrBrowseSearchForm = ({
  query,
  onChange,
  onSubmit,
  placeholder,
}: RrBrowseSearchFormProps): React.JSX.Element => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedPlaceholder = placeholder ?? t("aquila.searchPlaceholder");

  return (
    <motion.form
      onSubmit={onSubmit}
      animate={{
        scale: isFocused ? 1.002 : 1,
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex gap-4 items-center bg-card/60 backdrop-blur-xs p-3 rounded-2xl border transition-all duration-300 w-full",
        isFocused
          ? "bg-background border-primary shadow-lg shadow-primary/5"
          : "border-border/40 hover:border-border/60 hover:bg-card"
      )}
    >
      <div className="relative flex-1 w-full flex items-center">
        <motion.div
          animate={{ rotate: isFocused ? 90 : 0, scale: isFocused ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
        >
          <Search className="size-5 text-muted-foreground/60" />
        </motion.div>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={resolvedPlaceholder}
          className="pl-11 pr-10 h-12 bg-transparent border-none w-full text-base rounded-xl transition-all shadow-none! focus-visible:ring-0! outline-hidden"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              type="button"
              onClick={() => onChange("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-muted/50 transition-colors"
            >
              <X className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.form>
  );
};
