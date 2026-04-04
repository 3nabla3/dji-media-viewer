"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface Notification {
  id: string;
  header: string;
  message: string;
  severity: "warning" | "error";
}

type NewNotification = Omit<Notification, "id">;

interface ToastContextValue {
  notifications: Notification[];
  addNotification: (notification: NewNotification) => void;
  removeNotification: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  function addNotification(notification: NewNotification) {
    setNotifications((prev) => [
      ...prev,
      { ...notification, id: crypto.randomUUID() },
    ]);
  }

  function removeNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  const value = useMemo(
    () => ({ notifications, addNotification, removeNotification }),
    [notifications],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx)
    throw new Error("useToastContext must be used inside <ToastProvider>");
  return ctx;
}
