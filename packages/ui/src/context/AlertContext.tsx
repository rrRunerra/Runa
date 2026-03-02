"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Alert, AlertTitle, AlertDescription } from "../components";
import { cn } from "../lib/utils";
import { CheckCircle2Icon } from "lucide-react";

export interface AlertContextType {
  alerts: AlertMessage[];
  showAlert: (alert: Omit<AlertMessage, "id" | "isDismissing">) => void;
  dismissAlert: (id: string) => void;
}

export type AlertType = "info" | "error";

export interface AlertMessage {
  id: string;
  type: AlertType;
  title?: string;
  message: string;
  duration?: number;
  isDismissing?: boolean;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, isDismissing: true } : alert,
      ),
    );

    setTimeout(() => {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, 300); // Wait for animation duration
  }, []);

  const showAlert = useCallback(
    (alert: Omit<AlertMessage, "id" | "isDismissing">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newAlert = { ...alert, id, isDismissing: false };

      setAlerts((prev) => [...prev, newAlert]);

      if (alert.duration !== 0) {
        setTimeout(() => {
          dismissAlert(id);
        }, alert.duration || 5000);
      }
    },
    [dismissAlert],
  );

  return (
    <AlertContext.Provider value={{ alerts, showAlert, dismissAlert }}>
      {children}
      <div className="fixed top-4 right-4 z-9999 flex flex-col gap-2 w-full max-w-md pointer-events-none">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "pointer-events-auto transition-all duration-300 ease-in-out",
              alert.isDismissing
                ? "animate-out slide-out-to-right-full fade-out fill-mode-forwards"
                : "animate-in slide-in-from-right-full fade-in",
            )}
          >
            <Alert className="max-w-md">
              <CheckCircle2Icon />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
