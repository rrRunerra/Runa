"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-6 text-emerald-500 shrink-0" />
        ),
        info: (
          <InfoIcon className="size-6 text-blue-500 shrink-0" />
        ),
        warning: (
          <TriangleAlertIcon className="size-6 text-amber-500 shrink-0" />
        ),
        error: (
          <OctagonXIcon className="size-6 text-rose-500 shrink-0" />
        ),
        loading: (
          <Loader2Icon className="size-6 animate-spin text-primary shrink-0" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast text-base md:text-lg p-5 md:p-6 shadow-2xl rounded-2xl border border-border font-medium flex gap-4 items-center min-w-[360px] md:min-w-[450px]",
          description: "text-sm text-muted-foreground mt-1",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
